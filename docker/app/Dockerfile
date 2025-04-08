# ------------------------------------------------------------------------

#
# Node.js base image
#

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN apt update && apt install -y libssl-dev imagemagick poppler-utils

ADD docker/app/config/policy.xml /etc/ImageMagick-6/policy.xml

WORKDIR /app

ENV PATH /app/node_modules/.bin:$PATH

# ------------------------------------------------------------------------

#
# Install npm dependencies
#

FROM base AS installer

WORKDIR /app

COPY package.json pnpm-lock.yaml .

RUN pnpm install --frozen-lockfile

# ------------------------------------------------------------------------

#
# Build application
#

FROM base AS builder
# ENV NODE_OPTIONS="--max_old_space_size=4096"

WORKDIR /app

COPY . .
COPY --from=installer /app/node_modules ./node_modules

RUN pnpm run build

# ------------------------------------------------------------------------

#
# Run application
#

FROM base AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app .

CMD ["next", "start"]

# ------------------------------------------------------------------------
