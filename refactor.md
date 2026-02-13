# Server Components Refactoring Plan

## Goal

Move from client-side data fetching (TanStack Query + Zustand `useProjects()`) to server-side data fetching using React Server Components. The `projectId` will be part of the URL instead of stored in Zustand, allowing server components to access it directly.

## Reference Implementation

`src/app/[locale]/(dashboard)/admin/templates/[id]/page.tsx` — already refactored as an async server component that fetches data via `await getTemplateAction({ id })` and passes it as props to the `TemplateEditor` client component.

---

## 1. Route Restructuring

### New Route Layout

Move all project-scoped pages under `(dashboard)/[projectId]/...` so `projectId` is always available as a server-side route param.

```
src/app/[locale]/(dashboard)/
├── projects/page.tsx                          # STAYS - admin project list (no projectId needed)
├── admin/templates/page.tsx                   # STAYS - admin-only, no project scope
├── admin/templates/[id]/page.tsx              # STAYS - already refactored
├── [projectId]/
│   ├── layout.tsx                             # NEW - server layout that loads project, passes to context/children
│   ├── page.tsx                               # MOVED from (dashboard)/page.tsx — dashboard home
│   ├── lenders/
│   │   ├── page.tsx                           # MOVED from (dashboard)/lenders/page.tsx
│   │   ├── new/page.tsx                       # MOVED from (dashboard)/lenders/new/page.tsx
│   │   └── [lenderId]/
│   │       ├── page.tsx                       # MOVED from (dashboard)/lenders/[lenderId]/page.tsx
│   │       └── edit/page.tsx                  # MOVED from (dashboard)/lenders/[lenderId]/edit/page.tsx
│   ├── loans/
│   │   ├── page.tsx                           # MOVED from (dashboard)/loans/page.tsx
│   │   ├── new/page.tsx                       # MOVED from (dashboard)/loans/new/page.tsx
│   │   └── [loanId]/
│   │       └── edit/page.tsx                  # MOVED from (dashboard)/loans/[loanId]/edit/page.tsx
│   ├── configuration/
│   │   ├── page.tsx                           # MOVED from (dashboard)/configuration/page.tsx
│   │   └── templates/
│   │       └── [id]/page.tsx                  # MOVED from (dashboard)/configuration/templates/[id]/page.tsx
│   └── logbook/page.tsx                       # MOVED from (dashboard)/logbook/page.tsx
```

### Pages That Stay at Root Level (no `[projectId]`)

| Page | Reason |
|------|--------|
| `projects/page.tsx` | Admin page — lists all projects, not scoped to one |
| `admin/templates/page.tsx` | Admin-only global templates |
| `admin/templates/[id]/page.tsx` | Already refactored, global templates |

---

## 2. New `[projectId]/layout.tsx`

Create a server layout at `(dashboard)/[projectId]/layout.tsx` that:

1. Reads `params.projectId` on the server
2. Calls `await auth()` to get the session
3. Calls `await getProjectAction({ projectId })` to load the project with configuration
4. Validates the user has access to this project (is a manager or admin)
5. Redirects to `/projects` if project not found or unauthorized
6. Provides the project to child pages (either via props pattern or a React context/provider)

```tsx
// Example structure
export default async function ProjectLayout({ children, params }) {
  const { projectId } = await params;
  const session = await auth();
  const { data } = await getProjectAction({ projectId });

  if (!data?.project) {
    redirect('/projects');
  }

  return <ProjectProvider project={data.project}>{children}</ProjectProvider>;
}
```

### Consideration: Project Context for Client Components

Since many child components are client components that need project data, create a `ProjectProvider` (client component) that wraps children and exposes the project via React context. This replaces `useProjects().selectedProject` for project-scoped pages.

---

## 3. Page-by-Page Refactoring

### 3.1 Dashboard Home (`page.tsx` → `[projectId]/page.tsx`)

**Current state:** Client component using `useQuery` for `getDashboardStats` and `getLoansByProjectAction`, `useSession()`, `useProjects()`.

