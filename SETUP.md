# Setup Guide

Get a new instance of job-tracker running from scratch in under 30 minutes.

## Prerequisites

- Node.js 20 or later
- A Supabase account (free tier works): https://supabase.com
- An Anthropic API key: https://console.anthropic.com
- A Vercel account (free tier works): https://vercel.com
- Vercel CLI installed: `npm install -g vercel`
- Git (to clone the repo)

## Steps

### 1. Clone the repo

```bash
git clone <repo-url>
cd job-tracker
```

### 2. Set up Supabase

1. Go to https://supabase.com and create a new project
2. Wait for the project to initialize (takes about 1 minute)
3. Go to the SQL Editor tab in your project
4. Create a new query and paste the contents of `supabase/schema_v2.sql`
5. Run the query
6. Go to Settings → API in the left sidebar
7. Copy your **Project URL** and **anon (public) key** — you'll need these in step 4

### 3. Get an Anthropic API key

1. Go to https://console.anthropic.com
2. Navigate to API Keys
3. Create a new API key
4. Copy it (starts with `sk-ant-`) — you'll need this in step 4

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in the three values:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

Save the file.

### 5. Test locally (optional)

```bash
npm install
vercel dev
```

Open http://localhost:3000 in your browser. You should see the empty pipeline. Try the "Dummy Extract" button in the sidebar to test the extraction API.

Press Ctrl+C to stop the dev server when done testing.

### 6. Deploy to Vercel

```bash
vercel
```

Follow the prompts (link to your Vercel account, select the job-tracker project). Then set the environment variables:

```bash
vercel env add VITE_SUPABASE_URL
# Paste your Supabase URL

vercel env add VITE_SUPABASE_ANON_KEY
# Paste your Supabase anon key

vercel env add ANTHROPIC_API_KEY
# Paste your Anthropic API key

vercel --prod
```

Your app is now live. Note the deployment URL (e.g. `https://job-tracker-abc123.vercel.app`).

### 7. Install and configure the Chrome extension

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" (toggle in the top right corner)
3. Click "Load unpacked"
4. Select the `extension/` folder in your job-tracker repo
5. The extension should appear in your extensions list
6. Click the extension icon (puzzle piece in your toolbar) and select "Options"
7. Paste your Vercel deployment URL into the "Job Tracker App URL" field (e.g. `https://job-tracker-abc123.vercel.app`)
8. Click "Save" and confirm

You're done. Go to any job posting page (LinkedIn, Greenhouse, etc.) and click the extension icon — it should capture the job.

## Troubleshooting

**Extension can't save jobs**
- Check that the Backend URL in extension options (right-click the extension icon → Options) matches your Vercel URL exactly, with no trailing slash
- Verify the URL is live by visiting it in your browser

**"AI extraction not working" or extraction times out**
- Confirm `ANTHROPIC_API_KEY` is set in Vercel project settings (Settings → Environment Variables)
- Note: API functions have a 30-second timeout. If extraction fails, the extension shows a manual form to fill in the data

**Database errors when saving**
- Confirm `supabase/schema_v2.sql` ran successfully — check the Supabase dashboard's Table Editor to see if all tables exist
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct in Vercel environment variables

**Extension icon doesn't appear in Chrome toolbar**
- Go to `chrome://extensions` and confirm the extension loaded (green toggle)
- Pin the extension to your toolbar: click the puzzle icon → pin icon next to job-tracker

## Maintenance

**Rotating API keys**
- Update the key in Vercel project settings (Settings → Environment Variables)
- Click "Redeploy" to restart the functions with the new key

**Checking function logs**
- In Vercel dashboard, select your project → Functions tab
- Logs show errors and runtime output from `/api/extract`, `/api/jobs`, etc.

**Database queries**
- Use Supabase dashboard → SQL Editor to run manual queries
- Avoid direct edits to `documents` table — use the app's document upload UI instead
