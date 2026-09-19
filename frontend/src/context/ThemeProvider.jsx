import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Theme } from '@astryxdesign/core';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';

export default function ThemeProvider({ children }) {
  const theme = useSelector((state) => state.settings?.theme || 'system');

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'theme-blueprint');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);

      // Listen for system changes
      const listener = (e) => {
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };

      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', listener);

      return () => mediaQuery.removeEventListener('change', listener);
    } else {
      // It's 'light' or 'dark' (if legacy 'blueprint' is used, fallback to 'dark' for Shadcn purposes, but apply as class just in case)
      root.classList.add(theme === 'blueprint' ? 'dark' : theme);
      if (theme === 'blueprint') {
         // Also add blueprint class for legacy support during transition
         root.classList.add('theme-blueprint');
      }
    }
  }, [theme]);

  const effectiveMode = theme === 'system' ? 'system' : (theme === 'dark' || theme === 'blueprint') ? 'dark' : 'light';

  return (
    <Theme theme={neutralTheme} mode={effectiveMode}>
      {children}
    </Theme>
  );
}
