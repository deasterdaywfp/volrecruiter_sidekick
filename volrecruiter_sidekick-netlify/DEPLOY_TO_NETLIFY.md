# Deploy VolRecruiter Sidekick to Netlify

Repository: https://github.com/deasterdaywfp/volrecruiter_sidekick

## What this version includes

- Static frontend: `index.html`, `app.js`, `styles.css`
- Netlify Functions for secure server-side API calls:
  - `/api/mobilize-events`
  - `/api/daisychain-contact`
  - `/api/daisychain-action`
- Netlify configuration: `netlify.toml`
- Local environment example: `.env.example`

## Add the files to GitHub

From PowerShell, after downloading/unzipping this package:

```powershell
cd C:\Users\deast\Downloads\volrecruiter_sidekick-netlify
git init
git branch -M main
git remote add origin https://github.com/deasterdaywfp/volrecruiter_sidekick.git
git add .
git commit -m "Add Netlify deployable volunteer sidekick"
git push -u origin main
```

If the repository already has files, use:

```powershell
git clone https://github.com/deasterdaywfp/volrecruiter_sidekick.git
Copy-Item -Path C:\Users\deast\Downloads\volrecruiter_sidekick-netlify\* -Destination .\volrecruiter_sidekick -Recurse -Force
cd volrecruiter_sidekick
git add .
git commit -m "Add Netlify deployable volunteer sidekick"
git push
```

## Deploy on Netlify

1. Go to Netlify.
2. Choose **Add new site** → **Import an existing project**.
3. Connect GitHub and select `deasterdaywfp/volrecruiter_sidekick`.
4. Build settings:
   - Build command: leave blank
   - Publish directory: `.`
   - Functions directory: `netlify/functions`
5. Deploy.

Netlify will redeploy automatically when you push changes to GitHub.

## Environment variables

In Netlify, go to **Site configuration** → **Environment variables** and add:

```text
MOBILIZE_ORG_ID=replace-with-numeric-org-id
DAISYCHAIN_BASE_URL=https://go.daisychain.app
DAISYCHAIN_API_TOKEN=replace-with-test-token
```

For volunteer testing, you can deploy without Daisychain credentials and keep using demo/manual mode. Live Daisychain lookup and save-outcome will not work until `DAISYCHAIN_API_TOKEN` is set.

## Local testing with Netlify Functions

```powershell
npm install
copy .env.example .env
npm run dev
```

Then open the local Netlify URL shown in the terminal, usually:

```text
http://localhost:8888
```

## Safety note

Do not commit `.env` or real API tokens. `.gitignore` already excludes `.env`.
