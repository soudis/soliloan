# The Zahlungen of a closed Kredit are frozen

Once a Kredit has an Abschlusszahlung (Rückzahlung or Erlassung), no Zahlung before it can be created, edited or deleted. The validator rejects any change that alters the Abschlussdifferenz of an Abschlusszahlung other than the one being edited (`CLOSING_CHANGED`), by more than 0.01 €. Together with ADR 0003 this makes everything but the Abschlusszahlung itself immutable. To correct an earlier Zahlung the manager deletes the Abschlusszahlung, fixes the Zahlung and books the Abschlusszahlung again.

ADR 0002 accepted a stale closing amount as a warning, so a manager could delete a partial withdrawal or change its amount and silently leave the Rückzahlung wrong. We now reject that. We rejected recalculating and rewriting the booked Abschlusszahlung inside the same save, because that silently changes a booked payout, and we kept the warning with a "Neu berechnen" button for editing the Abschlusszahlung itself, which is also how a Rückzahlung with a legacy difference gets corrected.

## Consequences

- Every path that uses the validator follows: the modal, edit, delete, bulk delete, GoCardless import and yearly payouts.
- A Kredit that already has a difference stays editable as long as a change does not alter that difference.
- The list disables "Bearbeiten" and "Löschen" for the frozen Zahlungen and "+ Zahlung" for a closed Kredit, each with a tooltip.
