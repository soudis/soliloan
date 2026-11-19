/** Which rules a Zinsjahr is calculated with: the old ones before the project's Umstellungsjahr (ADR 0005). */
export type InterestRules = 'legacy' | 'corrected';

/** Has no dependencies, so the Import validation can use it in the browser. */
export const getInterestRules = (year: number, changeoverYear: number | null | undefined): InterestRules =>
  changeoverYear != null && year < changeoverYear ? 'legacy' : 'corrected';
