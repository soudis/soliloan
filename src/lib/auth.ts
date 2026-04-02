import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { db } from './db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt', //(1)
  },
  adapter: PrismaAdapter(db),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          include: {
            managerOf: true,
            lenders: true,
          },
        });

        if (!user) {
          throw new Error('User not found');
        }

        if (!user.password) {
          throw new Error('User has no password');
        }

        const { verifyPassword } = await import('./utils/password');
        const isValid = await verifyPassword(credentials.password as string, user.password);

        if (!isValid) {
          throw new Error('Invalid password');
        }
        await db.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });
        const isAdmin = user.isAdmin ?? false;
        const isManager = user.managerOf.length > 0 || isAdmin;

        return {
          ...user,
          isAdmin: isAdmin,
          isManager: isManager,
          managerOf: user.managerOf.map((u) => u.id),
          loanedToProjects: [...new Set(user.lenders.map((l) => l.projectId))],
          language: user.language ?? process.env.DIRECTLOAN_DEFAULT_LANGUAGE ?? 'de',
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          ...(token.user && typeof token.user === 'object' ? token.user : {}),
        },
      };
    },

    async jwt({ token, user, account }) {
      if (account && account.type === 'credentials') {
        //(2)
        token.user = user;
      }
      return token;
    },
  },
});
