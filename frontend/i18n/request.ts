import { getRequestConfig } from "next-intl/server";

// Single-locale setup for now: Thai UI labels, structure ready for
// English later (messages/en.json already exists).
export default getRequestConfig(async () => {
  const locale = "th";

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
