# VolRecruiter Sidekick

A lightweight recommender for member-leaders to help a newly active volunteer find their best next shift after completing an event.

The tool prioritizes:

1. Re-shifting people into the same kind of action when they had a good or OK experience.
2. Local opportunities near their ZIP.
3. Same-state opportunities before out-of-state events.
4. High-priority WFP events when there is no strong local/state fit.
5. Endorsed candidate pathways as a fallback.
6. National virtual voter-contact shifts as the final fallback.

## Modes

- **Demo mode:** uses sample events and sample contacts; good for volunteer testing.
- **Manual mode:** lets callers enter context directly.
- **Live mode:** uses Netlify Functions to call Mobilize and Daisychain without exposing API keys in browser code.

## Netlify deployment

This repo is ready for Netlify.

- Publish directory: `.`
- Functions directory: `netlify/functions`
- Build command: leave blank

See `DEPLOY_TO_NETLIFY.md` for full steps.

## Environment variables

Set these in Netlify when testing live integrations:

```text
MOBILIZE_ORG_ID=replace-with-numeric-org-id
DAISYCHAIN_BASE_URL=https://go.daisychain.app
DAISYCHAIN_API_TOKEN=replace-with-test-token
```

Do not commit API tokens. Use `.env` locally and Netlify environment variables in production.

## Local development

For static demo-only testing:

```bash
python3 -m http.server 8000
```

For Netlify Functions locally:

```bash
npm install
cp .env.example .env
npm run dev
```
