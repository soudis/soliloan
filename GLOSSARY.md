# SoliLoan

SoliLoan is the context for running a direct-credit (Direktkredit) project: the people, contracts, and money in that project, and the emails and documents generated from them.

## Language

### Credit

**Kredit**:
A loan in a direct-credit project.
_Avoid_: Darlehen

**Kreditgeber*in**:
A person or organization that provides a Kredit. Plural: Kreditgeber*innen.
_Avoid_: Darlehensgeber, Kreditgeber

**Kreditvertrag**:
The contract for one Kredit.
_Avoid_: Darlehensvertrag

**Kreditbetrag**:
The principal amount of a Kredit.
_Avoid_: Darlehensbetrag

### Payments

**Zahlung**:
One booking on a Kredit: money paid in, paid out, or waived.

**Einzahlung**:
A Zahlung where the Kreditgeber*in pays money into the Kredit.

**Teilrückzahlung**:
A Zahlung where part of the Kontostand is paid back to the Kreditgeber*in. It is always smaller than the Kontostand on its day.

**Rückzahlung**:
A Zahlung that pays back the whole Kontostand and closes the Kredit.

**Teilerlassung**:
A Zahlung where the Kreditgeber*in waives part of the Kontostand. It is always smaller than the Kontostand on its day.

**Erlassung**:
A Zahlung where the Kreditgeber*in waives the whole Kontostand and closes the Kredit.

**Zinsauszahlung**:
A Zahlung that pays out accrued interest without touching the paid-in capital.

**Kontostand**:
What is owed to the Kreditgeber*in on a given day: paid-in capital plus accrued interest, minus everything paid back, waived, or paid out as interest. It never goes below zero.
_Avoid_: Saldo

**Einlagenstand**:
The capital paid in on a given day, without interest: Einzahlungen minus Teilrückzahlungen minus Teilerlassungen. It never exceeds the Kreditbetrag.

**Abschlussdifferenz**:
The amount of a Rückzahlung or Erlassung minus the Kontostand on its day. A difference of one cent or less is ignored.

**Zinskorrektur**:
The Abschlussdifferenz added to the interest of the closing year, so that the Kontostand ends at zero.
**Anlageart**:
A category of Kredite grouped for compliance with the Bagatellgrenze, identified by its interest rate.
_Avoid_: Anlageform

**Bagatellgrenze**:
The limit under § 2 VermAnlG (at most 20 units, or €100,000 within twelve months) up to which an Anlageart needs no prospectus.
_Avoid_: VermAnlG-Limit

### Dashboard

**Benachrichtigung**:
A condition in a Direktkredit project that the person running the project should look at. Plural: Benachrichtigungen.
_Avoid_: Benachrichtigungsart

**Benachrichtigungsart**:
How a Kreditgeber*in is contacted: online, email, or post.
_Avoid_: Benachrichtigung

### Template blocks

**Bedingung**:
Whether a template block is shown. An empty Bedingung means the block is always shown.
_Avoid_: Filter

**Regel**:
One criterion inside a Bedingung. The block is shown only when every Regel matches.
_Avoid_: Filter
