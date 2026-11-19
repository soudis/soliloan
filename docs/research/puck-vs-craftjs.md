# Puck as a replacement for Craft.js

Analysis of whether [Puck](https://puckeditor.com/docs) can replace Craft.js as the visual editor for Soliloan communication templates.

**Date:** 2026-08-20  
**Scope:** Communication templates only (`EMAIL` + `DOCUMENT`). Loan templates and the dashboard layout editor are unrelated and would stay as they are.

---

## Executive summary

Puck is a **viable** replacement for Craft.js, and it is a **better long-term fit** for React 19 / Next.js 16. It is **not a drop-in replacement**. The editor shell, block components, serialization, predefined-block cloning, and both production renderers would need to be rewritten against Puck’s data model.

What would *not* change in principle:

- Template types (email vs document), datasets, merge tags, mustache processing
- Persistence (`CommunicationTemplate.designJson` as JSON)
- The idea that production output is generated from stored JSON, not from the editor library itself

What *would* change:

- The JSON shape stored in `designJson`
- Every Craft.js-coupled React component (~editor UI + 7 blocks)
- The tree walkers in `email-generator.ts` and `design-to-pdf.tsx`
- Seeded system templates and existing user templates (one-time migration)

**Effort class:** rewrite of the editor + serializers, reuse of the domain layer. Roughly **4–8 weeks** for one developer who already knows this module, depending on how close the new UI and output must stay to today’s behaviour.

**Rendering:** Puck would not force a new email or PDF engine. Recipients only see a visual change if we change the HTML/PDF generators, not merely because we swapped the editor.

**Custom UI:** Puck’s default chrome is optional. Composition, custom fields, TipTap rich text, permissions, and overrides are first-class. Block option menus and a merge-tag selector can be rebuilt.

---

## How the current system actually works

Craft.js is used only for **communication templates**. The editor is a heavily customized Craft shell. Production sending/download **does not mount Craft.js**.

```
Editor (Craft.js + TipTap)
        │  query.serialize()
        ▼
CommunicationTemplate.designJson   (Craft flat node map)
        │
        ├── email-generator.ts  →  HTML  →  mustache  →  SMTP
        └── design-to-pdf.tsx   →  @react-pdf  →  PDF
```

This split is the most important architectural fact for a Puck evaluation:

1. Craft.js is the **authoring runtime** (drag-and-drop, selection, serialize/deserialize).
2. A **custom JSON walker** produces email-safe HTML (tables, inline styles, 600px wrapper, MSO-oriented output).
3. A **second custom walker** produces a `@react-pdf/renderer` tree for A4 documents (header / body / footer zones).

`htmlContent` is written on save and currently unused at send/download time. Runtime always uses `designJson`.

### Blocks

| Block | Role |
| --- | --- |
| Container | Canvas: vertical / horizontal / grid, loops via `loopKey` |
| Text | TipTap HTML + merge-tag pills |
| Button | URL or system-link merge tag |
| Image | Custom src or project logo |
| Table | Per-cell TipTap, optional `loopKey` for repeating rows |
| PageHeader / PageFooter | Document-only structural zones |

### Custom editor chrome (already not “stock Craft”)

- Right sidebar: toolbox, per-block settings, custom hierarchy ( `@craftjs/layers` is unused)
- Selection outline, label badge, custom drag handle
- Merge-tag dropdown with ancestor-loop filtering
- Sample-data selector and live preview (email iframe / document PDF)
- “Save as predefined block” (subtree extract + ID remap)
- Document canvas: fixed `ROOT` → `PAGE_HEADER` / `BODY` / `PAGE_FOOTER` (non-deletable)

### Why Craft.js is painful here

- Last core release: **2025-02-14** (`@craftjs/core@0.2.12`). Little activity since; open React 19 issues remain.
- Production build must use **webpack + Terser**. Turbopack / SWC minify breaks Craft drag-and-drop (`next.config.ts`, Docker comment).
- React Compiler is disabled, likely for the same class of issues.
- Component logic is duplicated in **three places**: editor React, HTML generator, PDF generator.

---

## What Puck is

Puck ([docs](https://puckeditor.com/docs)) is a MIT-licensed React visual editor. You register **your** components; Puck produces a JSON payload you store yourself. Same ownership model as Craft.js.

| | Craft.js (current) | Puck |
| --- | --- | --- |
| License | MIT | MIT |
| Model | Headless DnD framework; you build the whole UI | Editor + optional composition; you still own data |
| Data | Flat `nodeId → node` map, `{ resolvedName }` | `{ content, root, zones? }` with **slot** fields for nesting |
| Maintenance | Effectively stalled | Active (`@puckeditor/core` 0.23.x, npm update 2026-08) |
| React 19 | Claimed; remaining bugs | Official peer (`^18 \|\| ^19`) |
| Next.js | Works with workarounds | Official App Router recipe; used with Next 15/16 |
| Rich text | We wired TipTap ourselves | Built-in `richtext` field **on TipTap**, custom extensions supported |
| Nested layout | `isCanvas` + `linkedNodes` | [Slot fields](https://puckeditor.com/docs/integrating-puck/multi-column-layouts) (flex/grid) |
| Custom UI | You build everything | [Composition](https://puckeditor.com/docs/extending-puck/composition) + [overrides](https://puckeditor.com/docs/extending-puck/ui-overrides) + [custom fields](https://puckeditor.com/docs/extending-puck/custom-fields) |
| Lock zones | Custom structural IDs | [Permissions API](https://puckeditor.com/docs/integrating-puck/feature-toggling) (`delete`/`drag`/`duplicate` per instance) |

Puck is **not** an email builder or a PDF builder. It is a page editor that stores JSON. Email/PDF remain our job — which is already how Soliloan works.

There is community proof that Puck can drive emails (e.g. [payload-puck](https://delmaredigital.github.io/payload-puck/) uses table-based HTML + inline styles). We would not take that plugin; we would keep our own blocks and generators.

---

## 1. Effort: rewrite vs drop-in

**Drop-in replacement: no.**

Craft and Puck do not share a data format, component API, or editor primitives.

| Craft.js | Puck equivalent |
| --- | --- |
| `<Editor resolver={…}>` + `<Frame>` | `<Puck config={…} data={…}>` |
| `useNode` / `useEditor` / `connectors` | Config `render` + `createUsePuck()` |
| `Component.craft` + `related.settings` | `fields` on the component config |
| `query.serialize()` / `actions.deserialize()` | `data` / `onChange` / `onPublish` |
| Canvas + `linkedNodes` | Slot fields on props |
| Flat node map | Nested `content` + slot arrays (DropZone `zones` is deprecated) |

### What can be reused as-is (or with small adapters)

These are the domain layer, not the editor library:

- Merge-tag catalog, datasets, insertion filter, mustache `template-processor.ts`
- `template-data.ts` (building merge objects from Prisma)
- Sample-data selector, logo context, metadata forms, list/dialog, send/download APIs
- Prisma models (`CommunicationTemplate`, datasets, template types) — `designJson` stays `Json`
- PDF shell (`generate-template-pdf.ts`, fonts, ImageMagick for WebP)
- TipTap merge-tag extension and bubble menu (can be plugged into Puck’s richtext field)

### What must be rewritten

| Area | Why | Size today (order of magnitude) |
| --- | --- | --- |
| Editor shell | Craft `Editor`/`Frame`/`RenderNode` | `template-editor-view.tsx` ~685 lines |
| Sidebar / toolbox / hierarchy / settings | Craft hooks | ~700 lines combined |
| 7 user blocks | `useNode`, `craft` config | ~3.5k lines (table + container dominate) |
| HTML generator | Walks Craft node map | `email-generator.ts` ~685 lines |
| PDF generator | Same | `design-to-pdf.tsx` ~1.1k lines |
| Predefined blocks | `craft-subtree.ts` ID remap | ~125 lines + toolbox insert |
| System template JSON | Craft-shaped seeds | 7 files under `prisma/system-template-designs/` |
| Existing DB rows | All `designJson` + predefined blocks | one-time migration script |

### Suggested migration shape (not a drop-in)

1. **Spike (a few days):** Puck editor with Container + Text, 600px viewport, save/load JSON, confirm production webpack/Turbopack minify does not break DnD. This is the go/no-go for the build pain we actually have.
2. **Port blocks + custom chrome** onto Puck composition (`Puck.Preview` / `Puck.Fields` / `Puck.Components` / `Puck.Outline`).
3. **Rewrite JSON walkers** for Puck’s slot tree (keep HTML and PDF *look* stable).
4. **Migration script:** Craft node map → Puck `Data`. Dual-read for a while if needed.
5. **Remove Craft**, Terser workaround, and unused `@craftjs/layers`. Re-test Turbopack production build.

### Effort estimate

| Scope | Estimate |
| --- | --- |
| Spike + build verification | 2–4 days |
| Editor + blocks + chrome at current UX fidelity | 2–4 weeks |
| HTML + PDF walker rewrite + visual parity tests | 1–2 weeks |
| Data migration + system templates + predefined blocks | 3–7 days |
| Polish, email-client checks, PDF regression | 1 week |

**Total: about 4–8 weeks** for one developer familiar with this module.

Shorter if we accept Puck’s default sidebar and a looser visual match. Longer if we demand pixel-identical output across Outlook / Gmail / PDF and keep every current UX quirk (per-cell table editing, loop pills, save-as-block, structural zones).

This is **not** “swap the npm package.” It is also **not** a greenfield product rewrite: send/download, merge data, and Prisma stay.

---

## 2. Would Puck work for email templates *and* document templates?

**Yes.** Puck does not care about the output medium. We already treat the editor as an authoring UI over JSON; email HTML and PDF are separate backends.

### Email

| Need | Puck support |
| --- | --- |
| 600px canvas | Viewports, or wrap `Puck.Preview` at 600px ([viewports](https://puckeditor.com/docs/integrating-puck/viewports); under composition, size the wrapper) |
| Nested columns | Slot fields + flex/grid |
| Inline TipTap + merge tags | Built-in richtext + our TipTap extension, or keep a custom Text component |
| Email-safe HTML (tables, inline CSS) | **Not provided.** Keep `email-generator.ts` (rewritten for Puck data), or render email-safe React with `renderToStaticMarkup` |

Naively rendering Puck components to HTML (`renderToStaticMarkup(<Render />)`) would emit `div`s unless every block is written as tables. That is unsafe for Outlook. **Do not use Puck’s default React tree as the email payload.** Keep a dedicated HTML generator — same as today.

### Documents

| Need | Puck support |
| --- | --- |
| A4 preview (~794×1123px) | Viewport / wrapper sizing (already how Craft is framed) |
| Locked header / body / footer | Root with three slots + [permissions](https://puckeditor.com/docs/integrating-puck/feature-toggling) (`delete: false`, `drag: false` on structural components) |
| Repeating header/footer in PDF | Still our `@react-pdf` logic, not Puck |
| Page numbers as merge tags | Unchanged (`template-processor`) |

Puck has no PDF engine. Documents stay “JSON → `design-to-pdf.tsx` → `@react-pdf`” unless we later switch to HTML-to-PDF.

**Same editor, two configs** (email vs document) is the natural Puck approach: different root slots, viewports, and allowed blocks (no PageHeader/Footer on email).

---

## 3. Would output change email and document rendering completely?

**No, not necessarily.** Swapping the editor does not by itself change what lenders receive.

Three layers:

| Layer | Changes if we move to Puck? |
| --- | --- |
| Stored JSON (`designJson`) | **Yes.** Craft map ≠ Puck `Data`. Migration required. |
| Production HTML / PDF engines | **Only if we rewrite them.** Recommended: rewrite the *walker*, keep the *HTML/PDF primitives* (table markup, inline styles, react-pdf components). |
| What recipients see | **Unchanged** if the generators keep the same CSS/table/PDF mapping. **Changed** if we switch to “Puck React → static HTML” or HTML-to-PDF. |

### Recommended rendering strategy after Puck

Keep the current two-backend model:

1. **Editor preview (email):** generate HTML from Puck JSON with the same generator used for send (today’s iframe `srcDoc` pattern).
2. **Editor preview (document):** POST Puck JSON to `/api/templates/pdf` (today’s blob preview).
3. **Send / download:** same generators + `processTemplate()` mustache.

That avoids WYSIWYG vs production drift.

Optional later (not required for a first migration):

- Email: one set of table-based React components used by both Puck `render` and `renderToStaticMarkup` — collapses editor vs HTML duplication, still not “Puck default output.”
- Documents: HTML-to-PDF instead of `@react-pdf` — larger visual risk; only worth it if we want to drop the PDF walker.

`htmlContent` can stay a snapshot or be dropped; it is not on the send path today.

### Existing templates

All project, global, system, and predefined-block `designJson` values are Craft-shaped. Shipping Puck without a migrator would empty the canvas for existing rows.

Migration is mechanical (tree transform) but needs tests against the seven seeded designs and a sample of real project templates. Plan a dual-read period or a one-shot convert-on-load.

---

## 4. Can we still have a customized editor (block menus, merge tags, …)?

**Yes. Puck is not a fixed UI.** Custom chrome is a documented product feature, not a hack.

### Composition ([docs](https://puckeditor.com/docs/extending-puck/composition))

Ignore Puck’s default header/drawer layout and assemble:

- `Puck.Preview` — canvas
- `Puck.Components` / `Drawer` — toolbox
- `Puck.Fields` — selected-block settings
- `Puck.Outline` — hierarchy (can replace our custom tree)

We can keep the current “canvas + right sidebar with toolbox / settings / hierarchy” layout.

### Custom fields ([docs](https://puckeditor.com/docs/extending-puck/custom-fields))

Anything that is not a stock text/select/number field:

- Merge-tag picker (reuse `merge-tag-dropdown.tsx`)
- Loop key selector on Container/Table
- Padding / border controls
- Logo vs custom image
- System URL vs free URL on Button
- “Save as predefined block”

### Rich text ([docs](https://puckeditor.com/docs/integrating-puck/rich-text-editing))

Puck’s `richtext` field is TipTap. We can add our merge-tag extension and a custom menu control. That is a better fit than Craft, where TipTap had to fight Craft’s pointer events (`stopPropagation` on the text block).

Table cells would still be a **custom component** (Puck has no “spreadsheet of richtext cells”). Port `table.tsx` as a Puck component with a custom field UI.

### Permissions ([docs](https://puckeditor.com/docs/integrating-puck/feature-toggling))

Replace hard-coded `STRUCTURAL_NODE_IDS`:

- Header/footer/root: `delete: false`, `duplicate: false`, optionally `drag: false`
- Email vs document: `insert` / `allow` on slots so PageHeader cannot land in an email

### Overrides ([docs](https://puckeditor.com/docs/extending-puck/ui-overrides))

Selection overlay, action bar (duplicate/delete), drawer items, field chrome. Marked **experimental** — prefer composition for layout, overrides for small chrome.

### What we would *not* get for free

- Merge-tag loop context walking the ancestor tree (rewrite against Puck slots / `walkTree`)
- Predefined-block extract/clone (rewrite; Puck slots are actually *easier* here because a subtree is a portable `ComponentData` array)
- Sample-data toolbar (our component, placed next to `Puck.Preview`)
- Per-cell table editing (custom, as today)

**Bottom line:** the editor can look and behave like the current one. Puck does not lock us into its default CMS-like chrome.

---

## Risks and caveats

1. **Overrides API is experimental** — don’t bet core layout on it; use composition.
2. **Puck wraps components in a `div` by default.** Email-like flex/grid children need `inline: true` + `puck.dragRef`. Easy to get wrong and then “preview ≠ email.”
3. **Iframe viewports** are on by default. TipTap, merge-tag popovers, and our sidebar must be tested inside/outside the iframe (`iframe={{ enabled: false }}` is allowed).
4. **Two TipTap integrations** (ours vs Puck richtext) could fight on version/extensions. Prefer one path: Puck richtext + our extension, or keep our editor as a custom field and disable Puck richtext.
5. **Triple implementation remains** unless we later unify email React + HTML. Puck does not magically delete `email-generator` / `design-to-pdf`.
6. **Build fix is probable, not proven.** The spike in phase 1 must confirm DnD under `next build` (webpack today, Turbopack if we try to drop the Terser hack).
7. **Puck AI** is a commercial Cloud add-on. Irrelevant to replacing Craft unless we explicitly want generative layout later.

---

## Recommendation

**Adopt Puck if** the Craft minify / React 19 issues are accepted as ongoing cost, and we can spend a dedicated sprint series on the template module.

**Do not expect a drop-in.** Budget a focused rewrite of the authoring layer and JSON walkers, plus a `designJson` migrator. Keep merge tags, mustache, SMTP, and PDF download.

**Keep production rendering as custom walkers** for the first version so emails and PDFs stay visually stable. Treat “render Puck React to HTML” as a later simplification, not as the migration strategy.

**Keep the customized editor** via Puck composition + custom fields. That matches how this app already uses Craft (framework, not stock UI).

If the only urgent problem is the production minifier, a smaller alternative is to isolate Craft in its own chunk / disable minify for that module — that buys time but does not fix maintenance.

---

## Open questions

These change effort and whether rendering stays stable:

1. **Output fidelity** — Must new emails/PDFs match current output pixel-for-pixel (Outlook/Gmail + A4), or is a controlled visual refresh acceptable while migrating?
2. **Existing data** — How many live `CommunicationTemplate` / `PredefinedCraftBlock` rows are in production? Is a one-shot migrator OK, or do we need convert-on-read for mixed Craft/Puck JSON?
3. **Editor UX fidelity** — Is today’s chrome (tabs, custom selection handles, hierarchy rename, save-as-block) a hard requirement, or can we start from Puck’s default UI and restyle?
4. **Preview vs production** — Should the email canvas stay “approximate layout” with a separate HTML preview (today), or should the canvas itself be table-based so WYSIWYG is the email?
5. **Documents** — Keep `@react-pdf` long term, or is HTML-to-PDF on the table after the editor move?
6. **Table editing** — Is per-cell TipTap + looped rows still required, or would a simpler repeating-table (header + one row template) be enough?
7. **Loops** — Are nested loops on Container *and* Table both in real use? Nested slots + mustache is the trickiest mapping.
8. **Build goal** — Is the success criterion “Puck works with current webpack+Terser,” or “we can drop the Terser workaround and build with Turbopack”?
9. **Puck AI / Cloud** — Any interest, or open-source editor only?
10. **Timeline** — Is this a next-quarter project, or do we need a minimal spike first and stay on Craft until then?
