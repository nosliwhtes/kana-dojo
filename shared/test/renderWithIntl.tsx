import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import common from '@/core/i18n/locales/en/common.json';
import conjugator from '@/core/i18n/locales/en/conjugator.json';
import resources from '@/core/i18n/locales/en/resources.json';

/** Render with the real message provider used by client components. */
export function renderWithIntl(ui: React.ReactNode, options?: RenderOptions) {
  return render(ui, {
    wrapper: ({ children }) => (
      <NextIntlClientProvider
        locale='en'
        timeZone='UTC'
        messages={{ common, conjugator, resources }}
      >
        {children}
      </NextIntlClientProvider>
    ),
    ...options,
  });
}