**Changes needed:**
- Convert to async server component
- Fetch stats and loans on the server using `await getDashboardStats(projectId)` and `await getLoansByProjectAction({ projectId })`
- Extract the chart/stats rendering into a `DashboardContent` client component that receives data as props
- The `calculateLoanAmountDistribution` logic can run on the server
- Links to `/lenders` and `/loans` need to be updated to `/${projectId}/lenders` and `/${projectId}/loans`

**New client component:** `src/components/dashboard/dashboard-content.tsx`
- Receives `statsData`, `loansDistribution`, `yearlyData`, `userName` as props
- Renders stats cards, charts, and links (all purely presentational + interactive charts)

---

### 3.2 Lenders List (`lenders/page.tsx` → `[projectId]/lenders/page.tsx`)

**Current state:** Client component, `useQuery` for `getLendersByProjectAction`, `useProjects()`, DataTable with columns, filters, row actions.

**Changes needed:**
- Convert to async server component
- Fetch lenders on the server: `await getLendersByProjectAction({ projectId })`
- Extract the entire table logic to a `LenderTable` client component
- Server page passes `lenders`, `projectConfiguration`, and `projectId` as props

**New client component:** `src/components/lenders/lender-table.tsx`
- Receives `lenders`, `project` (for additional fields config), `projectId` (for link building)
- Contains column definitions, filters, visibility config, row actions
- Handles `router.push` for navigation (links updated to `/${projectId}/lenders/...`)

---

### 3.3 Lender Detail (`lenders/[lenderId]/page.tsx` → `[projectId]/lenders/[lenderId]/page.tsx`)

**Current state:** Client component, `useQuery` for `getLenderAction`, renders `LenderPage`.

**Changes needed:**
- Convert to async server component
- Fetch lender on the server: `await getLenderAction({ lenderId })`
- Pass lender data to `LenderPage` (already a client component that accepts `lender` prop)
- `LenderPage` component itself is already well-structured — it receives `lender` as a prop

**Minimal changes needed to `LenderPage` component itself**, except updating internal navigation links to include `projectId`.

---

### 3.4 Lender Edit (`lenders/[lenderId]/edit/page.tsx` → `[projectId]/lenders/[lenderId]/edit/page.tsx`)

**Current state:** Client component, `useQuery` for `getLenderAction`, `useSession`, `useProjects`, renders `LenderForm`.

**Changes needed:**
- Convert to async server component
- Fetch lender on the server: `await getLenderAction({ lenderId })`
- Extract form submission logic to a client component `EditLenderClient`
- Server page passes `lender`, `projectId` as props
- `EditLenderClient` handles `updateLenderAction` call, toasts, navigation

**New client component:** `src/components/lenders/edit-lender-client.tsx`
- Receives `lender`, `projectId` as props
- Contains `handleSubmit`, `isSubmitting` state, toast logic
- Navigates to `/${projectId}/lenders/${lenderId}` on success

---

### 3.5 Lender New (`lenders/new/page.tsx` → `[projectId]/lenders/new/page.tsx`)

**Current state:** Client component, `useSession`, `useProjects`, `createLenderAction` in submit handler.

**Changes needed:**
- Convert to async server component (minimal data fetching needed, just auth + project validation from layout)
- Extract form + submission logic to a `NewLenderClient` client component
- Pass `projectId` as prop

**New client component:** `src/components/lenders/new-lender-client.tsx`
- Receives `projectId`
- Contains `handleSubmit` with `createLenderAction`, toast, redirect to `/${projectId}/lenders/${id}`

---

### 3.6 Loans List (`loans/page.tsx` → `[projectId]/loans/page.tsx`)

**Current state:** Client component, `useQuery` for `getLoansByProjectAction`, DataTable with columns, filters, row actions.

**Changes needed:**
- Convert to async server component
- Fetch loans on the server: `await getLoansByProjectAction({ projectId })`
- Extract table logic to a `LoanTable` client component

**New client component:** `src/components/loans/loan-table.tsx`
- Receives `loans`, `project`, `projectId`
- Contains column definitions, filters, visibility, row actions
- Navigation links updated to `/${projectId}/loans/...` and `/${projectId}/lenders/...`

