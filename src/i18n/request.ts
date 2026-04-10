import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';

import ar from '../messages/ar.json';
import fr from '../messages/fr.json';
import en from '../messages/en.json';

const messages: Record<string, typeof ar> = { ar, fr, en };

export default getRequestConfig(async ({requestLocale}) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: messages[locale]
  };
});
