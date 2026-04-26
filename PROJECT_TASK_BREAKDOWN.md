# TutorLink Project Task Breakdown

## Goal

Build a usable web application where NYU students can find peer tutors based on subject, availability, budget, and learning needs.

The first release should support the core flow:

1. a student signs up with an `@nyu.edu` email
2. the student creates a tutor or tutee profile
3. the student browses tutors or posts a tutoring need
4. the student contacts a tutor
5. both sides confirm a tutoring session

This is the MVP. Payment, transcript verification, advanced matching, and video calls should not block the first usable version.

## MVP Scope

### Must Have

- university email-based sign-up and login
- tutor and tutee profiles
- tutor browsing and filtering
- tutor detail page
- direct messaging between users
- session booking and confirmation

### Should Have

- ratings and reviews
- tutee tutoring request posting
- tutor dashboard and tutee dashboard

### Later Features

- transcript-based verified badge flow
- advanced recommendation or matching algorithm
- in-app payment
- video meeting support
- admin moderation tools

## Phase 1: Define the Product

### Objective

Lock the MVP before writing too much code.

### Tasks

- define the primary user roles: `Tutor` and `Tutee`
- define the main user journey from sign-up to confirmed session
- decide whether the first release is centered on:
  - tutor search first
  - tutoring request posting first
- confirm what is out of scope for the first version

### Deliverables

- MVP scope document
- 3 core user flows
- feature priority list (`P0`, `P1`, `P2`)

## Phase 2: Choose the Stack and Initialize the Project

### Objective

Create a shared codebase that everyone can develop in.

### Tasks

- choose the main stack
  - frontend: `Next.js + TypeScript + Tailwind CSS`
  - backend: `Next.js API Routes` or `Server Actions`
  - database: `PostgreSQL`
  - ORM: `Prisma`
  - auth: `NextAuth` or equivalent
- initialize the project
- set up git rules, linting, formatting, and environment variables
- define basic folder structure

### Deliverables

- running local project
- shared repo structure
- `.env.example`
- lint and formatting setup

## Phase 3: Design the Database and Data Model

### Objective

Define the system structure before feature work branches out.

### Core Entities

- `User`
- `Profile`
- `TutorProfile`
- `TuteeProfile`
- `Subject` or `Course`
- `TutoringRequest`
- `MessageThread`
- `Message`
- `Session`
- `Review`

### Tasks

- define table fields
- define relationships
- define enums and status values
  - request: `open`, `matched`, `closed`
  - session: `pending`, `confirmed`, `completed`, `cancelled`
- write Prisma schema
- create the initial migration

### Deliverables

- ER diagram
- Prisma schema
- database migration

## Phase 4: Design Pages and API Contracts

### Objective

Align frontend and backend before parallel development starts.

### Core Pages

- home or landing page
- sign up and login
- profile setup
- dashboard
- tutor browse page
- tutor detail page
- request posting page
- messages page
- sessions page

### Core APIs

- sign up / login
- get and update profile
- create and list tutors
- create and list tutoring requests
- search and filter
- create thread and send message
- create and update session
- create review

### Deliverables

- page list
- API contract document
- wireframes or low-fidelity mockups

## Phase 5: Build Authentication and User Profile

### Objective

Make sure users can enter the platform and become valid system users.

### Tasks

- implement sign-up and login
- restrict email domain to `@nyu.edu`
- implement role selection after first login
- build profile setup and edit pages
- store user information in the database

### Completion Standard

- a new user can register
- a user can log in
- a user can create and save a profile
- tutor and tutee dashboards are separated

## Phase 6: Build the Marketplace Core

### Objective

Enable students to actually find tutors.

### Tasks

- build tutor list page
- build tutor card UI
- build tutor detail page
- implement search and filtering
  - course or subject
  - availability
  - budget or rate
  - rating
  - location or online status
- optionally build tutoring request posting and browsing

### Completion Standard

- a tutee can browse tutors
- a tutee can filter results
- a tutee can open tutor detail pages

## Phase 7: Build Messaging and Session Booking

### Objective

Turn browsing into real tutor-tutee interaction.

### Tasks

- create message threads
- send messages between users
- start a conversation from tutor profile or request page
- create a tutoring session
  - time
  - location or meeting link
  - topic
  - budget
- confirm or cancel a session

### Completion Standard

- two users can message each other
- a session can be created
- session status can be updated and tracked

## Phase 8: Add Trust and Quality Features

### Objective

Make the product reliable enough for real demonstration use.

### Tasks

- implement review and rating flow
- add access control checks
- add empty states, loading states, and error states
- handle permission boundaries correctly

### Completion Standard

- completed sessions can receive reviews
- users cannot access or modify other users' private data
- main pages do not break on empty data

## Phase 9: Test, Deploy, and Prepare the Demo

### Objective

Ship a stable project that can be shown live.

### Tasks

- create seed data
- test all main user flows
- fix UI bugs and mobile responsiveness issues
- deploy the app and database
- prepare demo accounts and demo script

### Completion Standard

- an outsider can open the site and use the main flow
- the demo can run without manual database edits

## Recommended Development Order

1. define MVP scope
2. initialize project and stack
3. build schema and migrations
4. implement auth and profiles
5. build tutor browse and search
6. build tutor detail page
7. build messaging
8. build session booking
9. build review and polish
10. deploy and test

## Final Note

The first version should optimize for a working end-to-end flow, not feature count. The strongest MVP is the one that lets a student find, contact, and book a peer tutor without confusion.