---

### 3.7 Loan New (`loans/new/page.tsx` → `[projectId]/loans/new/page.tsx`)

**Current state:** Client component, optional `lenderId` from searchParams, `useQuery` for lender, `createLoanAction`.

**Changes needed:**
- Convert to async server component
- Read `searchParams.lenderId` on the server
- If `lenderId` present, fetch lender on server: `await getLenderAction({ lenderId })`
- Pass `lender` (optional), `projectId` to client component

**New client component:** `src/components/loans/new-loan-client.tsx`
- Receives `lender?`, `projectId`
- Contains `LoanForm`, submit handler, toast, navigation

---

### 3.8 Loan Edit (`loans/[loanId]/edit/page.tsx` → `[projectId]/loans/[loanId]/edit/page.tsx`)

**Current state:** Client component, `useQuery` for `getLoanAction`, `updateLoanAction`, navigation.

**Changes needed:**
- Convert to async server component
- Fetch loan on the server: `await getLoanAction({ loanId })`
- Pass `loan`, `projectId` to client component

**New client component:** `src/components/loans/edit-loan-client.tsx`
- Receives `loan`, `projectId`
- Contains `LoanForm`, submit handler, toast, navigation to `/${projectId}/lenders/...`

---

### 3.9 Configuration (`configuration/page.tsx` → `[projectId]/configuration/page.tsx`)

**Current state:** Client component wrapper, `useSession`, `useProjects`, renders `ConfigurationPage`.

**Changes needed:**
- Convert to async server component
- Project already available from layout context/params
- Fetch project with configuration on the server (or use from layout)
- Pass project to `ConfigurationPage` (already accepts `project` prop)

**`ConfigurationPage` component changes:**
- Remove `useProjects()` usage (receive project as prop — already does)
- Update navigation links that include projectId
- The `ConfigurationPage` component itself can largely stay as-is since it already receives `project` as a prop and is a client component for tab interaction

---

### 3.10 Configuration Templates Editor (`configuration/templates/[id]/page.tsx` → `[projectId]/configuration/templates/[id]/page.tsx`)

**Current state:** Client component, `useQuery` for template, `useProjects` for project check.

**Changes needed:**
- Convert to async server component (follow the pattern from `admin/templates/[id]/page.tsx`)
- Fetch template on server: `await getTemplateAction({ id })`
- Validate template belongs to project (server-side redirect if not)
- Pass template + projectId to `TemplateEditor`

---

### 3.11 Logbook (`logbook/page.tsx` → `[projectId]/logbook/page.tsx`)

**Current state:** Already a server component. Fetches all user's projects and their changes.

**Changes needed:**
- Scope to current project only (using `projectId` from params) instead of fetching all projects
- Simplify the query to fetch changes for just this project
- `LogbookTable` already receives data as props — no changes needed there

---

## 4. Navigation Updates

### 4.1 Sidebar Navigation (`sidebar-nav.tsx`)

**Current links:**
```
/          → Dashboard home
/lenders   → Lenders list
/loans     → Loans list
/logbook   → Logbook
/configuration → Configuration
/projects  → Admin project list
```

**New links (need `projectId`):**
```
/[projectId]               → Dashboard home
/[projectId]/lenders       → Lenders list
/[projectId]/loans         → Loans list
/[projectId]/logbook       → Logbook
/[projectId]/configuration → Configuration
/projects                  → Admin project list (unchanged)
```

**Implementation:**
- `SidebarNav` / `NavItem` needs to know the current `projectId`
- Option A: Read `projectId` from URL params in the client component
- Option B: Pass `projectId` from the layout down through `DashboardNavigation`
- The `ProjectSelector` dropdown should navigate to `/${newProjectId}/` when switching projects (instead of just updating Zustand)

### 4.2 Project Selector

**Current behavior:** Updates Zustand `selectedProjectId` store only.

