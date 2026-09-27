/**
 * Minimum accepted password length.
 *
 * One number, shared by signup, the in-app change-password form and the admin
 * reset form. These used to disagree (6 on signup, 8 everywhere else), which
 * let an athlete pick a 6-character password that their own settings screen
 * would then refuse to let them reuse.
 */
export const MIN_PASSWORD_LENGTH = 8;

/** Human-readable rule, for hints and inline errors. */
export const PASSWORD_RULE_MESSAGE = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

/** True when the password satisfies {@link MIN_PASSWORD_LENGTH}. */
export const meetsPasswordPolicy = (value: string): boolean =>
  value.length >= MIN_PASSWORD_LENGTH;
