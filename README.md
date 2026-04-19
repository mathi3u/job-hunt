# job-tracker

A self-hosted job search pipeline tracker with AI-powered job capture and a Chrome extension.

## Features

- Chrome extension captures job postings from major job boards (LinkedIn, Greenhouse, Lever, Ashby, Workday, Welcome to the Jungle) with one click
- AI extracts role, company, skills, salary, red flags automatically using Claude Haiku
- Pipeline view with contextual next-action buttons for each stage
- Interview tracking, contact management, and CV bank with signed URLs
- Dark mode and keyboard-friendly navigation

## Architecture

React 19 SPA + Vercel serverless functions + Supabase (Postgres + Storage) + Anthropic Claude Haiku. No server to maintain — everything runs on serverless infrastructure.

## Quick Start

1. Clone the repo and install dependencies
2. Follow the setup guide in `SETUP.md` to configure Supabase, Anthropic API key, and environment variables
3. Deploy to Vercel and load the Chrome extension

## Development

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase URL, anon key, and Anthropic API key

npm install
vercel dev   # Serves the SPA + /api/* functions on http://localhost:3000
```

Note: `npm run dev` (Vite only) won't serve the API functions — use `vercel dev` for full local development.

## Chrome Extension

Load unpacked from the `extension/` folder in Chrome (chrome://extensions). In the extension options, set the Backend URL to your deployed Vercel URL (or `http://localhost:3000` for local development).

## License

MIT