**New behavior:**
- When selecting a project, navigate to `/${projectId}/` (or stay on current sub-path with new projectId)
- Can extract current sub-path (e.g., `/lenders`) and navigate to `/${newProjectId}/lenders`
- May still keep Zustand for backward compat during migration, but primary source of truth is now the URL

### 4.3 Admin Projects Page Row Click

**Current:** `setSelectedProject(row)` + `router.push('/configuration')`
**New:** `router.push('/${row.id}/configuration')`

---

## 5. `revalidatePath` Updates in Server Actions

All `revalidatePath` calls in mutation actions need to be updated to include `[projectId]` in the path pattern. Many already use entity-specific paths.

| Action | Current `revalidatePath` | New `revalidatePath` |
|--------|--------------------------|----------------------|
| `create-project.ts` | `/projects` | `/projects` (unchanged) |
| `update-project-configuration.ts` | `/configuration` | `/${projectId}/configuration` |
| `create-lender.ts` | `/lenders/${data.projectId}` | `/${data.projectId}/lenders` |
| `update-lender.ts` | `/lenders/${id}` | `/${projectId}/lenders/${id}` and `/${projectId}/lenders` |
| `delete-lender.ts` | `/${projectId}/lenders` | `/${projectId}/lenders` (already correct pattern) |
| `create-loan.ts` | `/lenders/${lenderId}` | `/${projectId}/lenders/${lenderId}` and `/${projectId}/loans` |
| `update-loan.ts` | `/lenders/${lenderId}` | `/${projectId}/lenders/${lenderId}` and `/${projectId}/loans` |
| `delete-loan.ts` | `/lenders/${lenderId}` + `/${projectId}/loans` | `/${projectId}/lenders/${lenderId}` + `/${projectId}/loans` |
| `add-transaction.ts` | `/loans/${loanId}` | `/${projectId}/lenders/${lenderId}` (with lenderId from loan) |
| `delete-transaction.ts` | `/loans/${loanId}` | `/${projectId}/lenders/${lenderId}` (with lenderId from loan) |
| `create-note.ts` | `/lenders/${lenderId}` + `/loans/${loanId}` | `/${projectId}/lenders/${lenderId}` |
| `update-note.ts` | `/lenders/${lenderId}` + `/loans/${loanId}` | `/${projectId}/lenders/${lenderId}` |
| `delete-note.ts` | `/lenders/${lenderId}` + `/loans/${loanId}` | `/${projectId}/lenders/${lenderId}` |
| `add-file.ts` | `/lenders/${lenderId}` + `/loans/${loanId}` | `/${projectId}/lenders/${lenderId}` |
| `delete-file.ts` | `/lenders/${lenderId}` + `/loans/${loanId}` | `/${projectId}/lenders/${lenderId}` |
| `create-template.ts` | `/configuration` or `/admin/templates` | `/${projectId}/configuration` or `/admin/templates` |
| `update-template.ts` | `/configuration` or `/admin/templates` | `/${projectId}/configuration` or `/admin/templates` |
| `delete-template.ts` | `/configuration` or `/admin/templates` | `/${projectId}/configuration` or `/admin/templates` |
| `duplicate-template.ts` | `/configuration` or `/admin/templates` | `/${projectId}/configuration` or `/admin/templates` |
| `create-view.ts` | `/${type}` | `/${projectId}/${type}` |
| `update-view.ts` | `/${type}` | `/${projectId}/${type}` |
| `delete-view.ts` | `/${type}` | `/${projectId}/${type}` |
| `send-invitation.ts` | `/lenders/${lenderId}` | `/${projectId}/lenders/${lenderId}` |

**Note:** Some actions will need the `projectId` passed in or looked up from the entity. For actions that currently don't receive `projectId`, it can be derived from the entity (e.g., lender.projectId, loan.lender.projectId).

---

## 6. Zustand Store Changes

### `useProjects` Store

The `selectedProjectId` in Zustand becomes secondary. The URL is the source of truth for the current project.

