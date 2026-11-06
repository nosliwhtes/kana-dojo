import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import type { BlogPostMeta, Category, Difficulty, Locale } from '../types/blog';
import {
  VALID_CATEGORIES,
  VALID_DIFFICULTIES,
  VALID_LOCALES,
} from '../types/blog';
import { BlogCard } from '../components/BlogCard';

// Mock next-intl Link component
vi.mock('@/shared/ui-composite/navigation/Link', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Arbitraries for generating valid BlogPostMeta objects
const categoryArb: fc.Arbitrary<Category> = fc.constantFrom(
  ...VALID_CATEGORIES,
);
const difficultyArb: fc.Arbitrary<Difficulty> = fc.constantFrom(
  ...VALID_DIFFICULTIES,
);
const localeArb: fc.Arbitrary<Locale> = fc.constantFrom(...VALID_LOCALES);

// Generate valid ISO date strings (YYYY-MM-DD format)
const dateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2030 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(
    ({ year, month, day }) =>
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  );

// Generate valid slugs
const slugArb = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
    minLength: 1,
    maxLength: 30,
  })
  .map(chars => chars.join(''))
  .filter(s => s.length > 0);

// Safe characters for strings
const safeChars =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';

// Generate safe strings
const safeStringArb = fc
  .array(fc.constantFrom(...safeChars.split('')), {
    minLength: 1,
    maxLength: 50,
  })
  .map(chars => chars.join('').trim())
  .filter(s => s.length > 0);

// Generate tag arrays
const tagsArb = fc.array(
  fc
    .array(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
      {
        minLength: 1,
        maxLength: 15,
      },
    )
    .map(chars => chars.join('')),
  { minLength: 1, maxLength: 5 },
);

// Full BlogPostMeta arbitrary
const blogPostMetaArb: fc.Arbitrary<BlogPostMeta> = fc.record({
  title: safeStringArb,
  description: safeStringArb,
  slug: slugArb,
  publishedAt: dateArb,
  updatedAt: fc.option(dateArb, { nil: undefined }),
  author: safeStringArb,
  category: categoryArb,
  tags: tagsArb,
  featuredImage: fc.option(fc.constant('/blog/image.jpg'), { nil: undefined }),
  readingTime: fc.integer({ min: 1, max: 60 }),
  difficulty: fc.option(difficultyArb, { nil: undefined }),
  relatedPosts: fc.option(fc.array(slugArb, { minLength: 0, maxLength: 3 }), {
    nil: undefined,
  }),
  locale: localeArb,
});

/**
 * **Feature: blog-system, Property 5: Blog Card Contains Required Fields**
 * For any BlogPostMeta object, the rendered BlogCard output should contain
 * the title, description, category, reading time, and publication date values.
 * **Validates: Requirements 2.2**
 */
describe('Property 5: Blog Card Contains Required Fields', () => {
  it('renders title from BlogPostMeta', () => {
    fc.assert(
      fc.property(blogPostMetaArb, (meta: BlogPostMeta) => {
        const { getByRole, unmount } = render(<BlogCard post={meta} />);
        const titleElement = getByRole('heading', { level: 2 });
        expect(titleElement.textContent).toBe(meta.title);
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('renders description from BlogPostMeta', () => {
    fc.assert(
      fc.property(blogPostMetaArb, (meta: BlogPostMeta) => {
        const { getByText, unmount } = render(<BlogCard post={meta} />);
        const descriptionElement = getByText(
          (_, element) =>
            element?.tagName === 'P' &&
            element.textContent === meta.description,
        );
        expect(descriptionElement.textContent).toBe(meta.description);
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('renders category badge from BlogPostMeta', () => {
    fc.assert(
      fc.property(blogPostMetaArb, (meta: BlogPostMeta) => {
        const { getByText, unmount } = render(<BlogCard post={meta} />);
        const categoryElement = getByText(meta.category, {
          selector: 'span',
          exact: true,
        });
        expect(categoryElement.textContent).toBe(meta.category);
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('renders reading time from BlogPostMeta', () => {
    fc.assert(
      fc.property(blogPostMetaArb, (meta: BlogPostMeta) => {
        const { getByText, unmount } = render(<BlogCard post={meta} />);
        const readingTimeElement = getByText(`${meta.readingTime} min read`, {
          exact: true,
        });
        expect(readingTimeElement.textContent).toContain(
          String(meta.readingTime),
        );
        expect(readingTimeElement.textContent).toContain('min read');
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('renders publication date from BlogPostMeta', () => {
    fc.assert(
      fc.property(blogPostMetaArb, (meta: BlogPostMeta) => {
        const { container, unmount } = render(<BlogCard post={meta} />);
        const dateElement = container.querySelector('time')!;
        expect(dateElement.getAttribute('datetime')).toBe(meta.publishedAt);
        expect(dateElement.textContent?.length).toBeGreaterThan(0);
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('contains all required fields in a single render', () => {
    fc.assert(
      fc.property(blogPostMetaArb, (meta: BlogPostMeta) => {
        const { getByRole, getByText, container, unmount } = render(
          <BlogCard post={meta} />,
        );
        expect(getByRole('heading', { level: 2 }).textContent).toBe(meta.title);
        expect(
          getByText(
            (_, element) =>
              element?.tagName === 'P' &&
              element.textContent === meta.description,
          ).textContent,
        ).toBe(meta.description);
        expect(
          getByText(meta.category, { selector: 'span', exact: true })
            .textContent,
        ).toBe(meta.category);
        expect(
          getByText(`${meta.readingTime} min read`, { exact: true })
            .textContent,
        ).toContain(String(meta.readingTime));
        expect(container.querySelector('time')!.getAttribute('datetime')).toBe(
          meta.publishedAt,
        );
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('links to the correct academy post URL', () => {
    fc.assert(
      fc.property(blogPostMetaArb, (meta: BlogPostMeta) => {
        const { container, unmount } = render(<BlogCard post={meta} />);
        const link = container.querySelector(`a[href="/academy/${meta.slug}"]`);
        expect(link).not.toBeNull();
        unmount();
      }),
      { numRuns: 100 },
    );
  });
});
