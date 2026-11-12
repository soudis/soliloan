# Exporte are snapshots; past years stay editable

A Jahresliste or the Kontomitteilungen of a year are stored as an Export: the generated file is kept unchanged, together with who generated it and when, and can never be overwritten or deleted. Generating the same year again adds a new Export next to the old one. We do not lock a year once it has been exported: Zahlungen in that year can still be booked or corrected, and the next Export shows the result, while the earlier ones show what was handed out before the correction.

## Considered options

- **Lock a year once it is exported.** Rejected for now: it needs its own rules for correcting Zahlungen after the fact (unlocking, who may do it, what happens to Abschlusszahlungen) and would block managers from fixing legacy data. The stored Exporte already make every later change visible.
- **Regenerate on demand without storing.** Rejected: nobody could show afterwards which figures were handed to the accountant or to a Kreditgeber*in.

## Consequences

- A Kreditgeber*in's self-service Kontomitteilung is rendered from the current data, so after a correction it can differ from the one in the stored Export. That is expected.
- An Export of the current year is marked vorläufig.