**Options:**
- **Option A (Recommended):** Keep `useProjects()` for the projects list (admin page, project selector dropdown) but derive `selectedProjectId` from the URL. Remove the `persist` middleware since the URL now persists the selection.
- **Option B:** Remove `useProjects()` entirely and use server-fetched data everywhere. This is more work but cleaner.

**Recommended approach:**
1. Keep `useProjectsStore` for project list caching and the project selector
2. When user navigates to `/${projectId}/...`, the store syncs `selectedProjectId` from URL
3. In project-scoped pages, use the project from the server layout context, not from the store
4. The store is still used by the `ProjectSelector` to show the dropdown and trigger navigation

---

## 7. Additional Changes

### 7.1 `useTranslations` vs `getTranslations`

Server components must use `getTranslations` from `next-intl/server` instead of `useTranslations` from `next-intl`. The refactored reference page (`admin/templates/[id]/page.tsx`) currently uses `useTranslations` in a server component — this should be fixed to `getTranslations` as part of this refactoring.

### 7.2 `'use server'` Directive on Pages

The reference implementation and logbook page use `'use server'` at the top. This is technically for server actions, not server components. Server components are the default in the App Router — no directive is needed. Clean this up during refactoring (remove `'use server'` from page files; only keep it in action files).

### 7.3 Loading States

Currently, pages return `null` while loading. With server components:
- Create `loading.tsx` files for each route segment to show loading skeletons
- The server component will stream and show the loading state automatically
- Consider adding `loading.tsx` at the `[projectId]` level and for key sub-routes

### 7.4 Error Handling

- Create `error.tsx` boundary components for route segments
- Server component data fetching errors will be caught by error boundaries
- Add `not-found.tsx` for lender/loan detail pages when entity doesn't exist

### 7.5 Internal Links in Client Components

All client components that use `router.push()` or `<Link>` need their paths updated to include `projectId`. Affected components:
- `LenderPage` (`lender-page.tsx`) — links to loans, edit
- `LenderLoansTab` — links to loan edit, new loan
- `ConfigurationPage` — internal navigation
- `ProjectTemplatesTab` — links to template editor
- `LoanForm` — lender selector links
- All `DataTable` row actions and `onRowClick` handlers
- Dashboard home link cards

### 7.6 `proxy.ts` (Middleware)

The middleware may need an update to handle the new route structure:
- Authenticated users accessing `/` could redirect to `/${lastProjectId}/` or `/projects`
- The auth redirect (`/dashboard`) should redirect to the appropriate project URL

### 7.7 Remove TanStack Query for Server-Fetched Data

After migrating, the following `useQuery` calls can be removed from pages (data comes from server):
- `['dashboard-stats', projectId]` — dashboard page
- `['loans-by-project', projectId]` — dashboard page
- `['lenders', projectId]` — lenders list
- `['loans', projectId]` — loans list
- `['lender', lenderId]` — lender detail, lender edit
- `['loan', loanId]` — loan edit
- `['template', id]` — configuration template editor

**Keep TanStack Query** for:
- Data that is genuinely interactive/real-time
- Client-side mutations that need optimistic updates
- Any data re-fetching patterns within client components (e.g., `LenderPage` internal tabs if they refetch)

### 7.8 Session Checks

Many pages currently use `useSession()` client-side. With server components:
- Use `await auth()` on the server
- Session is already available from the dashboard layout
- Remove redundant `useSession()` checks from pages

---

## 8. Suggested Implementation Order

1. **Create `[projectId]/layout.tsx`** with project loading and `ProjectProvider` context
2. **Update navigation** — sidebar, project selector, to use URL-based projectId
3. **Update `proxy.ts`** — handle root redirect to default project
4. **Migrate simple pages first:**
   - `logbook` (already server component, just move + scope to project)
   - `configuration` (thin wrapper, quick win)
   - `configuration/templates/[id]` (follow admin template pattern)
5. **Migrate list pages:**
   - `lenders/page.tsx` → extract `LenderTable` client component
   - `loans/page.tsx` → extract `LoanTable` client component
