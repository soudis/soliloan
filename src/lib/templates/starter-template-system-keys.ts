/**
 * Keys for global system templates used as design/subject defaults when creating
 * new EMAIL / DOCUMENT templates. Hidden from send/download quick-action menus.
 * Safe to import from client components (no DB).
 */
export const STARTER_TEMPLATE_SYSTEM_KEYS = ['defaultEmail', 'defaultDocument'] as const;

/**
 * Starter templates that have no per-project override UI.
 * `defaultEmail` is listed with other system templates so projects can customize it.
 */
export const PROJECT_HIDDEN_STARTER_TEMPLATE_SYSTEM_KEYS = ['defaultDocument'] as const;
