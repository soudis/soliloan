# Corrected interest rules apply from a project's Umstellungsjahr

Interest is not stored: it is recalculated from the Zahlungen every time. The rules inherited from habidat-direktkredit lose or add a Zinstag in some cases (#231). They also let a part of a Zinsjahr earn more than a full Zinsjahr under ACT/360 and under ACT/365 in leap years. Fixing the rules everywhere would change the interest of Zinsjahre that projects have already booked, paid out and reported to their Kreditgeber\*innen. So each project has an Umstellungsjahr. Zinsjahre before it keep the old rules, errors included. Zinsjahre from it on use the corrected rules.

- Projects that exist when the change ships get the year after the deployment as their Umstellungsjahr. Projects imported from habidat-direktkredit get the year after the import. New projects use the corrected rules from the start.
- Under the corrected rules a Zinstag runs from one calendar date to the next. The day money arrives counts, and the day it leaves does not. A full Zinsjahr always earns exactly the interest rate. An amount held for part of a Zinsjahr earns at most that much, so under ACT/360 the Zinstage are capped at 360 and under ACT/365 at 365.
- The switch happens only at the start of a Zinsjahr. Every amount's Zinstage within one Zinsjahr are therefore counted under a single set of rules.

## Considered options

- **Fix all years.** Rejected: it rewrites booked interest, and the yearly statements and payouts would no longer match the ledger.
- **Strict ACT/360 for full years (365/360 of the rate).** Rejected: Kreditgeber\*innen read "2 % p.a." as 2 % for a full year.