6. **Migrate detail/edit/new pages:**
   - `lenders/[lenderId]` — straightforward, `LenderPage` already takes props
   - `lenders/[lenderId]/edit` → extract `EditLenderClient`
   - `lenders/new` → extract `NewLenderClient`
   - `loans/[loanId]/edit` → extract `EditLoanClient`
   - `loans/new` → extract `NewLoanClient`
7. **Migrate dashboard home** — extract `DashboardContent` client component
8. **Update all `revalidatePath` calls** in server actions
9. **Update all internal links** in client components
10. **Clean up:** Remove unused TanStack Query calls, `useProjects()` usage in pages, `useSession()` in pages
11. **Add `loading.tsx` and `error.tsx`** for key route segments
12. **Fix `'use server'` → remove from page files**, fix `useTranslations` → `getTranslations` in server components
13. **Test thoroughly** — project switching, navigation, data consistency, revalidation after mutations

---

## 9. Files to Create

| File | Purpose |
|------|---------|
| `src/app/[locale]/(dashboard)/[projectId]/layout.tsx` | Server layout — loads project, provides context |
| `src/components/providers/project-provider.tsx` | Client context provider for project data |
| `src/components/lenders/lender-table.tsx` | Client component — lender DataTable + columns |
| `src/components/loans/loan-table.tsx` | Client component — loan DataTable + columns |
| `src/components/dashboard/dashboard-content.tsx` | Client component — dashboard charts + stats |
| `src/components/lenders/edit-lender-client.tsx` | Client component — lender edit form + submission |
| `src/components/lenders/new-lender-client.tsx` | Client component — lender create form + submission |
| `src/components/loans/edit-loan-client.tsx` | Client component — loan edit form + submission |
| `src/components/loans/new-loan-client.tsx` | Client component — loan create form + submission |
| `src/app/[locale]/(dashboard)/[projectId]/loading.tsx` | Loading skeleton for project pages |

## 10. Files to Move/Refactor

| From | To |
|------|-----|
| `(dashboard)/page.tsx` | `(dashboard)/[projectId]/page.tsx` |
| `(dashboard)/lenders/page.tsx` | `(dashboard)/[projectId]/lenders/page.tsx` |
| `(dashboard)/lenders/new/page.tsx` | `(dashboard)/[projectId]/lenders/new/page.tsx` |
| `(dashboard)/lenders/[lenderId]/page.tsx` | `(dashboard)/[projectId]/lenders/[lenderId]/page.tsx` |
| `(dashboard)/lenders/[lenderId]/edit/page.tsx` | `(dashboard)/[projectId]/lenders/[lenderId]/edit/page.tsx` |
| `(dashboard)/loans/page.tsx` | `(dashboard)/[projectId]/loans/page.tsx` |
| `(dashboard)/loans/new/page.tsx` | `(dashboard)/[projectId]/loans/new/page.tsx` |
| `(dashboard)/loans/[loanId]/edit/page.tsx` | `(dashboard)/[projectId]/loans/[loanId]/edit/page.tsx` |
| `(dashboard)/configuration/page.tsx` | `(dashboard)/[projectId]/configuration/page.tsx` |
| `(dashboard)/configuration/templates/[id]/page.tsx` | `(dashboard)/[projectId]/configuration/templates/[id]/page.tsx` |
| `(dashboard)/logbook/page.tsx` | `(dashboard)/[projectId]/logbook/page.tsx` |

## 11. Risk Areas

- **Project selector navigation:** Switching projects now requires a full navigation, which may feel slower than the current instant Zustand switch. Mitigate with `router.push` + loading states.
- **Deep links / bookmarks:** URLs now contain projectId, which is better for sharing/bookmarking but existing bookmarks will break.
- **TanStack Query cache invalidation vs revalidatePath:** After mutations, `revalidatePath` will revalidate the server component data. Client components using TanStack Query for mutations will need `router.refresh()` or the query cache invalidation removed in favor of revalidation.
- **`LenderPage` internal data refetching:** `LenderPage` and its tabs (loans, notes, files) may still use TanStack Query for sub-resource fetching within the client component. This is fine — only the initial page load needs to be server-fetched.
