'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import type { VerbInfo } from '../types';

interface SEOContentProps {
  verb?: VerbInfo;
}

/** Concise, translated help beneath the conjugator. */
export default function SEOContent({ verb }: SEOContentProps) {
  const t = useTranslations('conjugator.seo');
  const groups = ['Godan', 'Ichidan', 'Irregular'] as const;
  const group =
    verb?.type === 'godan'
      ? 'Godan'
      : verb?.type === 'ichidan'
        ? 'Ichidan'
        : 'Irregular';
  return (
    <section
      aria-labelledby='seo-content-heading'
      className='flex flex-col gap-8 py-12'
    >
      <h2
        id='seo-content-heading'
        className='text-2xl font-bold tracking-tight text-(--main-color)'
      >
        {t('title')}
      </h2>
      <div className='max-w-3xl space-y-4 text-(--secondary-color)'>
        <p>{t('intro')}</p>
        {verb && (
          <p>
            {t('verbIntro', {
              verb: verb.dictionaryForm,
              romaji: verb.romaji,
              verbType: t(`verbTypes${group}.title`),
            })}
          </p>
        )}
      </div>
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-3'>
        {groups.map(type => (
          <div key={type} className='flex flex-col gap-2'>
            <h3 className='text-lg font-bold text-(--main-color)'>
              {t(`verbTypes${type}.title`)}
            </h3>
            <p className='text-sm text-(--secondary-color)'>
              {t(`verbTypes${type}.description`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
