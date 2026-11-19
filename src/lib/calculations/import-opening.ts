/** The opening Zahlungen an Import books on a Kredit's Importstichtag (ADR 0010), in euros to the cent. */
export type ImportOpeningZahlungen = {
  /** Einzahlung of the Einlagenstand. */
  einzahlung: number;
  /** Zinsübertrag: the Kontostand minus the Einlagenstand, the interest accrued before the Importstichtag. */
  zinsuebertrag: number;
};

const toCents = (euros: number) => Math.round(euros * 100);

/**
 * Splits an imported Kontostand into the Einzahlung of the Einlagenstand and the Zinsübertrag of the rest. Works in
 * whole cents, so 0.1 + 0.2 style float errors cannot leave a Zinsübertrag of a fraction of a cent. Runs in the
 * browser too (the Import preview), so it does not use Prisma's Decimal.
 */
export function importOpeningZahlungen(kontostand: number, einlagenstand: number): ImportOpeningZahlungen {
  const kontostandCents = toCents(kontostand);
  const einlagenstandCents = toCents(einlagenstand);
  return {
    einzahlung: einlagenstandCents / 100,
    zinsuebertrag: (kontostandCents - einlagenstandCents) / 100,
  };
}
