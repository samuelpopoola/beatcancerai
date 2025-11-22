import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import ThemeToggle from '../ThemeToggle';
import { AppProvider } from '../../context/AppContext';

// JSDOM in Vitest may not provide matchMedia; stub it.
beforeEach(() => {
  // @ts-ignore
  if (!window.matchMedia) {
    // @ts-ignore
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
  // clear theme
  document.documentElement.classList.remove('dark');
  localStorage.removeItem('theme');
});

describe('ThemeToggle', () => {
  it('toggles dark class on documentElement', () => {
    render(
      <AppProvider>
        <ThemeToggle />
      </AppProvider>
    );

    const button = screen.getByRole('button', { name: /toggle theme/i });

    // initial should be light (no dark class)
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // click to toggle dark
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    // click to toggle back to light
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
