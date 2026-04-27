import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { db } from "@/lib/db";
import { Role } from "@/lib/enums";
import { isNyuEmail, verifyPassword } from "@/lib/passwords";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  isAdmin: boolean;
};

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "NYU email + password",
      credentials: {
        email: { label: "NYU Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";

        if (!email || !isNyuEmail(email) || !password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email },
          include: { profile: true },
        });

        if (!user || !user.passwordHash || user.isSuspended) {
          return null;
        }

        const ok = await verifyPassword(password, user.passwordHash);
        if (!ok) {
          return null;
        }

        const authUser: AuthUser = {
          id: user.id,
          email: user.email,
          name: user.profile?.fullName ?? user.email,
          role: ((user.role as Role | null) ?? Role.TUTEE) as Role,
          isAdmin: user.isAdmin,
        };

        return authUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as AuthUser;
        token.id = u.id;
        token.role = u.role;
        token.isAdmin = u.isAdmin;
        token.name = u.name;
        token.email = u.email;
      }

      if (token.id) {
        const currentUser = await db.user.findUnique({
          where: { id: token.id as string },
          include: { profile: true },
        });

        if (!currentUser || currentUser.isSuspended) {
          // Invalidate the session: returning an empty token forces NextAuth to re-auth.
          return {};
        }

        token.role = (currentUser.role as Role | null) ?? token.role;
        token.name = currentUser.profile?.fullName ?? token.name;
        token.email = currentUser.email;
        token.isAdmin = currentUser.isAdmin;
      }

      return token;
    },
    async session({ session, token }) {
      if (!token.id) {
        // Token was invalidated (suspended/deleted user). Return session without user.
        return { ...session, user: undefined as unknown as typeof session.user };
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.isAdmin = Boolean(token.isAdmin);
      }

      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
