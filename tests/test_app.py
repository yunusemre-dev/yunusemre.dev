import json
import hashlib
import os
import sqlite3
import sys
import tempfile
from pathlib import Path


TEST_DATA = tempfile.TemporaryDirectory()
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ["DATA_DIR"] = TEST_DATA.name
os.environ["ADMIN_PASSWORD"] = "correct-horse-battery-staple"
os.environ["COOKIE_SECURE"] = "0"
os.environ["BOT_CHECK_DIFFICULTY"] = "8"
os.environ.pop("OPENAI_API_KEY", None)

from fastapi.testclient import TestClient

from app import (
    UPLOAD_DIR,
    app,
    db,
    ensure_message_presence_role,
    fallback_answer,
    now_iso,
    placeholder_filename,
    thumbnail_filename,
)


def decode_lines(response):
    return [json.loads(line) for line in response.text.splitlines() if line]


def bot_checked_message(client, conversation_id, content, after=0):
    challenge = client.get(
        f"/api/conversations/{conversation_id}/bot-challenge"
    ).json()
    for solution in range(challenge["max_attempts"] + 1):
        digest = hashlib.sha256(
            f"{challenge['token']}:{solution}".encode()
        ).digest()
        difficulty = challenge["difficulty"]
        whole_bytes, remaining_bits = divmod(difficulty, 8)
        valid = all(byte == 0 for byte in digest[:whole_bytes]) and (
            remaining_bits == 0
            or digest[whole_bytes] >> (8 - remaining_bits) == 0
        )
        if valid:
            return {
                "content": content,
                "after": after,
                "bot_token": challenge["token"],
                "bot_solution": solution,
                "website": "",
            }
    raise AssertionError("Could not solve the test bot challenge")


def test_existing_message_schema_migrates_without_losing_chat(tmp_path):
    connection = sqlite3.connect(tmp_path / "old.db")
    connection.row_factory = sqlite3.Row
    connection.executescript(
        """
        CREATE TABLE conversations (id TEXT PRIMARY KEY);
        INSERT INTO conversations(id) VALUES ('conversation-1');
        CREATE TABLE messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
            role TEXT NOT NULL CHECK (role IN ('visitor', 'ai', 'human')),
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            client_ip TEXT
        );
        CREATE INDEX messages_conversation_id_id ON messages(conversation_id, id);
        INSERT INTO messages(conversation_id, role, content, created_at)
        VALUES ('conversation-1', 'visitor', 'Still here', '2026-07-20T12:00:00+00:00');
        """
    )

    ensure_message_presence_role(connection)
    connection.execute(
        """INSERT INTO messages(conversation_id, role, content, created_at)
           VALUES ('conversation-1', 'presence', 'Yunus connected to the chat.',
                   '2026-07-20T12:00:01+00:00')"""
    )
    rows = connection.execute("SELECT role, content FROM messages ORDER BY id").fetchall()
    assert [(row["role"], row["content"]) for row in rows] == [
        ("visitor", "Still here"),
        ("presence", "Yunus connected to the chat."),
    ]


