import { ApiError, apiCreated, handleRouteError, readJsonBody } from "@/lib/api";
import { db } from "@/lib/db";
import { Role } from "@/lib/enums";
import {
  hashPassword,
  isNyuEmail,
  validatePassword,
} from "@/lib/passwords";
import { parseString, requireObject } from "@/lib/validation";

type RegisterBody = {
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
  role?: unknown;
};

function parseRole(value: unknown): Role {
  if (value === Role.TUTOR || value === Role.TUTEE || value === Role.BOTH) {
    return value;
  }
  throw new ApiError(400, "INVALID_INPUT", "role must be TUTOR, TUTEE, or BOTH.");
}

export async function POST(request: Request) {
  try {
    const body = requireObject(await readJsonBody<RegisterBody>(request));

    const email = parseString(body.email, {
      field: "email",
      required: true,
      minLength: 5,
      maxLength: 200,
    })?.toLowerCase();

    if (!email || !isNyuEmail(email)) {
      throw new ApiError(400, "INVALID_INPUT", "Use a valid @nyu.edu email address.");
    }

    const password = parseString(body.password, {
      field: "password",
      required: true,
      minLength: 8,
      maxLength: 120,
    });
    if (!password) {
      throw new ApiError(400, "INVALID_INPUT", "Password is required.");
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      throw new ApiError(400, "INVALID_INPUT", passwordError);
    }

    const fullName = parseString(body.fullName, {
      field: "fullName",
      required: true,
      minLength: 2,
      maxLength: 100,
    });
    if (!fullName) {
      throw new ApiError(400, "INVALID_INPUT", "Full name is required.");
    }

    const role = parseRole(body.role);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      throw new ApiError(
        409,
        "EMAIL_TAKEN",
        "That email is already registered. Try signing in instead.",
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        role,
        schoolEmailVerifiedAt: new Date(),
        profile: {
          create: {
            fullName,
          },
        },
        ...(role === Role.TUTOR || role === Role.BOTH
          ? { tutorProfile: { create: {} } }
          : {}),
        ...(role === Role.TUTEE || role === Role.BOTH
          ? { tuteeProfile: { create: {} } }
          : {}),
      },
      include: { profile: true },
    });

    return apiCreated({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.profile?.fullName ?? fullName,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
