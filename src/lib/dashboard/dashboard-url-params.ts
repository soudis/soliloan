import { parseAsBoolean } from 'nuqs/server';

/** Search param that loads the full dashboard dataset for the layout customizer. */
export const DASHBOARD_CUSTOMIZE_KEY = 'customize';

export const dashboardCustomizeParser = parseAsBoolean.withDefault(false);
