# yunusemre.dev

A deliberately small personal site: chat, past, and a visual dump.

## Stack

- FastAPI serves the API and static single-page interface.
- SQLite keeps conversations, takeover state, messages, and photo metadata.
- OpenAI's Responses API streams `gpt-5.6-luna` replies when `OPENAI_API_KEY` is present.
- A grounded local responder keeps the site useful when an API key is not configured.
- The private `/studio` route lets Yunus take over a conversation, reply as himself, and manage the photo grid.

## Local development

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
COOKIE_SECURE=0 ADMIN_PASSWORD=dev-password .venv/bin/uvicorn app:app --reload --port 8000
```

Open `http://localhost:8000`. The operator studio is at `http://localhost:8000/studio`.

## Configuration

Copy `.env.example` into your environment manager. `ADMIN_PASSWORD` should always be replaced in production. The OpenAI key stays server-side and is optional; add it to enable the full generative clone.

Profile grounding lives in `data/about.md`. Images are managed through the studio and stored under the persistent data directory. Conversation state, generated bot-check secrets, and push-notification keys live there too and are intentionally excluded from Git.

In production, `DATA_DIR` is `/home/boxd/portfolio-data`, outside the deployable application directory. Every generated version of a studio upload is written to a private Cloudflare R2 bucket before its database record is committed. Uploads are immutable in R2 even after they are removed from the live gallery.

## Test

```bash
.venv/bin/pytest -q
```

## Production

The app runs as `yunus-portfolio.service` on Boxd. Cloudflare Tunnel terminates the custom-domain connection and forwards `yunusemre.dev` and `www.yunusemre.dev` to Uvicorn on port `8000`; its non-secret ingress configuration lives in `deploy/cloudflared.yml`.

The SQLite database is continuously replicated to the same private R2 bucket by Litestream. Remote retention is intentionally disabled in Litestream: its credentials do not need to delete objects and old restore points remain available. Secrets belong in the root-owned `/etc/yunus-portfolio-backup.env`, never in the repository.

### Backup checks

Run these commands from a root shell (`sudo -i`), because the R2 credentials are
intentionally readable only by root.

Sync all existing gallery assets after first configuring R2:

```bash
set -a
. /etc/yunus-portfolio-backup.env
set +a
cd /home/boxd/portfolio
.venv/bin/python deploy/sync_upload_backups.py
```

Verify that every active photo has its original, thumbnail, and blurred placeholder both locally and in R2:

```bash
set -a
. /etc/yunus-portfolio-backup.env
set +a
cd /home/boxd/portfolio
.venv/bin/python deploy/verify_upload_backups.py
```

Test a database restore without touching production:

```bash
set -a
. /etc/yunus-portfolio-backup.env
set +a
restore_path="$(mktemp /tmp/portfolio-restore.XXXXXX.db)"
litestream restore -config /etc/litestream.yml -o "$restore_path" \
  /home/boxd/portfolio-data/portfolio.db
python3 -c 'import sqlite3,sys; print(sqlite3.connect(sys.argv[1]).execute("PRAGMA integrity_check").fetchone()[0])' "$restore_path"
rm "$restore_path"
```
