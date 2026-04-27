import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { locales, defaultLocale, LOCALE_COOKIE, type Locale } from "./config";

export default getRequestConfig(async () => {
  const store = await cookies();
  const cookieValue = store.get(LOCALE_COOKIE)?.value as Locale | undefined;
  const locale: Locale =
    cookieValue && locales.includes(cookieValue) ? cookieValue : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
