# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Vite)
npm run build    # TypeScript check + production build
npm run preview  # Preview production build locally
npm run lint     # Run ESLint
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (CSS-based config via `@tailwindcss/vite`)
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Routing**: React Router v7
- **AI**: Anthropic Claude API (Haiku model for extraction)

## Architecture

### Data Flow
`Chrome Extension` → `/api/extract` (AI extraction) → `/api/jobs` → `Supabase` → `usePipeline` hook → Components

### Database Schema (v2)
Normalized relational model in `supabase/schema_v2.sql`:

- **companies** - Company information
- **contacts** - People at companies
- **opportunities** - The atomic pipeline unit (can exist without a job posting)
- **job_postings** - Specific job postings linked to opportunities
- **interview_processes** - Interview pipeline for an opportunity
- **interviews** - Individual interview sessions
- **communications** - Email/call/message tracking

### Key Files
- `vite.config.ts` - Dev server + API endpoints (`/api/extract`, `/api/jobs`)
- `src/lib/supabase.ts` - Supabase client initialization
- `src/hooks/usePipeline.ts` - Pipeline CRUD operations and stats
- `src/hooks/useJobs.ts` - Legacy hook (for old jobs table)
- `src/types/index.ts` - TypeScript types, enums, and UI helpers

### Component Structure
- **Pages** (`src/pages/`): Dashboard (analytics), Pipeline (new schema), Jobs (legacy)
- **Components** (`src/components/`): Layout, OpportunityList, OpportunityCard, OpportunityDetail

### Views
- `pipeline_overview` - Main view for listing opportunities with joined data
- `upcoming_interviews` - Interviews scheduled in the future
- `follow_ups_needed` - Communications requiring response

## Configuration

### Environment Variables
Copy `.env.example` to `.env.local` and set:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `ANTHROPIC_API_KEY` - For AI extraction (server-side only)

### Path Aliases
`@/*` maps to `./src/*` (configured in tsconfig.app.json and vite.config.ts)

## Opportunity Status Workflow

The `status` field tracks pipeline stages:

| Status | Meaning |
|--------|---------|
| identified | Just found/saved |
| researching | Learning about company/role |
| preparing | Preparing application |
| applied | Application submitted |
| interviewing | In interview process |
| offer | Have an offer |
| closed_won | Accepted offer |
| closed_lost | Rejected/withdrew |
| on_hold | Paused |

## Chrome Extension

Located in `extension/`:
- Captures page content from job sites
- Sends to `/api/extract` for AI extraction
- Pre-fills form with extracted data
- Saves to normalized schema via `/api/jobs`

## API Endpoints (Dev Server)

### POST /api/extract
AI-powered job info extraction using Claude Haiku.
- Input: `{ pageTitle, pageText, url, portal }`
- Output: Structured job data (role, company, tldr, skills, etc.)

### POST /api/jobs
Saves extracted job to database.
- Creates company (if new)
- Creates opportunity
- Creates job posting with extracted details
