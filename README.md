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

Profile grounding lives in `data/about.md`. Images are managed through the studio and stored under the persistent `data/uploads/` directory. Conversation state, generated bot-check secrets, and push-notification keys also live under `data/` and are intentionally excluded from Git.

## Test

```bash
.venv/bin/pytest -q
```
