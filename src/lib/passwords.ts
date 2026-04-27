import bcrypt from "bcryptjs";

const DEFAULT_ROUNDS = 10;

export async function hashPassword(password: string) {
  return bcrypt.hash(password, DEFAULT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export const ALLOWED_EMAIL_DOMAIN = "@nyu.edu";

export function isNyuEmail(email: string | null | undefined) {
  if (!email) return false;
  return email.toLowerCase().endsWith(ALLOWED_EMAIL_DOMAIN);
}

export function validatePassword(password: string) {
  if (typeof password !== "string") return "Password is required.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (password.length > 120) return "Password must be under 120 characters.";
  if (!/[a-z]/i.test(password) || !/\d/.test(password)) {
    return "Password must include a letter and a number.";
  }
  return null;
}
