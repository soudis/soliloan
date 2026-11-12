---
status: partly superseded by ADR-0004
---

# Tolerate the Abschlussdifferenz instead of blocking or rewriting it

A Rückzahlung or Erlassung stores a fixed amount, but changes to earlier Zahlungen move the Kontostand it was meant to zero. We warn about the Abschlussdifferenz (direction and size) and offer a "Neu berechnen" button when the closing Zahlung itself is edited. If the user saves anyway, the Zinskorrektur adds the difference to the interest of the closing year so the Kontostand ends at zero, which is how existing data with slightly different closing amounts already behaves.

We rejected blocking the change, because legacy data already contains such differences, and rewriting the stored amount automatically, because that silently changes a booked payout.

## Consequences

- The "never below zero" rule does not apply to closing Zahlungen; their difference is reported instead.
- A large Abschlussdifferenz distorts the interest shown for the closing year, so it is always surfaced to the user.
- Since ADR 0004, only the Abschlusszahlung being edited may differ from the Kontostand. A change to any other Zahlung of a closed Kredit that alters the Abschlussdifferenz is rejected instead of warned about.