def test_chat_fallback_and_human_takeover():
    with TestClient(app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["ai"] == "local-fallback"

        conversation = client.post("/api/conversations", json={}).json()
        conversation_id = conversation["id"]

        blocked = client.post(
            f"/api/conversations/{conversation_id}/messages",
            json={"content": "This has no bot check"},
        )
        assert blocked.status_code == 403

        first_payload = bot_checked_message(
            client, conversation_id, "What is your preferred tech stack?"
        )
        reply = client.post(
            f"/api/conversations/{conversation_id}/messages",
            json=first_payload,
        )
        events = decode_lines(reply)
        assert events[0]["type"] == "message"
        assert events[-1]["type"] == "done"
        assert "TypeScript" in events[-1]["message"]["content"]
        replay = client.post(
            f"/api/conversations/{conversation_id}/messages",
            json=first_payload,
        )
        assert replay.status_code == 403

        login = client.post(
            "/api/admin/login", json={"password": "correct-horse-battery-staple"}
        )
        assert login.status_code == 200

        reply_without_takeover = client.post(
            f"/api/admin/conversations/{conversation_id}/messages",
            json={"content": "This should stay disabled."},
        )
        assert reply_without_takeover.status_code == 409

        takeover = client.patch(
            f"/api/admin/conversations/{conversation_id}", json={"takeover": True}
        )
        assert takeover.json()["takeover"] is True

        queued = client.post(
            f"/api/conversations/{conversation_id}/messages",
            json=bot_checked_message(client, conversation_id, "Are you there?"),
        )
        queued_events = decode_lines(queued)
        assert queued_events[-1] == {"type": "queued", "takeover": True}

        human = client.post(
            f"/api/admin/conversations/{conversation_id}/messages",
            json={"content": "Yep — Yunus here."},
        )
        assert human.status_code == 200
        assert human.json()["message"]["role"] == "human"

        messages = client.get(
            f"/api/conversations/{conversation_id}/messages"
        ).json()
        assert messages["takeover"] is True
        assert messages["messages"][-1]["content"] == "Yep — Yunus here."

        visitor_typing = client.post(
            f"/api/conversations/{conversation_id}/typing",
            json={"typing": True},
        )
        assert visitor_typing.json() == {"ok": True, "typing": True}

        admin_messages = client.get(
            f"/api/admin/conversations/{conversation_id}/messages"
        ).json()
        assert admin_messages["visitor"]["location"] == "Location unavailable"
        assert admin_messages["visitor_typing"] is True
        assert client.post(
            f"/api/conversations/{conversation_id}/typing",
            json={"typing": False},
        ).json() == {"ok": True, "typing": False}

        presence = client.post(
            f"/api/admin/conversations/{conversation_id}/presence",
            json={"session_id": "test-operator-session", "action": "join"},
        )
        assert presence.status_code == 200
        assert presence.json() == {"ok": True, "present": True, "takeover": True}

        typing = client.post(
            f"/api/admin/conversations/{conversation_id}/typing",
            json={"session_id": "test-operator-session", "typing": True},
        )
        assert typing.json() == {"ok": True, "typing": True}
        assert client.get(
            f"/api/conversations/{conversation_id}/messages"
        ).json()["operator_typing"] is True

        heartbeat = client.post(
            f"/api/admin/conversations/{conversation_id}/presence",
            json={"session_id": "test-operator-session", "action": "heartbeat"},
        )
        assert heartbeat.json()["present"] is True

        client.patch(
            f"/api/admin/conversations/{conversation_id}", json={"takeover": False}
        )
        assert client.get(
            f"/api/conversations/{conversation_id}/messages"
        ).json()["operator_typing"] is False
        manual_ai = client.post(
            f"/api/admin/conversations/{conversation_id}/presence",
            json={"session_id": "test-operator-session", "action": "heartbeat"},
        )
        assert manual_ai.json()["takeover"] is False

        client.post(
            f"/api/admin/conversations/{conversation_id}/presence",
            json={"session_id": "test-operator-session", "action": "join"},
        )
        client.post(
            f"/api/admin/conversations/{conversation_id}/typing",
            json={"session_id": "test-operator-session", "typing": True},
        )

        released = client.post(
            f"/api/admin/conversations/{conversation_id}/presence",
            json={"session_id": "test-operator-session", "action": "leave"},
        )
        assert released.json() == {"ok": True, "present": False, "takeover": False}
        released_chat = client.get(
            f"/api/conversations/{conversation_id}/messages"
        ).json()
        assert released_chat["takeover"] is False
        assert released_chat["operator_typing"] is False
        persisted_messages = client.get(
            f"/api/conversations/{conversation_id}/messages"
        ).json()["messages"]
        presence_messages = [
            message["content"]
            for message in persisted_messages
            if message["role"] == "presence"
        ]
        assert "Yunus connected to the chat." in presence_messages
        assert "Yunus disconnected from the chat." in presence_messages

        push_config = client.get("/api/admin/push/config")
        assert push_config.status_code == 200
        assert push_config.json()["supported"] is True
        assert len(push_config.json()["public_key"]) > 80

        subscription = {
            "endpoint": "https://push.example.test/subscription-1",
            "expirationTime": None,
            "keys": {"p256dh": "public-key", "auth": "auth-key"},
        }
        assert client.post(
            "/api/admin/push/subscriptions", json=subscription
        ).status_code == 200
        assert client.request(
            "DELETE",
            "/api/admin/push/subscriptions",
            json={"endpoint": subscription["endpoint"]},
        ).status_code == 200


def test_fallback_steers_unrelated_questions_back_to_yunus():
    answer = fallback_answer("How do I fix a car brake?")

    assert "chat about me" in answer
    assert "brake" not in answer.lower()


def test_spa_and_seed_gallery():
    with TestClient(app) as client:
        home = client.get("/")
        assert home.status_code == 200
        assert "{{SEO_" not in home.text
        assert "Yunus Emre Kepenek — software engineer</title>" in home.text
        assert 'rel="canonical" href="https://www.yunusemre.dev/"' in home.text
        assert "viewport-fit=contain" in home.text
        assert 'name="robots" content="index, follow, max-image-preview:large"' in home.text
        assert 'type="application/ld+json"' in home.text
        apex = client.get(
            "/past?source=apex",
            headers={"host": "yunusemre.dev"},
            follow_redirects=False,
        )
        assert apex.status_code == 308
        assert apex.headers["location"] == "https://www.yunusemre.dev/past?source=apex"
        insecure_www = client.get(
            "/dump?source=http",
            headers={"host": "www.yunusemre.dev"},
            follow_redirects=False,
        )
        assert insecure_www.status_code == 308
        assert insecure_www.headers["location"] == (
            "https://www.yunusemre.dev/dump?source=http"
        )
        secure_www = client.get(
            "/", headers={"host": "www.yunusemre.dev", "x-forwarded-proto": "https"}
        )
        assert secure_www.status_code == 200
        assert secure_www.headers["strict-transport-security"].startswith(
            "max-age=31536000"
        )
        past = client.get("/past")
        assert past.status_code == 200
        assert "Past — Yunus Emre Kepenek</title>" in past.text
        studio = client.get("/studio")
        assert studio.headers["x-robots-tag"].startswith("noindex")
        assert 'name="robots" content="noindex, nofollow, noarchive"' in studio.text
        assert client.get("/docs").status_code == 404
        assert client.get("/openapi.json").status_code == 404
        robots = client.get("/robots.txt")
        assert robots.headers["content-type"].startswith("text/plain")
        assert "Disallow: /studio" in robots.text
        preview_robots = client.get(
            "/robots.txt", headers={"host": "yunus-portfolio.boxd.sh"}
        )
        assert "Disallow: /" in preview_robots.text
        sitemap = client.get("/sitemap.xml")
        assert sitemap.headers["content-type"].startswith("application/xml")
        assert "https://www.yunusemre.dev/dump" in sitemap.text
        service_worker = client.get("/sw.js")
        assert service_worker.status_code == 200
        assert service_worker.headers["service-worker-allowed"] == "/"
        app_script = client.get("/static/app.js").text
        assert "photo-skeleton" not in app_script
        assert "photo-placeholder" in app_script
        assert "lightboxRequestId" in app_script
        assert "lightboxContent.style.width" in app_script
        assert "data-photo-width" in app_script
        assert "await fullImage.decode()" in app_script
        assert "setChatStatus(initialTakeover, { notify: false })" in app_script
        assert "notify && justConnected" in app_script
        assert "notify && justDisconnected" in app_script
        assert 'message.role !== "presence"' in app_script
        assert 'newChatButton.hidden = false' in app_script
        assert 'data-prompt="Who are you?"' not in app_script
        assert 'data-prompt="What do you do for fun?"' in app_script
        assert "What do you care about when building products?" not in app_script
        assert "Ask me something" not in app_script
        assert "if (!content || sending || !botCheckReady) return" in app_script
        assert 'aria-label="Preparing secure chat" disabled' in app_script
        assert "Yunus is typing" in app_script
        assert "Visitor is typing" in app_script
        assert "updateVisitorTyping" in app_script
        assert 'fill="currentColor"' in app_script
        assert "/typing" in app_script
        assert "thumbnail_url || photo.url" in app_script
        styles = client.get("/static/styles.css").text
        assert "env(safe-area-max-inset-bottom, 0px)" in styles
        assert "44px," in styles
        assert "body.is-chat-route .chat-page" in styles
        assert "NOV 2025 — PRESENT" in app_script
        assert "JAN 2023 — SEP 2023" in app_script
        assert '<a href="/static/yunus-emre-kepenek-resume.pdf" target="_blank"' in app_script
        resume = client.get("/static/yunus-emre-kepenek-resume.pdf")
        assert resume.status_code == 200
        assert resume.headers["content-type"] == "application/pdf"
        assert resume.content.startswith(b"%PDF")
        photos = client.get("/api/photos").json()["photos"]
        assert isinstance(photos, list)
        assert all(photo["url"].startswith("/media/") for photo in photos)
        assert all(
            photo["placeholder_url"].endswith(".placeholder.webp")
            for photo in photos
        )
        assert all(photo["thumbnail_url"].endswith(".thumb.webp") for photo in photos)
        assert (Path(__file__).parents[1] / "static" / "avatar-96.webp").stat().st_size < 10_000
        assert 'property="og:image"' not in home.text
        assert 'name="twitter:image"' not in home.text
        assert 'name="twitter:card" content="summary"' in home.text
        assert not (Path(__file__).parents[1] / "static" / "og-image.jpg").exists()


def test_photo_upload_generates_tiny_blurred_placeholder():
    from io import BytesIO

    from PIL import Image

    source = BytesIO()
    Image.new("RGB", (1200, 800), (45, 110, 78)).save(source, "JPEG", quality=92)

    with TestClient(app) as client:
        assert client.post(
            "/api/admin/login", json={"password": "correct-horse-battery-staple"}
        ).status_code == 200
        uploaded = client.post(
            "/api/admin/photos",
            files={"file": ("moment.jpg", source.getvalue(), "image/jpeg")},
            data={"caption": "A tiny preview"},
        )
        assert uploaded.status_code == 200
        photo = uploaded.json()["photo"]
        filename = Path(photo["url"]).name
        placeholder = UPLOAD_DIR / placeholder_filename(filename)
        thumbnail = UPLOAD_DIR / thumbnail_filename(filename)
        assert photo["placeholder_url"] == f"/media/{placeholder.name}"
        assert photo["thumbnail_url"] == f"/media/{thumbnail.name}"
        assert placeholder.stat().st_size < 2_000
        with Image.open(placeholder) as preview:
            assert max(preview.size) <= 32
        with Image.open(thumbnail) as preview:
            assert max(preview.size) <= 720

        assert client.delete(f"/api/admin/photos/{photo['id']}").status_code == 200
        assert not placeholder.exists()
        assert not thumbnail.exists()


def test_gallery_likes_and_manual_ordering():
    first_id = "test-photo-first"
    second_id = "test-photo-second"
    with TestClient(app) as client:
        with db() as connection:
            connection.execute(
                """INSERT INTO photos
                   (id, filename, caption, width, height, created_at, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (first_id, "test-first.webp", "First", 100, 100, now_iso(), -2),
            )
            connection.execute(
                """INSERT INTO photos
                   (id, filename, caption, width, height, created_at, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (second_id, "test-second.webp", "Second", 100, 100, now_iso(), -1),
            )

        visitor_id = "test-gallery-visitor"
        liked = client.post(
            f"/api/photos/{first_id}/like",
            json={"visitor_id": visitor_id, "liked": True},
        )
        assert liked.json() == {"liked": True, "like_count": 1}
        assert client.post(
            f"/api/photos/{first_id}/like",
            json={"visitor_id": visitor_id, "liked": True},
        ).json()["like_count"] == 1

        photos = client.get(
            "/api/photos", params={"visitor_id": visitor_id}
        ).json()["photos"]
        first = next(photo for photo in photos if photo["id"] == first_id)
        assert first["liked"] is True
        assert first["like_count"] == 1

        assert client.post(
            "/api/admin/login", json={"password": "correct-horse-battery-staple"}
        ).status_code == 200
        reordered_ids = [photo["id"] for photo in reversed(photos)]
        reordered = client.put(
            "/api/admin/photos/order", json={"photo_ids": reordered_ids}
        )
        assert reordered.status_code == 200
        assert [
            photo["id"] for photo in client.get("/api/photos").json()["photos"]
        ] == reordered_ids

        unliked = client.post(
            f"/api/photos/{first_id}/like",
            json={"visitor_id": visitor_id, "liked": False},
        )
        assert unliked.json() == {"liked": False, "like_count": 0}
        assert client.delete(f"/api/admin/photos/{first_id}").status_code == 200
        assert client.delete(f"/api/admin/photos/{second_id}").status_code == 200
