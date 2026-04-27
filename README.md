# TutorLink

peer-to-peer tutoring marketplace for nyu. you sign in with an `@nyu.edu` email,
set up a tutor or tutee profile, and then browse, message, book, and review
sessions inside the app.

this repo is the full web app for the nyu cs design project.

## what works

- nyu email sign-up and login (credentials, dev-friendly)
- tutor / tutee profiles with role switching (`TUTOR` / `TUTEE` / `BOTH`)
- tutor browse with subject, mode, rate, and verification filters
- tutor detail page with subjects, reviews, and a message button
- tutee request board with posting flow
- in-app threads + messaging
- session booking inside a thread, with status transitions
  (pending → confirmed → completed / cancelled)
- review + rating after a completed session
- protected dashboard with upcoming sessions, threads, and a profile summary
- admin console: user search, suspend/promote, identity verification queue
  (with file uploads admins can download), request + session admin views

## stack

- next.js 16 (app router, webpack)
- typescript
- tailwind v4
- nextauth (credentials provider)
- postgres (neon in prod) via prisma 6
- vercel blob for avatar + verification doc storage

## local setup

```bash
# 1. install deps
npm install

# 2. copy env file and run migrations
cp .env.example .env
npx prisma migrate deploy

# 3. seed demo tutors/tutees/requests/sessions
npm run prisma:seed

# 4. start dev
npm run dev
```

open `http://localhost:3000` and sign in with any `@nyu.edu` email.
demo accounts created by the seed:

| email | role | notes |
| --- | --- | --- |
| `admin@nyu.edu` | admin | full admin console access |
| `ava.chen@nyu.edu` | tutor + admin | verified, has a completed review |
| `liam.park@nyu.edu` | tutor | math tutor |
| `sofia.gomez@nyu.edu` | tutor | econ tutor, online only |
| `maya.singh@nyu.edu` | tutee | open csci ua 102 request |
| `daniel.cho@nyu.edu` | tutee | open econ ua 1 request |

all demo accounts share the password `tutorlink123`.

## structure

```
prisma/
  schema.prisma     prisma data model
  migrations/       sql migrations
  seed.ts           demo seed data

src/
  app/              app router pages + api routes
    api/            api route handlers (see API_CONTRACT.md)
    admin/          admin console
    dashboard/      protected dashboard
    profile/        role + profile editor
    tutors/         browse + detail
    requests/       post + browse + detail
    messages/       threads + conversation + in-thread scheduler
    sessions/       session list + detail + status + review
    signin/         credentials sign-in
    register/       sign-up
    users/[id]/     public profile (tutor + tutee view)
  components/       shared components (navbar, role-badge, avatar, etc)
  lib/              server helpers (db, auth, api envelope, business logic)
  types/            ambient module augmentation
```

## api

see `API_CONTRACT.md`. every route returns the `{ ok, data }` /
`{ ok, error }` envelope. routes implemented:

- `GET /api/me` · `GET /api/profile` · `PATCH /api/profile`
- `POST /api/profile/verify` · `GET /api/profile/verify/document`
- `GET /api/tutors` · `GET /api/tutors/:id`
- `GET /api/requests` · `POST /api/requests` · `GET /api/requests/:id`
- `GET /api/subjects`
- `POST /api/threads` · `GET /api/threads` · `GET /api/threads/:id`
- `POST /api/messages` · `GET /api/notifications`
- `POST /api/sessions` · `GET /api/sessions` · `GET /api/sessions/:id` · `PATCH /api/sessions/:id`
- `POST /api/reviews`
- `POST /api/avatar` · `DELETE /api/avatar`
- admin: `/api/admin/*`

## scripts

- `npm run dev` — next dev server
- `npm run build` / `npm start` — production build
- `npm run lint` — eslint
- `npm run prisma:generate` — regenerate prisma client
- `npm run prisma:studio` — open prisma studio
- `npm run prisma:seed` — re-run seed (idempotent)

## compliance notes

- only `@nyu.edu` emails can sign in.
- no integration with nyu sis / transcripts. tutor verification is reviewed
  manually by an admin from an uploaded document.
- no payment processing. `Session.agreedRateCents` is informational only.

## team

- alan zhang (`yz10074`)
- erfu hai (`eh3323`)
- michael bian (`zb2253`)
- david rokicki (`dr3492`)
