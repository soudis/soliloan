# Domain docs

How skills (`grill-with-docs`, `domain-modeling`, `code-review-matt`) and agents consume the domain documentation. Single-context repo.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root: the project language (German domain terms such as Kredit, Kreditgeber*in, Zahlung).
- **`docs/adr/`**: ADRs that touch the area you are about to work in.

If a file does not exist, proceed silently.

## Use the glossary's vocabulary

When output names a domain concept (issue title, PR, test name, UI copy), use the term as defined in `GLOSSARY.md` and not the synonyms listed under _Avoid_. A concept missing from the glossary is either invented language (reconsider) or a real gap: raise it for `domain-modeling` rather than coining a term silently.

## Flag ADR conflicts

If a change contradicts an ADR, say so explicitly ("Contradicts ADR 0003, but worth reopening because ...") instead of silently overriding it. ADR numbers are unique: take the next free number in `docs/adr/` (check open branches for the same number).

## Where things live

```
GLOSSARY.md
docs/adr/NNNN-slug.md
docs/agents/          ← agent workflow docs (this folder)
```
