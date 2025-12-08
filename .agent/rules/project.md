---
trigger: always_on
---

---
description: General rules and guardrails for the Soliloan project
globs: 
---

# Project Overview

Soliloan is a multi-tenant crowdinvesting management application built with Next.js 15, Prisma, and Tailwind CSS. It manages lenders, loans, transactions, and project configurations.

# Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4, Shadcn/UI
- **Database**: PostgreSQL with Prisma ORM 6
- **State Management**: Zustand, Nuqs (URL state), TanStack Query (Server State)
- **Forms**: React Hook Form + Zod
- **Tables**: Tanstack Table
- **Authentication**: NextAuth (Beta) / Better-Auth
- **Server Actions**: Next-Safe-Action
- **Internationalization**: Next-Intl
- **Linting/Formatting**: Biome
- **Package Manager**: pnpm
- **Development and Deployment**: docker

# Core Rules

## 1. Package Management
- **ALWAYS** use `pnpm` for package management. Never use `npm` or `yarn`.

## 2. Code Style & formatting
- **Formatter**: Use `biome` for all formatting and linting.
  - Indent: 2 spaces (as per biome default/config)
- **Naming Conventions**:
  - Files: `kebab-case.ts/tsx`
  - Components: `PascalCase`
  - Functions: `camelCase`
  - Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE` or `camelCase`
- **Imports**: Organize imports using Biome's organizer.

## 3. TypeScript & Types
- **Strict Mode**: Enable strict type checking. No `any` types.
- **Prisma Types**: Reuse Prisma generated types (`@prisma/client`) whenever possible.
- **Extensions**: Create specific types for relations in `src/types` (e.g., `LenderWithRelations`) extending Prisma types.
- **Validation**: Use `zod` for runtime validation, especially for form schemas and API inputs.

## 4. Component Architecture
- **Server Components**: Default to Server Components. Use `'use client'` explicitly only when hooks or interactivity are needed.
- **Shadcn/UI**: Use Shadcn/UI components from `src/components/ui`.
- **Composition**: Keep components small and focused. Pattern: `components/<feature>/<component-name>.tsx`.

## 5. Data Fetching & Mutations
- **Server Actions**: Use Server Actions for all data mutations and fetching.
- **Security**: Wrap server actions with `next-safe-action` to ensure type safety and error handling.
- **Querying**: Use `useQuery` with Server Actions for data fetching on the client.
- **Databases**: Access database via `src/lib/db.ts`.
- **Folders**: Put mutation server action in the <feature>/mutations folder and query server action in the <feature>/queries folder

## 6. Internationalization (i18n)
- **No Hardcoded Strings**: All user-facing text **MUST** be internationalized using `next-intl`.
- **Translation Files**: Add keys to `src/messages/de.json` (and `en.json`).
- **Hook**: Use `useTranslations()` hook in components.

## 7. Project Structure
- `src/app`: App Router pages and layouts.
- `src/actions`: Server actions (grouped by entity).
- `src/components`: UI components.
- `src/lib`: Utilities and shared logic.
- `src/types`: TypeScript type definitions.
- `src/store`: Zustand stores.
- `prisma/schema.prisma`: Database schema.

# Workflow Guardrails

- **Database Changes**:
  1. Modify `prisma/schema.prisma`.
  2. Run `pnpm prisma migrate dev` (or `pnpm prisma db push` if prototyping).
  3. Restart dev server if needed.
- **New Components**:
  - Check if a Shadcn component exists first.
  - If creating custom, place in `src/components/<feature>`.
- **Testing**:
  - Verify changes in browser.
  - Run `pnpm type-check` (if script exists) or `pnpm build` to verify types.
