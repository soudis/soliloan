# The Zinsübertrag is a stored Zahlung, not calculated interest

An Import opens each Kredit on its Stichtag with two Zahlungen: an Einzahlung of the Einlagenstand and a Zinsübertrag of the Kontostand minus the Einlagenstand. All other interest in SoliLoan is calculated from the Zahlungen and never stored, so the Zinsübertrag is the only stored interest. It gets its own Zahlungsart instead of reusing `INTEREST`, which marks the calculated yearly rows: those are hidden by the Zahlungen filters, cannot be deleted, and a stored `INTEREST` row would be counted on top of the calculated interest.

The Zinsübertrag raises the Kontostand. With a compounding Zinsmethode it earns interest; with a non-compounding one it does not, just like interest that stays in a Kredit under that method. It counts towards the lifetime interest of a Kredit, so the lifetime figures add up to the Kontostand, but never towards the interest of a year: the previous system already reported that interest in its Kontomitteilungen and Zinsbescheinigungen.

## Considered options

- Booking the whole Kontostand as one Einzahlung, as the predecessor app did. The Einlagenstand would then include interest and could exceed the Kreditbetrag, and non-compounding Kredite would earn interest on interest.
- Importing the full history of Zahlungen and letting SoliLoan recalculate the interest. Projects often do not have that history, and a recalculation can differ from the interest the old system reported.

## Consequences

- A Stichtag other than 31 December leaves the interest between 1 January and the Stichtag out of that year's figures. The Import warns about it but does not block.
- The Zinsübertrag is not offered in the manual Zahlung form. It can be deleted like any other Zahlung.
- The yearly interest payout pays out an unpaid Zinsübertrag together with the interest of its Stichtag year, and the Benachrichtigung for open interest counts it there too. A Kredit whose last year's interest was still owed on the Stichtag therefore gets it with the regular payout, without a manual Zinsauszahlung.
