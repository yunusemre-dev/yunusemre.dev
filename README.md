# yunusemre.dev

A deliberately small personal site: chat, past, and a visual dump.

## Stack

- A single Cloudflare Worker serves the API and the static vanilla HTML/CSS/JavaScript app.
- D1 stores conversations, messages, operator presence, photo metadata, likes, and push subscriptions.
- R2 stores the original, thumbnail, and blurred-placeholder WebP for every dump image.
- OpenAI's Responses API streams `gpt-5.6-luna` replies.
- The private `/studio` route lets Yunus take over a chat, reply live, manage notifications, and edit the dump.

There is no VM, tunnel, application server, or local production filesystem.

## Local development

```bash
npm install
npx wrangler login
npx wrangler d1 migrations apply yunusemre-dev --local
npm run dev
```

Open the URL printed by Wrangler. The operator studio is at `/studio`.

## Configuration

Non-secret bindings and variables live in `wrangler.jsonc`. Production needs these encrypted Worker secrets:

- `ADMIN_PASSWORD`
- `OPENAI_API_KEY`
- `BOT_CHECK_SECRET`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

Set one with:

```bash
npx wrangler secret put SECRET_NAME
```

The AI profile and behavior context live in `data/about.md`.

## Checks and deployment

```bash
npm run check
npm run deploy
```

Deployment uploads the Worker and static assets, applies the custom-domain triggers, and verifies the live health endpoint, routes, D1 photo records, and every active R2 image variant.

To apply a new D1 migration:

```bash
npx wrangler d1 migrations apply yunusemre-dev --remote
```

## Data durability

- D1 is the source of truth for all mutable records and has automatic seven-day point-in-time recovery on the Workers Free plan.
- R2 is the source of truth for gallery files.
- Studio uploads are resized in the browser and written directly to R2 as three immutable WebP variants.
- Removing a photo from the live dump deletes its D1 metadata but intentionally retains the R2 objects for recovery.
- The migrated Litestream generations remain in R2 under `portfolio/sqlite/`; they are historical recovery data, not part of the live runtime.

Export a current D1 snapshot before a risky data change:

```bash
npx wrangler d1 export yunusemre-dev --remote --output ./yunusemre-dev-backup.sql
```

The Worker and custom domains are configured declaratively in `wrangler.jsonc`.
