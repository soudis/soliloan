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

**Kontomitteilung**:
A yearly document for one Kreditgeber*in listing their Kredite, Zahlungen and interest for one year.
_Avoid_: Kontoauszug, loan statement

**Bagatellgrenze**:
The limit under § 2 VermAnlG (at most 20 units, or €100,000 within twelve months) up to which an Anlageart needs no prospectus.
_Avoid_: VermAnlG-Limit

### Interest

**Zinsmethode**:
The rule in a Kreditvertrag for how interest is calculated: how Zinstage are counted, how many days the year has, and whether interest earns interest.
_Avoid_: Zinsberechnungsmethode, interest method

**Zinstag**:
One day on which an amount earns interest. The day money arrives counts, the day it leaves does not. Plural: Zinstage.
_Avoid_: Verzinsungstag

**Zinsjahr**:
A calendar year for which a Kredit's interest is worked out and booked.
_Avoid_: Abrechnungsjahr

**Umstellungsjahr**:
The first Zinsjahr in which a project's interest follows the corrected calculation rules; earlier Zinsjahre keep the rules they were booked with.
_Avoid_: Stichtag, Cutoff

### Accounting

**Jahresliste**:
The list of all Zahlungen and Zinserträge of all Kredite in a project for one calendar year, with totals, prepared for the accountant.
_Avoid_: Buchhaltungsexport, XLS-Export, Jahresabschluss

**Zinsertrag**:
The interest a Kredit earns in one Zinsjahr, including any Zinskorrektur.
_Avoid_: Zinsgutschrift, Zinsen

**Kontomitteilung**:
The yearly statement to one Kreditgeber*in of the balances, Zahlungen and Zinserträge of their Kredite for one calendar year. Plural: Kontomitteilungen.
_Avoid_: Jahreskontomitteilung, Kontoauszug, Jahresmitteilung

**Export**:
A file generated from a project's data for one calendar year, either a Jahresliste or the Kontomitteilungen of all its Kreditgeber*innen, and kept unchanged as a record of what was handed out. Plural: Exporte.
_Avoid_: Download, Bericht, Auswertung

### Import

**Import**:
One run that creates Kreditgeber*innen, Kredite and their opening Zahlungen from a file. An Import owns everything it created and can be deleted as a whole.
_Avoid_: Import-Lauf, Upload

**Importstichtag**:
The day of an imported Kredit's opening Kontostand and Einlagenstand.
_Avoid_: Stichtag, Importdatum, cut-off date

**Zinsübertrag**:
A Zahlung, created by an Import, that carries the interest accrued before the Importstichtag into a Kredit. It raises the Kontostand but not the Einlagenstand. It is no Zinsertrag; it is paid out with the yearly interest of its Importstichtag's year.
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
