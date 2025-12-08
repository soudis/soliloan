---
trigger: always_on
---

# Next.js Best Practices

## PNPM
- ALWAYS use pnpm (not npm or yarn)

## Forms / UI / react-hook-form
- always use information from the prisma schema `src/schema/prisma.schema`
- Use existing components 
- If there is no existing form component create one using shadcn/ui
- Always create a form component and a form-fields components
- Use react-hook-form
- Look at existing forms for reference
- Always default every form field in defaultValues with null explicitly to prevent changes from uncontrolled to controlled
- If possible use the same form component for forms to create or to edit something

## Project Structure
- Use the App Router directory structure
- Place components in `components` directory
- Place utilities and helpers in `lib` directory
- Use lowercase with dashes for directories and components (e.g., `components/auth-wizard/wizard-form.tsx`)

## Types
- use types from prisma client if possible or base types on them

## Components
- Use Server Components by default
- Mark client components explicitly with 'use client'
- Wrap client components in Suspense with fallback
- Use dynamic loading for non-critical components
- Implement proper error boundaries
- Place static content and interfaces at file end
- use sonner for toasts

## Performance
- Optimize images: Use WebP format, size data, lazy loading
- Minimize use of 'useEffect' and 'setState'
- Favor Server Components (RSC) where possible
- Use dynamic loading for non-critical components
- Implement proper caching strategies

## API endpoints / Server actions
- Use server actions when possible
- Only use API endpoints if server actions are not feasable (e.g. for data streaming)
- Always make sure to look at existing server actions / endpoints and be consistent with their style
- Make sure to use translation keys for error codes and translate them in the frontend
- Make sure to add security checks. E.g. a user is only allowed to manipulate or see data from their projects

## Data Fetching
- Use Server actions with tanstack query for data fetching when possible
- Implement proper error handling for data fetching
- Use appropriate caching strategies
- Handle loading and error states appropriately

## Routing
- Use the App Router conventions
- Implement proper loading and error states for routes
- Use dynamic routes appropriately
- Handle parallel routes when needed

## Translations
- Always make sure to add translations to the `src/messages/de/*.json` file. The messages are split into several json files at the top level key.
- Make sure to have a consistent structure with the existing translations
- Always search for existing translation keys and use them

## Forms and Validation
- Use Zod for form validation
- Look at existing validations in `lib/schemas` folder and reuse common schemas!
- Implement proper server-side validation
- Handle form errors appropriately
- Translate form errors with translation keys
- Show loading states during form submission