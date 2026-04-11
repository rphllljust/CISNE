import { Moon, Sun } from 'lucide-react';

import { useUiStore } from '@/shared/lib/ui.store';

import './toggle-theme.css';

export function ToggleThemeButton(): React.JSX.Element {
  const theme = useUiStore((state) => state.theme);
  const toggleTheme = useUiStore((state) => state.toggleTheme);

  return (
    <button className="theme-toggle" onClick={toggleTheme} aria-label="Alternar tema">
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}


