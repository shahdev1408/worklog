# WorkLog — Daily Work Tracker

A personal tool to log daily updates across clients, projects, and sub-projects. Export reports to PDF, CSV, or print-ready format.

## Stack
- **Next.js 14** (App Router)
- **Supabase** (Postgres database, free tier)
- **Tailwind CSS**
- **jsPDF** (PDF export)
- **date-fns**

---

## Setup in 10 minutes

### 1. Create Supabase project
1. Go to [supabase.com](https://supabase.com) → New project
2. Wait for it to spin up (~1 min)
3. Go to **SQL Editor** → **New query**
4. Paste the contents of `supabase-schema.sql` and click **Run**

### 2. Get your Supabase keys
In Supabase → **Settings** → **API**:
- Copy `Project URL`
- Copy `anon public` key

### 3. Configure environment
Copy `.env.local` and fill in your keys:
```
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run locally
```bash
npm install
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel (free, 1 click)

### Option A — GitHub (recommended)
1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Add environment variables (same as `.env.local`) in the Vercel dashboard
4. Click **Deploy** — done!

### Option B — Vercel CLI
```bash
npm i -g vercel
vercel
# Follow the prompts, then add env vars in Vercel dashboard
```

---

## Usage

### Dashboard
See all recent updates. Stats for today, this week, and active clients.

### Log Update
Fill in date, company, project (optional sub-project), description, and optional manager name.

### Manage
Add/edit/delete companies, projects, and sub-projects. Everything cascades properly.

### Reports
Filter by company, project, and date range. Export as:
- **PDF** — clean formatted document with jsPDF
- **CSV** — import into Excel/Sheets
- **Print** — browser print dialog (also works as PDF via "Save as PDF")

---

## Tips
- Use the manager field to tag who the update is for (client name, team lead, etc.)
- The description supports multi-line text (shift+enter for newlines)
- Reports group updates by project automatically
- Data is all in Supabase — never lost, accessible from any device
