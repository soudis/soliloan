# A Rückzahlung or Erlassung is final: a new Kredit instead of reopening

No Zahlung can be booked after a Rückzahlung or Erlassung of a Kredit, not even a new Einzahlung. The validator reports every such Zahlung as `AFTER_CLOSING` (only violations a change introduces block it, so Kredite that already have one stay editable). Managers create a new Kredit that starts fresh for these cases.

The ledger validator could handle a Kredit that is funded again, but the interest calculation cannot: an Einzahlung in the same year as the Rückzahlung is cancelled by the correction that makes a closed Kredit end at zero (the balance stays 0 and the interest becomes negative), and in a later year the interest after the repayment date keeps accruing, which leaves a phantom balance. Yearly interest payouts, the dashboard history and the templates read the same calculation. Supporting a reopened Kredit would mean calculating each repayment period on its own and summing the yearly and monthly figures, which we decided not to do for now.

## Consequences

- The modal shows one notice for a closed Kredit and disables every type; payments before the Rückzahlung can still be booked (the Abschlussdifferenz warning applies).
- Deleting the Rückzahlung or Erlassung makes the Kredit bookable again.
