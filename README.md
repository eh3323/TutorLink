# TutorLink

TutorLink is a peer-to-peer tutoring marketplace designed for university communities, starting with NYU. The platform helps students find approachable academic support by connecting tutees with qualified peer tutors from their own school.

This repository is the starting point for the NYU CS Design Project implementation.

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

Project bootstrap in progress.
