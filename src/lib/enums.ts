export const Role = {
  TUTOR: "TUTOR",
  TUTEE: "TUTEE",
  BOTH: "BOTH",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const VerificationStatus = {
  UNVERIFIED: "UNVERIFIED",
  PENDING: "PENDING",
  VERIFIED: "VERIFIED",
} as const;
export type VerificationStatus =
  (typeof VerificationStatus)[keyof typeof VerificationStatus];

export const RequestStatus = {
  OPEN: "OPEN",
  MATCHED: "MATCHED",
  CLOSED: "CLOSED",
  CANCELLED: "CANCELLED",
} as const;
export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

export const ApplicationStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type ApplicationStatus =
  (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const DeliveryMode = {
  ONLINE: "ONLINE",
  IN_PERSON: "IN_PERSON",
} as const;
export type DeliveryMode = (typeof DeliveryMode)[keyof typeof DeliveryMode];

export const SessionStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];
