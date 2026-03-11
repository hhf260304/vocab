# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

Database migrations use Drizzle Kit (configured in `drizzle.config.ts`). The schema is in `lib/db/schema.ts`.

## Architecture

This is a vocabulary flashcard app ("快快樂樂背單字") built with **Next.js App Router**, using server components and server actions as the primary data access pattern — no API routes for data fetching.

### Key patterns

- **Server actions** in `lib/actions/` handle all CRUD and auth — call these from server or client components.
- **Server components** fetch data directly; **client components** are used only for interactivity (flashcard sessions, forms with local state).
- Auth is NextAuth v5. Protect server actions with `auth()` from `auth.ts`. Pages are NOT protected by middleware — protection is done per-action.

### Data flow for review sessions

`app/review/[languageId]/page.tsx` (server) loads due cards → passes to `ReviewClient.tsx` (client), which manages the session state locally (current card index, failed card IDs, round tracking) without any server calls until the user marks a card. Each "remembered/forgotten" click triggers a server action to update SRS stage.

### SRS logic

`lib/srs.ts` — 5 stages with review intervals: 1, 3, 7, 14, 28 days. Stage 5 = mastered.

### Languages & TTS

Preset languages with BCP-47 TTS codes are in `lib/languages-config.ts`. The `FlashCard` component uses the Web Speech API (`speechSynthesis`) for text-to-speech.

### Database

Neon serverless PostgreSQL via Drizzle ORM. Schema: `users → languages → categories + vocabulary`. The `vocabulary` table has `reviewStage`, `nextReviewDate`, and `isMastered` columns for SRS tracking.

### Styling

Tailwind CSS v4 with shadcn/ui components (in `components/ui/`). No CSS modules — all styling via Tailwind utility classes.
