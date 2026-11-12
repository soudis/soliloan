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

**Anlageart**:
A category of Kredite grouped for compliance with the Bagatellgrenze, identified by its interest rate.
_Avoid_: Anlageform

**Bagatellgrenze**:
The limit under § 2 VermAnlG (at most 20 units, or €100,000 within twelve months) up to which an Anlageart needs no prospectus.
_Avoid_: VermAnlG-Limit

### Import

**Import**:
One run that creates Kreditgeber*innen, Kredite and their opening Zahlungen from a file. An Import owns everything it created and can be deleted as a whole.
_Avoid_: Import-Lauf, Upload

**Stichtag**:
The day of an imported Kredit's opening Kontostand and Einlagenstand.
_Avoid_: Importdatum, cut-off date

**Zinsübertrag**:
A Zahlung, created by an Import, that carries the interest accrued before the Stichtag into a Kredit. It raises the Kontostand but not the Einlagenstand, and it is not interest of any year.
_Avoid_: Anfangszinsen, initial interest

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
