# ------------------------------------------------------------------------
#
# Node.js base image
#
FROM node:24-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN apt-get update \
  && apt-get install -y --no-install-recommends libssl-dev imagemagick poppler-utils openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ADD docker/app/config/policy.xml /etc/ImageMagick-6/policy.xml

WORKDIR /app

ENV PATH=/app/node_modules/.bin:$PATH

# ------------------------------------------------------------------------
#
# Install npm dependencies
#
FROM base AS installer

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .

RUN pnpm install --frozen-lockfile

# ------------------------------------------------------------------------
#
# Build application
#
FROM base AS builder
WORKDIR /app

ARG NEXT_PUBLIC_SOLILOAN_PROJECT_NAME
ARG NEXT_PUBLIC_SOLILOAN_URL
ENV NEXT_PUBLIC_SOLILOAN_PROJECT_NAME=$NEXT_PUBLIC_SOLILOAN_PROJECT_NAME
ENV NEXT_PUBLIC_SOLILOAN_URL=$NEXT_PUBLIC_SOLILOAN_URL
# prisma/config and next build resolve DATABASE_URL at build time (no real DB connection required)
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build

COPY . .
COPY --from=installer /app/node_modules ./node_modules

RUN pnpm exec prisma generate
RUN pnpm run build

# ------------------------------------------------------------------------
#
# Run application
#
FROM base AS runner

WORKDIR /app
ENV NODE_ENV=production

# Keep Prisma CLI/config/migrations and system template designs in the runtime
# image. Admin "load from file" and seed read `prisma/system-template-designs`
# from disk (staging/production use this same image).
COPY --from=builder /app .
RUN test -f prisma.config.ts \
  && test -d prisma/migrations \
  && test -d prisma/system-template-designs \
  && test -f prisma/system-template-designs/password-reset-email.json \
  && test -f prisma/system-template-designs/forum-unread-email.json \
  && test -f prisma/system-template-designs/manager-invite-email.json \
  && test -f prisma/system-template-designs/lender-invite-email.json \
  && test -f prisma/system-template-designs/transaction-notification-email.json \
  && test -f prisma/system-template-designs/yearly-account-notification.json \
  && test -f prisma/system-template-designs/defaultEmail.json \
  && test -f prisma/system-template-designs/defaultDocument.json \
  && test -x node_modules/.bin/prisma \
  && test -x node_modules/.bin/tsx

CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec prisma db seed && exec next start"]

# ------------------------------------------------------------------------
