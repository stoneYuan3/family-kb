export const locales = ["zh-Hant", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "zh-Hant";
export const LOCALE_COOKIE = "NEXT_LOCALE";
