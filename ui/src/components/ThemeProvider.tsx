import { ThemeContext, useThemeProvider } from '@/hooks/useTheme';

export function ThemeProvider({ children }: { readonly children: React.ReactNode }) {
  const value = useThemeProvider();
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
