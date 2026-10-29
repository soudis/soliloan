# Validate transactions by replaying the whole ledger, and allow any date

A Zahlung can be created, edited or deleted at any date. Every change is checked by one pure function that takes the Kredit and the proposed list of Zahlungen, replays them day by day, and verifies that the Einlagenstand never exceeds the Kreditbetrag, the Kontostand never goes below zero, and every Teilrückzahlung and Teilerlassung stays below the Kontostand of its day. Create, edit and delete are the same check on a different list, and every write path (modal, interest payouts, GoCardless import) runs it again on the server.

We rejected an append-only ledger (new Zahlungen only after the latest one). It would make the checks trivial, but several projects need to book and correct Zahlungen in the past, and the previous per-field UI checks (disabled types, date limits) could not express limits that depend on later Zahlungen, which caused #207.

## Consequences

- A change is only blocked for violations it introduces. Kredite that already violate a rule stay editable.
- Future dates are allowed and only warned about, so a Rückzahlung can be booked before the bank transfer happens.
- Changes that alter the interest or the year-end Kontostand of an earlier calendar year show a warning, they are not blocked.
- On one day, Einzahlungen are replayed first, then the other types, then a closing Zahlung. A Zahlung created after a Rückzahlung or Erlassung of the same day (its id sorts after) is replayed after it, so a new Einzahlung on the day of a Rückzahlung reopens the Kredit instead of changing the repaid amount. The calculation uses the same order (`sortTransactions`).
