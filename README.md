# JobAi

Local dashboard that analyzes a CV, searches public job listings, generates a tailored CV and cover letter per role, and tracks applications.

## Setup

```bash
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy `.env.example` values into `.env`. **OpenAI is not required.**

Writing / CV analysis (first match wins):

1. `GROQ_API_KEY` — free at [Groq Console](https://console.groq.com/keys)
2. `GEMINI_API_KEY` — free at [Google AI Studio](https://aistudio.google.com/apikey)
3. `OLLAMA_MODEL` — local, e.g. `llama3.2` after `ollama pull llama3.2`
4. No key — built-in parser and templates (fully offline)

Also optional:

- `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` — **free** job search including **India** (`ADZUNA_COUNTRY=in`). Register at [developer.adzuna.com](https://developer.adzuna.com/). In Settings, set country to India and optionally a city (Bangalore, Mumbai, …).
- `SMTP_*` — send email applications; without SMTP, email jobs stay **queued**

Optional background loop:

```bash
npx tsx worker.ts
```

## Apply behavior

| Posting | What happens |
| --- | --- |
| Has an email / `mailto:` | Queue, or send if auto-email apply is on and SMTP is set |
| External careers / ATS / LinkedIn | Status `needs_review`. Open the apply page. If the employer shows **Apply with LinkedIn**, log in there — JobAi cannot complete LinkedIn OAuth for you. Use the AWLI-style prefill packet (name, contact, employers, education) from your uploaded CV. |
| Generate only | Always available from the job row |

Silent apply on LinkedIn or Indeed is not included. Apply with LinkedIn (AWLI) is a LinkedIn **partner plugin for career sites** (OAuth + ATS onboarding). It is not a job-seeker auto-apply API.
