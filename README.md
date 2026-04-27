# TutorLink

TutorLink is a peer-to-peer tutoring marketplace for the NYU community. Students sign in with their `@nyu.edu` email, set up a tutor or tutee profile, and then browse, message, book, and review tutoring sessions inside the app.

This repo is the full-stack web implementation for the NYU CS Design Project.

## Feature status (MVP)

- [x] NYU email-based sign-up and login (credentials-based, dev-friendly)
- [x] Tutor and tutee profiles with role switching (`TUTOR` / `TUTEE` / `BOTH`)
- [x] Tutor browse with subject, mode, rate, and verification filters
- [x] Tutor detail page with subjects, reviews, and a one-click message button
- [x] Tutee request board with posting flow
- [x] In-app direct messaging with threads
- [x] Session booking from inside a thread, with status transitions (pending → confirmed → completed / cancelled)
- [x] Review + rating flow for completed sessions
- [x] Protected dashboard with upcoming sessions, recent messages, and profile summary

## Tech stack

- **Framework**: Next.js 16 (App Router, webpack)
- **Language**: TypeScript
- **UI**: Tailwind CSS v4
- **Auth**: NextAuth (credentials provider)
- **Database**: SQLite (default) via Prisma
- **ORM**: Prisma 6

> The schema is written to be Postgres-compatible (strings are used instead of native enums). To deploy on Postgres, change the Prisma datasource provider back to `postgresql`, re-run migrations, and update `DATABASE_URL`.

## Local setup

```bash
# 1. install deps
npm install

# 2. copy env file and create the local db
cp .env.example .env
npx prisma migrate deploy   # or: npx prisma migrate dev

# 3. load demo tutors, tutees, requests, and one completed session+review
npm run prisma:seed

# 4. run the dev server
npm run dev
```

Open `http://localhost:3000` and sign in with any `@nyu.edu` email. Useful demo accounts created by the seed script:

| Email | Role | Notes |
| --- | --- | --- |
| `ava.chen@nyu.edu` | Tutor | Verified, already has a completed review |
| `liam.park@nyu.edu` | Tutor | Math tutor |
| `sofia.gomez@nyu.edu` | Tutor | Econ tutor, online only |
| `maya.singh@nyu.edu` | Tutee | Has an open CSCI UA 102 request |
| `daniel.cho@nyu.edu` | Tutee | Has an open ECON UA 1 request |

On first sign-in we create the user, the profile, and the correct tutor/tutee profile shell based on the role you pick.

## Project structure

```
prisma/
  schema.prisma          Prisma data model
  migrations/            SQL migrations
  seed.ts                Demo seed data

src/
  app/                   Next.js App Router pages + API routes
    api/                 API route handlers (see API_CONTRACT.md)
    dashboard/           Protected dashboard
    profile/             Role + profile editor
    tutors/              Browse + detail
    requests/            Post + browse + detail
    messages/            Threads + conversation view + in-thread scheduler
    sessions/            Session list + detail + status + review
    signin/              Credentials sign-in page
  components/            Shared components (navbar, auth buttons, providers)
  lib/                   Server-side helpers (db, auth, API envelope, tutor/request/session logic)
  types/                 Ambient module augmentation
```

## API surface

See `API_CONTRACT.md`. The contract is implemented by the route handlers in `src/app/api`. Every route returns the `{ ok, data }` / `{ ok, error }` envelope defined there.

Implemented now:

- `GET  /api/me` · `GET /api/profile` · `PATCH /api/profile`
- `GET  /api/tutors` · `GET /api/tutors/:id`
- `GET  /api/requests` · `POST /api/requests` · `GET /api/requests/:id`
- `GET  /api/subjects`
- `POST /api/threads` · `GET /api/threads` · `GET /api/threads/:id`
- `POST /api/messages`
- `POST /api/sessions` · `GET /api/sessions` · `GET /api/sessions/:id` · `PATCH /api/sessions/:id`
- `POST /api/reviews`

## Scripts

- `npm run dev` — Next dev server
- `npm run build` / `npm start` — production build
- `npm run lint` — ESLint
- `npm run prisma:generate` — regenerate Prisma Client
- `npm run prisma:studio` — open Prisma Studio
- `npm run prisma:seed` — re-run the seed script (idempotent)

## Compliance notes

- Only `@nyu.edu` emails can sign in.
- No integration with NYU SIS / transcripts. The data model supports a tutor verification flag, but the MVP flow does not pull anything from university systems.
- No payment processing. `Session.agreedRateCents` is informational only.

## Team

- Alan Zhang (`yz10074`)
- Erfu Hai (`eh3323`)
- Michael Bian (`zb2253`)
- David Rokicki (`dr3492`)
