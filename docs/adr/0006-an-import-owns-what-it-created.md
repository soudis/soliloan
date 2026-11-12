# An Import only creates, is all or nothing, and can be deleted as a whole

An Import only creates new Kreditgeber*innen, Kredite, Zahlungen and notes; it never updates or reuses records that already exist in the project (a likely duplicate is a warning). It runs in one database transaction and only when no row has an error. Every record it creates belongs to it, so deleting the Import deletes all of them, including everything added to them afterwards (Zahlungen, notes, files), after a confirmation that lists that later data. User accounts are only deleted if the Import created them and nothing else uses them. The deleted Import stays in the list with who deleted it and when. The logbook gets one entry for the Import and one for its deletion, not one per record.

We chose this because the predecessor app imported row by row without a transaction: failed rows were skipped, a Kredit could be saved without its Einzahlung, and a failed import had to be cleaned up record by record.

## Considered options

- Matching rows to existing Kreditgeber*innen and updating them. Deleting such an Import could not tell which data it owns.
- Blocking the deletion once data was added to imported records. A wrong Import is often only noticed after a few days, and the manager would be back to manual cleanup.

## Consequences

- Emails sent to imported Kreditgeber*innen cannot be undone; the delete confirmation says so. The Import itself sends no emails or invitations.
- Correcting an Import means deleting it and importing a corrected file.
