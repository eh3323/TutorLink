# TutorLink

TutorLink is a peer-to-peer tutoring marketplace designed for university communities, starting with NYU. The platform helps students find approachable academic support by connecting tutees with qualified peer tutors from their own school.

This repository is the web implementation workspace for the NYU CS Design Project.

## Current Tech Stack

- Next.js
- TypeScript
- Tailwind CSS v4
- PostgreSQL
- Prisma
- NextAuth or equivalent auth layer

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open `http://localhost:3000`

## Planned Project Structure

- `src/app/` - App Router pages and layouts
- `src/components/` - shared UI and feature components
- `src/lib/` - shared utilities, DB clients, auth helpers
- `prisma/` - Prisma schema, migrations, and seed files

## Project Overview

TutorLink is intended to support:

- university email-based registration and authentication
- separate tutor and tutee profiles
- tutoring request creation and management
- a searchable marketplace for tutors
- internal messaging between users
- session scheduling
- ratings and reviews
- optional tutor verification through student-submitted course records

## Scope

Included in the initial product direction:

- web and mobile-friendly experience
- NYU student community focus
- secure user accounts based on `@nyu.edu` email verification
- request posting, discovery, communication, and scheduling workflows

Not included:

- direct integration with NYU or other university SIS systems
- in-app payment processing
- built-in video conferencing

## Compliance and Constraints

- FERPA compliance is a core requirement.
- The system will not pull transcripts, grades, or enrollment data from university systems.
- Any verification artifacts must be voluntarily provided by the student and handled with strict privacy controls.

## Initial Priorities

The first implementation phase will focus on:

1. authentication and onboarding
2. user profiles
3. tutoring request posting and browsing
4. messaging
5. session scheduling

Advanced matching logic and verified course badges can follow after the core workflow is stable.

## Team

- Alan Zhang (`yz10074`)
- Erfu Hai (`eh3323`)
- Michael Bian (`zb2253`)
- David Rokicki (`dr3492`)

## Source Reference

This README is based on the current project specification document in this folder:

- `TutorLink_SSDS_Requirements_Analysis (2).docx`

## Status

Web foundation initialized. Next step is database schema design and backend/auth setup.
