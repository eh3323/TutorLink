import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Role } from "@prisma/client";

import { db } from "@/lib/db";

const ALLOWED_EMAIL_DOMAIN = "@nyu.edu";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

function normalizeRole(rawRole: unknown): Role {
  if (rawRole === Role.TUTOR || rawRole === Role.TUTEE || rawRole === Role.BOTH) {
    return rawRole;
  }

  return Role.TUTEE;
}

async function ensureRoleProfiles(userId: string, role: Role) {
  if (role === Role.TUTOR || role === Role.BOTH) {
    await db.tutorProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  if (role === Role.TUTEE || role === Role.BOTH) {
    await db.tuteeProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    CredentialsProvider({
      name: "NYU Email",
      credentials: {
        email: { label: "NYU Email", type: "email" },
        fullName: { label: "Full Name", type: "text" },
        role: { label: "Role", type: "text" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const fullName = credentials?.fullName?.trim();
        const role = normalizeRole(credentials?.role);

        if (!email || !email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
          return null;
        }

        if (!fullName) {
          return null;
        }

        const user = await db.user.upsert({
          where: { email },
          update: {
            role,
            schoolEmailVerifiedAt: new Date(),
            profile: {
              upsert: {
                update: { fullName },
                create: { fullName },
              },
            },
          },
          create: {
            email,
            role,
            schoolEmailVerifiedAt: new Date(),
            profile: {
              create: {
                fullName,
              },
            },
          },
          include: {
            profile: true,
          },
        });

        await ensureRoleProfiles(user.id, role);

        const authUser: AuthUser = {
          id: user.id,
          email: user.email,
          name: user.profile?.fullName ?? fullName,
          role: user.role ?? role,
        };

        return authUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as AuthUser).id;
        token.role = (user as AuthUser).role;
        token.name = user.name;
        token.email = user.email;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }

      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
