import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { verifyPassword } from "./utils/password";

const db = new PrismaClient();

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/auth/login",
  },
  session: {
    strategy: "jwt", //(1)
  },
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            managerOf: true,
            lenders: true,
          },
        });
        if (
          !user ||
          !user.password ||
          !verifyPassword(credentials.password as string, user.password)
        ) {
          throw new Error("User not found");
        }
        await db.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        return {
          ...user,
          isAdmin: user.isAdmin ?? false,
          isManager: user.managerOf.length > 0,
          managerOf: user.managerOf.map((u) => u.id),
          loanedToProjects: [...new Set(user.lenders.map((l) => l.projectId))],
          language:
            user.language ?? process.env.DIRECTLOAN_DEFAULT_LANGUAGE ?? "de",
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, user, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          ...token.user,
        },
      };
    },

    async jwt({ session, token, user, account }) {
      if (account && account.type === "credentials") {
        //(2)
        token.user = user;
      }
      return token;
    },
  },
});
