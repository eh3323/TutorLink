# TutorLink API Contract

Last updated: 2026-04-26

This document is the first stable backend contract for the TutorLink MVP.

It does not mean every route below is fully implemented yet.
It means these routes, ownership boundaries, and response conventions are the backend direction teammates should build against.

## Conventions

### Authentication

- Private routes require a signed-in session.
- The session user id is the source of truth for ownership checks.
- Role-aware actions should use backend permission guards, not frontend-only checks.

### Response envelope

Successful responses:

```json
{
  "ok": true,
  "data": {}
}
```

Failed responses:

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Readable error message"
  }
}
```

### Error codes in use

- `UNAUTHORIZED`
- `FORBIDDEN`
- `INVALID_INPUT`
- `INVALID_JSON`
- `USER_NOT_FOUND`
- `INTERNAL_SERVER_ERROR`

## Stable Shared Backend Utilities

These helpers now define the base pattern for route handlers:

- `src/lib/api.ts`
  - standard success and error envelopes
  - route-level error handling
  - JSON body parsing helper
- `src/lib/permissions.ts`
  - require signed-in user
  - require role
  - require resource ownership
  - tutor / tutee capability checks
- `src/lib/validation.ts`
  - object, string, number, and boolean validation helpers

## Route Map

### Implemented now

#### `GET /api/me`

Purpose:
- Return the signed-in user and current profile shells.

Auth:
- required

Response shape:

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "string",
      "email": "string",
      "role": "TUTOR | TUTEE | BOTH | null",
      "schoolEmailVerifiedAt": "ISO date | null",
      "createdAt": "ISO date"
    },
    "profile": {},
    "tutorProfile": {},
    "tuteeProfile": {},
    "capabilities": {
      "canActAsTutor": true,
      "canActAsTutee": true
    }
  }
}
```

#### `GET /api/profile`

Purpose:
- Return the signed-in user's editable profile state.

Auth:
- required

Response shape:
- same envelope and payload shape as `GET /api/me`

#### `PATCH /api/profile`

Purpose:
- Update the signed-in user's profile and role-specific profile fields.

Auth:
- required

Request shape:

```json
{
  "role": "TUTOR | TUTEE | BOTH",
  "profile": {
    "fullName": "string",
    "major": "string | null",
    "bio": "string | null",
    "school": "string",
    "graduationYear": 2027,
    "avatarUrl": "string | null"
  },
  "tutorProfile": {
    "headline": "string | null",
    "hourlyRateCents": 4500,
    "supportsOnline": true,
    "supportsInPerson": false,
    "defaultLocation": "Bobst Library",
    "availabilityNotes": "Weeknights after 6pm"
  },
  "tuteeProfile": {
    "learningGoals": "Need help with algorithms",
    "preferredBudgetCents": 3000,
    "supportsOnline": true,
    "supportsInPerson": true,
    "availabilityNotes": "Tuesday and Thursday afternoons"
  }
}
```

Rules:
- all sections are optional for PATCH
- omitted fields are left unchanged
- optional text and number fields can be cleared with `null`
- `tutorProfile` updates require role `TUTOR` or `BOTH`
- `tuteeProfile` updates require role `TUTEE` or `BOTH`

Response shape:
- same envelope and payload shape as `GET /api/me`

### Next routes to implement against this contract

#### `GET /api/tutors`

Purpose:
- List tutors for marketplace browsing.

Auth:
- optional for MVP, but may become required later

Suggested query params:
- `subject`
- `minRate`
- `maxRate`
- `mode`
- `verified`

#### `GET /api/tutors/:id`

Purpose:
- Return one tutor's public detail payload.

#### `POST /api/requests`

Purpose:
- Create a tutoring request as a tutee-capable user.

Auth:
- required

#### `POST /api/threads`

Purpose:
- Create or reuse a message thread between tutor and tutee.

Auth:
- required

#### `POST /api/messages`

Purpose:
- Send a message into an existing thread.

Auth:
- required

#### `POST /api/sessions`

Purpose:
- Create a tutoring session from a thread or request.

Auth:
- required

#### `PATCH /api/sessions/:id`

Purpose:
- Update session status and agreed details.

Auth:
- required

#### `POST /api/reviews`

Purpose:
- Create a review tied to a completed session.

Auth:
- required

## Ownership Boundaries

Project lead / backend owner should own:

- route shape
- validation
- permission rules
- DB query patterns
- integration consistency

Feature owners can safely build UI against:

- response envelope format
- route names above
- authenticated-user model from `GET /api/me`
