# TutorLink Team Role Assignment

## Team Structure

TutorLink should be built with a hybrid model:

- project progress moves forward in phases
- team members work in parallel by module ownership

This is better than pure linear assignment because it avoids blocking the whole team behind one person.

## Recommended Team Roles

### Role 1: Project Lead / Backend and Database Owner

Recommended owner: `Erfu Hai (eh3323)`

### Main Responsibility

Own the technical foundation of the system and control integration quality.

### Tasks

- initialize the project repository and base structure
- define the technology stack
- design the database schema
- write Prisma models and migrations
- set up environment variables and shared config
- build backend foundations and shared API patterns
- define authentication and authorization rules
- manage deployment setup
- lead final integration and conflict resolution

### Primary Ownership

- `prisma/`
- `src/lib/db*`
- `src/lib/auth*`
- `src/app/api/*` shared structure
- `.env.example`
- deployment configuration
- shared types and enums

### Deliverables

- stable project skeleton
- database schema and migrations
- API structure and conventions
- working backend foundation
- deployment-ready configuration

## Role 2: Authentication and User System Owner

### Main Responsibility

Own the user entry flow and profile system.

### Tasks

- build sign-up and login pages
- enforce `@nyu.edu` email restriction
- implement first-login role selection
- build profile setup and editing
- build tutor and tutee dashboard basics
- connect user forms to backend APIs

### Primary Ownership

- `src/app/login`
- `src/app/signup`
- `src/app/profile`
- `src/components/auth/*`
- `src/components/profile/*`
- dashboard UI related to user onboarding

### Deliverables

- working login and sign-up flow
- saved user profiles
- role-aware dashboard experience

### Dependencies

- depends on database schema from Role 1
- depends on shared auth/session foundation from Role 1

## Role 3: Marketplace and Search Owner

### Main Responsibility

Own the core tutor discovery experience.

### Tasks

- build tutor browse page
- build tutor cards and tutor detail page
- implement search and filter UI
- connect tutor browsing to backend data
- optionally build tutoring request posting and request browsing

### Primary Ownership

- `src/app/tutors`
- `src/app/tutors/[id]`
- `src/app/requests`
- `src/components/tutor/*`
- `src/components/search/*`

### Deliverables

- tutor list page
- tutor detail page
- functional filters and search
- request posting flow if included in MVP

### Dependencies

- depends on profile and tutor data from Roles 1 and 2
- depends on search API or data query structure from Role 1

## Role 4: Messaging, Sessions, Reviews, and QA Owner

### Main Responsibility

Own the conversion from tutor discovery to confirmed tutoring sessions.

### Tasks

- build direct messaging UI
- implement message threads and sending
- build session creation flow
- manage session status updates
- implement reviews and ratings
- prepare seed data
- prepare testing checklist and demo flow

### Primary Ownership

- `src/app/messages`
- `src/app/sessions`
- `src/components/messages/*`
- `src/components/sessions/*`
- `src/components/reviews/*`
- `prisma/seed*`
- test and QA files

### Deliverables

- users can start conversations
- users can create and confirm sessions
- completed sessions can be reviewed
- demo data and test scenarios are ready

### Dependencies

- depends on authentication from Role 2
- depends on tutor browsing entry points from Role 3
- depends on schema and API patterns from Role 1

## Project Phases and Team Execution

## Phase 1: Foundation Setup

### Goal

Prepare the codebase so all members can start real development.

### Role 1

- initialize repo
- choose stack
- define schema
- set up database and auth foundations

### Role 2

- draft auth and profile pages
- prepare form components

### Role 3

- draft tutor browse, search, and detail page UI

### Role 4

- draft message, session, and review page UI
- prepare testing flow outline

### Done Standard

- project runs locally
- database connects successfully
- folder structure is defined
- API and schema direction is clear

## Phase 2: Core Feature Development

### Goal

Build each major module in parallel.

### Role 1

- complete schema and migrations
- provide shared backend APIs and guards
- support integration for the team

### Role 2

- complete login, signup, role selection, and profile flow

### Role 3

- complete tutor browse, filtering, and detail flow

### Role 4

- complete messaging, sessions, and review basics

### Done Standard

- each core feature works with real data
- main pages are no longer placeholders

## Phase 3: Integration and Bug Fixing

### Goal

Combine all modules into one complete student workflow.

### Shared Main Flow

1. sign up
2. create profile
3. browse tutors
4. open tutor detail
5. send message
6. create session
7. confirm session
8. leave review

### Role 1

- lead integration
- fix backend mismatches
- handle merge conflicts

### Role 2

- fix auth and profile issues

### Role 3

- fix marketplace and page flow issues

### Role 4

- fix messaging, session, and review issues
- verify test scenarios

### Done Standard

- at least two users can complete the full tutoring flow
- no manual database edits are needed during demo use

## Phase 4: Deployment and Demo Readiness

### Goal

Ship a stable version for class presentation.

### Role 1

- deploy app
- configure production environment
- fix database deployment issues

### Role 2

- polish onboarding and profile UX

### Role 3

- polish tutor search and detail page UX

### Role 4

- prepare seed data
- prepare testing checklist
- prepare demo accounts and demo script

### Done Standard

- deployed app is accessible
- demo accounts are usable
- full flow works in production

## Priority by Importance

### P0: Must Finish

- sign-up and login
- profile setup
- tutor browsing and search
- tutor detail page
- messaging
- session creation

### P1: Should Finish

- reviews and ratings
- tutoring request posting
- dashboard improvements
- better search filters

### P2: Only If Time Allows

- transcript verification badge
- advanced matching algorithm
- tutor favorites
- moderation tools
- payment support

## Done Definition by Role

### Role 1

- schema migrates cleanly
- backend endpoints are callable
- data can be stored and fetched correctly
- permissions are enforced

### Role 2

- users can register and log in
- profiles save correctly
- tutor and tutee states are distinguishable

### Role 3

- tutor data is visible in list and detail pages
- filtering works with real data
- user can navigate tutor discovery smoothly

### Role 4

- users can send messages
- sessions can be created and updated
- reviews can be submitted
- seed data supports demo usage

## Team Rules

1. database schema changes must go through the backend and database owner
2. API contracts should be agreed before parallel development starts
3. each member should work on a dedicated feature branch
4. the team should sync progress daily or near-daily
5. every branch should be tested locally before merge
6. the final week should focus on integration and bug fixing, not large new features

## Suggested Branch Names

- `feature/auth-profile`
- `feature/tutor-marketplace`
- `feature/messages-sessions`
- `feature/backend-foundation`

## Final Note

The project lead should own the foundation, but should not become the only person doing all backend work. The right approach is to centralize architecture and schema decisions while distributing business modules across the team.
