import { PrismaAdapter } from '@auth/prisma-adapter';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { db } from './db';

const MAX_FAILED_LOGIN_ATTEMPTS = 10;
const LOCKOUT_MINUTES = 15;

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
          throw new Error('error.account.noPassword');
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error('error.auth.accountLocked');
        }

        const { verifyPassword } = await import('./utils/password');
        const isValid = await verifyPassword(credentials.password as string, user.password);

        if (!isValid) {
          const failedLoginAttempts = user.failedLoginAttempts + 1;
          await db.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts,
              lockedUntil:
                failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS
                  ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
                  : null,
            },
          });
          throw new Error('Invalid password');
        }
        await db.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date(), failedLoginAttempts: 0, lockedUntil: null },
        });
        const isAdmin = user.isAdmin ?? false;
        const isManager = user.managerOf.length > 0 || isAdmin;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          isAdmin,
          isManager,
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

    async jwt({ token, user, account, trigger, session: updateSession }) {
      if (account && account.type === 'credentials') {
        //(2)
        token.user = user;
      }

      if (
        trigger === 'update' &&
        updateSession &&
        typeof updateSession === 'object' &&
        'user' in updateSession &&
        updateSession.user &&
        typeof updateSession.user === 'object'
      ) {
        const updates = updateSession.user as Record<string, unknown>;
        const currentUser = typeof token.user === 'object' && token.user !== null ? token.user : {};
        token.user = {
          ...currentUser,
          ...('name' in updates && typeof updates.name === 'string' ? { name: updates.name } : {}),
          ...('language' in updates && typeof updates.language === 'string' ? { language: updates.language } : {}),
        };
      }

      return token;
    },
  },
});
