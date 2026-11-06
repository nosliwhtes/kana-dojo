import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { renderWithIntl as render } from '@/shared/test/renderWithIntl';
import es from '@/core/i18n/locales/es/conjugator.json';
import * as fc from 'fast-check';
import SEOContent from '../components/SEOContent';
import type { VerbInfo } from '../types';

afterEach(cleanup);

// The 2026-02 minimalist redesign retired the form catalog, tips and SEO
// filler. Keep the actual learning and accessibility contract under test.
const verbs: VerbInfo[] = [
  {
    dictionaryForm: '書く',
    reading: 'かく',
    romaji: 'kaku',
    type: 'godan',
    stem: 'か',
    ending: 'く',
  },
  {
    dictionaryForm: '食べる',
    reading: 'たべる',
    romaji: 'taberu',
    type: 'ichidan',
    stem: 'たべ',
    ending: 'る',
  },
  {
    dictionaryForm: 'する',
    reading: 'する',
    romaji: 'suru',
    type: 'irregular',
    stem: '',
    ending: 'する',
    irregularType: 'suru',
  },
];

describe('concise conjugator learning help', () => {
  it('names its section using the main heading', () => {
    const { getByRole, container } = render(<SEOContent />);
    const heading = getByRole('heading', {
      level: 2,
      name: /Japanese Verb Conjugation/,
    });
    expect(
      getByRole('region', { name: heading.textContent! }).getAttribute(
        'aria-labelledby',
      ),
    ).toBe(heading.id);
    expect(container.querySelector('h1')).toBeNull();
  });

  it('explains all three groups without skipping heading levels', () => {
    const { getByRole, container } = render(<SEOContent />);
    for (const type of ['Godan', 'Ichidan', 'Irregular'])
      expect(
        getByRole('heading', { level: 3, name: new RegExp(type) }),
      ).toBeTruthy();
    expect(
      [...container.querySelectorAll('h2,h3,h4,h5,h6')].map(el => el.tagName),
    ).toEqual(['H2', 'H3', 'H3', 'H3']);
    expect(container.textContent).toContain('食べる (taberu)');
  });

  it('does not imply every -iru/-eru verb is Ichidan', () => {
    const { container } = render(<SEOContent />);
    expect(container.textContent).toContain(
      'Not every verb ending in -iru or -eru is Ichidan',
    );
    expect(container.textContent).toContain('帰る (kaeru) is Godan');
  });

  it('renders supplied verb context safely as text', () => {
    fc.assert(
      fc.property(fc.constantFrom(...verbs), verb => {
        const { container, unmount } = render(<SEOContent verb={verb} />);
        expect(container.textContent).toContain(verb.dictionaryForm);
        expect(container.textContent).toContain(verb.romaji);
        unmount();
      }),
      { numRuns: 30 },
    );
  });

  it('uses the active locale for the learning help', () => {
    const { getByRole, container } = render(
      <NextIntlClientProvider
        locale='es'
        timeZone='UTC'
        messages={{ conjugator: es }}
      >
        <SEOContent />
      </NextIntlClientProvider>,
    );
    expect(getByRole('heading', { level: 2 }).textContent).toBe(es.seo.title);
    expect(container.textContent).toContain(
      es.seo.verbTypesIchidan.description,
    );
  });
});
