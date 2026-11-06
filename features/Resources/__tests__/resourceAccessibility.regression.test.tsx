import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, waitFor } from '@testing-library/react';
import { renderWithIntl as render } from '@/shared/test/renderWithIntl';
import { ResourceCard } from '../components/ResourceCard';
import { CategoryHeader } from '../components/CategoryHeader';
import { ResourceDetailModal } from '../components/ResourceDetailModal';
import type { Resource, Category } from '../types';

afterEach(cleanup);
const resource: Resource = {
  id: 'dictionary',
  name: 'Dictionary',
  description: 'Look up Japanese words',
  category: 'websites',
  subcategory: 'dictionaries',
  tags: [],
  difficulty: 'all-levels',
  priceType: 'free',
  platforms: ['web', 'web'],
  url: 'https://example.com',
};

describe('resource keyboard and category context', () => {
  it('moves focus into the dialog and returns it when closed', async () => {
    function Example() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open resource</button>
          <ResourceDetailModal
            resource={resource}
            isOpen={open}
            onClose={() => setOpen(false)}
          />
        </>
      );
    }
    const { getByRole, queryByRole } = render(<Example />);
    expect(queryByRole('dialog')).toBeNull();
    const opener = getByRole('button', { name: 'Open resource' });
    opener.focus();
    fireEvent.click(opener);
    const dialog = getByRole('dialog', { name: 'Dictionary' });
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true),
    );
    fireEvent.click(getByRole('button', { name: 'Close', exact: true }));
    await waitFor(() => expect(queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
  it('has one keyboard action without a hidden nested button', () => {
    const onSelect = vi.fn();
    const { getByRole, container } = render(
      <ResourceCard resource={resource} onSelect={onSelect} />,
    );
    const card = getByRole('button', { name: /Dictionary/ });
    expect(container.querySelector('button[aria-hidden=true]')).toBeNull();
    fireEvent.keyDown(card, { key: 'Enter' });
    fireEvent.keyDown(card, { key: ' ' });
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith(resource);
  });

  it('exposes platform meaning without duplicate icons', () => {
    const { getByLabelText } = render(<ResourceCard resource={resource} />);
    expect(getByLabelText('Available on: Web')).toBeTruthy();
  });

  it('shows empty counts and Japanese category names', () => {
    const category: Category = {
      id: 'websites',
      name: 'Websites',
      nameJa: 'ウェブサイト',
      description: 'Web resources',
      descriptionLong: 'Long description',
      icon: 'book',
      subcategories: [],
      order: 1,
    };
    const { getByText, queryByLabelText } = render(
      <CategoryHeader
        category={category}
        resourceCount={0}
        showLongDescription={false}
      />,
    );
    expect(getByText('0 resources')).toBeTruthy();
    expect(getByText('ウェブサイト').getAttribute('lang')).toBe('ja');
    expect(queryByLabelText('Detailed category description')).toBeNull();
  });
});
