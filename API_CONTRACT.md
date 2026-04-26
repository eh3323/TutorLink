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
- `REQUEST_NOT_FOUND`
- `THREAD_NOT_FOUND`
- `SUBJECT_NOT_FOUND`
- `SESSION_NOT_FOUND`
- `INVALID_SESSION_STATUS_TRANSITION`
- `SESSION_NOT_COMPLETED`
- `REVIEW_ALREADY_EXISTS`
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

#### `GET /api/tutors`

Purpose:
- List tutors for marketplace browsing.

Auth:
- optional for MVP, but may become required later

Supported query params:
- `subject`
- `minRate`
- `maxRate`
- `mode`
- `verified`

Query rules:
- `mode` must be `online` or `in-person`
- `verified` must be `true` or `false`
- `minRate` and `maxRate` are integer cent values

Response shape:

```json
{
  "ok": true,
  "data": {
    "tutors": [
      {
        "id": "user id",
        "role": "TUTOR | BOTH",
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
          "defaultLocation": "string | null",
          "availabilityNotes": "string | null",
          "verificationStatus": "UNVERIFIED | PENDING | VERIFIED",
          "subjects": []
        },
        "stats": {
          "averageRating": 4.5,
          "reviewCount": 3
        }
      }
    ],
    "filters": {
      "subject": "CSCI",
      "minRate": 2000,
      "maxRate": 5000,
      "mode": "online",
      "verified": true
    },
    "total": 1
  }
}
```

#### `GET /api/tutors/:id`

Purpose:
- Return one tutor's public detail payload.

Auth:
- optional for MVP

Response shape:
- same tutor base shape as list route
- plus `recentReviews`

#### `POST /api/threads`

Purpose:
- Create or reuse a message thread between tutor and tutee.

Auth:
- required

Request shape:

```json
{
  "tutorId": "user id",
  "tuteeId": "user id",
  "requestId": "optional request id"
}
```

Rules:
- the signed-in user must be either `tutorId` or `tuteeId`
- `tutorId` must belong to a tutor-capable user
- `tuteeId` must belong to a tutee-capable user
- if `requestId` is present, it must belong to `tuteeId`
- if the same tutor/tutee/request combination already has a thread, the route reuses it

Response shape:

```json
{
  "ok": true,
  "data": {
    "reused": false,
    "thread": {
      "id": "thread id",
      "createdAt": "ISO date",
      "updatedAt": "ISO date",
      "participants": {
        "tutor": {},
        "tutee": {}
      },
      "request": {},
      "latestMessage": null
    }
  }
}
```

#### `POST /api/messages`

Purpose:
- Send a message into an existing thread.

Auth:
- required

Request shape:

```json
{
  "threadId": "thread id",
  "body": "message text"
}
```

Rules:
- the signed-in user must be the tutor or tutee participant of the thread
- the sender must still have the matching tutor/tutee capability for their side of the thread
- `body` is required and capped at 2000 characters

Response shape:

```json
{
  "ok": true,
  "data": {
    "message": {
      "id": "message id",
      "threadId": "thread id",
      "senderId": "user id",
      "body": "message text",
      "createdAt": "ISO date",
      "sender": {}
    },
    "thread": {
      "id": "thread id",
      "participants": {},
      "request": {},
      "latestMessage": {}
    }
  }
}
```

### Next routes to implement against this contract

#### `POST /api/requests`

Purpose:
- Create a tutoring request as a tutee-capable user.

Auth:
- required

#### `POST /api/sessions`

Purpose:
- Create a tutoring session between one tutor and one tutee.

Auth:
- required

Request shape:

```json
{
  "tutorId": "user id",
  "tuteeId": "user id",
  "subjectId": "subject id",
  "threadId": "optional thread id",
  "requestId": "optional request id",
  "scheduledAt": "2026-04-30T18:30:00.000Z",
  "durationMinutes": 60,
  "mode": "ONLINE | IN_PERSON",
  "locationText": "Bobst Library | Zoom",
  "agreedRateCents": 4000,
  "notes": "Focus on dynamic programming"
}
```

Rules:
- the signed-in user must be either the tutor or the tutee participant
- `subjectId` must exist
- if `threadId` is present, it must belong to the same tutor/tutee pair
- if `requestId` is present, it must belong to `tuteeId` and match `subjectId`
- `durationMinutes` must be between `15` and `600`

Response shape:
- session object with participants, subject, optional thread, and optional request

#### `PATCH /api/sessions/:id`

Purpose:
- Update session status and editable session details.

Auth:
- required

Allowed status flow:
- `PENDING -> CONFIRMED | CANCELLED`
- `CONFIRMED -> COMPLETED | CANCELLED`
- `COMPLETED` and `CANCELLED` are terminal

Editable fields:
- `status`
- `scheduledAt`
- `durationMinutes`
- `mode`
- `locationText`
- `agreedRateCents`
- `notes`

#### `POST /api/reviews`

Purpose:
- Create a review tied to a completed session.

Auth:
- required

Request shape:

```json
{
  "sessionId": "session id",
  "rating": 5,
  "comment": "Very clear explanations and well prepared."
}
```

Rules:
- the signed-in user must be the tutor or tutee participant of the session
- the session must already be `COMPLETED`
- each participant can leave at most one review per session
- `rating` must be an integer from `1` to `5`
- the review target is always the other participant in the session

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
