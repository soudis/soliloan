# UI conventions

## Stable layout when data loads

The UI holds still: content appears in its final place and stays there while data arrives. A layout shift under the user's eyes (a box appearing above the field they are reading, a hint pushing the buttons down) costs more than a short wait.

1. **Open once loaded.** A dialog, popover or panel whose content depends on fetched data opens only when its first data for the current input has arrived. Until then it stays closed; the user sees it appear complete. If that first load fails, it stays closed and the error is toasted.
2. **Keep the previous result while reloading.** When data reloads after user input (typing an amount, picking a date), keep the previous result on screen, dim it, and mark it `aria-busy`, until the new one replaces it. Use React Query's `keepPreviousData`; reserve spinners and empty states for content that has never loaded.
3. **Reserve known space.** When the size of content is known before its data (a fixed summary box, a table row), render it at that size from the start.

Reference implementation: the transaction modal. `useTransactionPreview` (`src/components/loans/use-transaction-preview.ts`) exposes `ready` once the first check for the opening has arrived and any input it triggers (preselecting the only possible type) is applied; `TransactionDialog` opens on `open && ready` and dims later updates with `isPending`.
