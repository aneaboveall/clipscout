# ClipScout

ClipScout is a creator-focused, multi-source stock video search engine. One comma-separated search fans out to Pexels and Pixabay, then returns normalized footage grouped by keyword.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add a Pexels API key, a Pixabay API key, or both. Keys are only read in server-side provider modules.
3. Install and start the app:

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

```bash
PEXELS_API_KEY=
PIXABAY_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

At least one provider key is needed for live footage. If one provider is missing or fails, the other provider continues to return results.

## Commands

```bash
npm run dev
npm run build
npm run lint
npm test
```

## Search API

Single query:

```text
GET /api/search?q=person%20using%20phone
```

Multiple queries:

```text
GET /api/search?queries=African%20fintech,money%20transfer,Lagos%20street
```

Optional parameters: `page`, `perPage`, `orientation`, `duration`, `quality`, and `sort`.

Provider responses are normalized to the shared `VideoResult` type in `lib/stock-video.ts`. Pexels and Pixabay implementations live in `lib/providers`, and orchestration/deduplication lives in `lib/search-service.ts`.

## Provider behavior

- Pexels requests use the current `/v1/videos/search` endpoint and server-only `Authorization` header.
- Pixabay requests use `/api/videos/`, safe search, and a 24-hour in-memory response cache.
- Both providers are cached for 24 hours to reduce duplicate API usage.
- Direct provider video URLs are opened in the browser; ClipScout does not proxy or store video files.
- Cache state is process-local and best effort, so it resets when the server instance restarts.
