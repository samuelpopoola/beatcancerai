import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * ThemeToggle
 * Small toggle switch that flips the global theme stored in AppContext.
 * Uses a compact animated knob and sun/moon icons from lucide-react.
 */
const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useApp();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="flex items-center space-x-2 p-1 rounded-md transition-colors duration-300 focus:outline-none"
    >
      {/* background pill */}
      <div
        className={`relative w-12 h-6 rounded-full p-0.5 transition-all duration-300 ${
          theme === 'dark' ? 'bg-gradient-to-r from-slate-700 to-slate-600' : 'bg-gradient-to-r from-yellow-200 to-yellow-50'
        }`}
      >
        {/* knob: moves and slightly rotates in dark mode for a playful feel */}
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-300 flex items-center justify-center ${
            theme === 'dark' ? 'translate-x-6 rotate-12 bg-yellow-400' : 'translate-x-0 bg-white'
          }`}
        >
          {theme === 'dark' ? <Sun className="w-3 h-3 text-white" /> : <Moon className="w-3 h-3 text-yellow-400" />}
        </div>
      </div>
    </button>
  );
};

export default ThemeToggle;
