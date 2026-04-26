# TutorLink Project Progress

Last updated: 2026-04-26

## Current Status

TutorLink is now a real web project with:

- a working Next.js web app foundation
- a connected local PostgreSQL database
- Prisma schema and initial migration
- a first-pass NextAuth sign-in flow restricted to `@nyu.edu`
- a shared API contract and backend utility layer
- core marketplace, messaging, session, and review APIs

The project is no longer just documentation. It now has a running web stack, database layer, authentication layer, and the first real business-layer APIs.

## Completed Work

### 1. Project setup

- initialized the web app with:
  - Next.js
  - TypeScript
  - Tailwind CSS
- added core project files:
  - `package.json`
  - `tsconfig.json`
  - `next.config.ts`
  - `eslint.config.mjs`
  - `postcss.config.mjs`
- created the initial TutorLink landing page
- updated `README.md` to reflect the actual project

### 2. Database foundation

- installed Prisma and Prisma Client
- created `prisma/schema.prisma`
- designed the first MVP schema for:
  - `User`
  - `Profile`
  - `TutorProfile`
  - `TuteeProfile`
  - `Subject`
  - `TutorSubject`
  - `TutoringRequest`
  - `RequestApplication`
  - `MessageThread`
  - `Message`
  - `Session`
  - `Review`
- added `src/lib/db.ts`
- generated the initial migration:
  - `prisma/migrations/20260426190000_init/migration.sql`

### 3. Local database connection

- connected the project to local PostgreSQL
- created the local database `tutorlink`
- ran:

```bash
npx prisma migrate dev --name init
```

- confirmed the database tables were created successfully

### 4. Authentication foundation

- installed `next-auth`
- added auth config in `src/lib/auth.ts`
- added auth route:
  - `src/app/api/auth/[...nextauth]/route.ts`
- added type extension:
  - `src/types/next-auth.d.ts`
- added a development sign-in page:
  - `src/app/signin/page.tsx`
- added a protected dashboard page:
  - `src/app/dashboard/page.tsx`
- added auth UI components:
  - `src/components/auth/sign-in-form.tsx`
  - `src/components/auth/sign-out-button.tsx`

### 5. Current auth behavior

The current auth flow:

- accepts only `@nyu.edu` emails
- creates a `User` record on first sign-in
- creates a base `Profile`
- creates `TutorProfile` and/or `TuteeProfile` depending on selected role
- stores session data with role and user id
- protects the dashboard route

This is a development credentials flow, not the final production authentication model.

### 6. Backend API foundation

- added shared API helpers:
  - `src/lib/api.ts`
  - `src/lib/permissions.ts`
  - `src/lib/validation.ts`
- added shared data format/query helpers:
  - `src/lib/profile.ts`
  - `src/lib/tutors.ts`
  - `src/lib/messages.ts`
  - `src/lib/sessions.ts`
  - `src/lib/reviews.ts`
- added the first stable API contract document:
  - `API_CONTRACT.md`
- standardized:
  - success and error response envelopes
  - route-level auth checks
  - role and participant permission checks
  - reusable validation patterns

### 7. Implemented API routes

The following app routes now exist in the codebase:

- `GET /api/me`
- `GET /api/profile`
- `PATCH /api/profile`
- `GET /api/tutors`
- `GET /api/tutors/:id`
- `POST /api/requests`
- `POST /api/threads`
- `POST /api/messages`
- `POST /api/sessions`
- `PATCH /api/sessions/:id`
- `POST /api/reviews`

### 8. Current backend behavior

The current business-layer APIs support:

- authenticated current-user profile reads
- authenticated current-user profile updates
- tutor marketplace list and detail queries
- authenticated tutoring request creation
- tutor/tutee thread creation and reuse
- participant-only message sending
- session creation with thread/request consistency checks
- session status transitions:
  - `PENDING -> CONFIRMED | CANCELLED`
  - `CONFIRMED -> COMPLETED | CANCELLED`
- review creation only for completed sessions

## Pushed Commits

These are already in the GitHub repository:

- `569bc38` Initial project scaffold
- `97d45f9` Add planning and team assignment docs
- `79b2f78` Initialize TutorLink web app foundation
- `cc23030` Add Prisma schema and initial migration
- `314075d` Add NextAuth-based NYU sign-in flow
- `f1dc58a` Add profile API foundation
- `a2f15b0` Add marketplace and session APIs

## Verification Already Completed

The following checks were run successfully during development:

- `npm run lint`
- `npm run build`
- `npx prisma validate`
- `npx prisma generate`
- `npx prisma migrate dev --name init`

## Not Yet Completed

### Backend / data

- seed data
- role-aware onboarding beyond first sign-in
- request list/query API if needed for MVP UI
- message thread list/read API
- message history list/read API
- session list/read API
- review list/read API

### Frontend / pages

- profile setup page
- profile edit page
- tutor marketplace page
- tutor detail page
- request posting page
- messages page
- sessions page
- review submission UI

### Deployment

- no staging deployment yet
- no always-on public URL yet
- no hosted production database yet

## Recommended Next Steps

### Immediate next task

Build the remaining read/list APIs and UI integration:

1. build request list/query API if the MVP UI needs browsing
2. build profile onboarding/edit UI
3. build tutor marketplace UI
4. build messages and sessions pages

### After that

1. add session and message read APIs
2. add review list/read APIs
3. add seed/demo data
4. prepare staging deployment

## Local-only Files

These are intentionally not pushed:

- `.env`
- `PROJECT_LEAD_TASK_DECOMPOSITION.md`

## Summary

The project has cleared the setup phase.

TutorLink now has:

- web app foundation
- database foundation
- authentication foundation
- backend API foundation
- core tutor, request, messaging, session, and review APIs

The next phase is to finish the remaining read/list API surface and connect these backend flows to actual feature pages.
