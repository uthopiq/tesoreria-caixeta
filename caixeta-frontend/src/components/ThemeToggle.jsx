import { MdLightMode, MdDarkMode } from 'react-icons/md';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="fixed top-4 right-4 p-3 rounded-full bg-slate-200 dark:bg-caixeta-card text-caixeta-red dark:text-caixeta-red shadow-md hover:shadow-lg transition-all duration-300 z-50 flex items-center justify-center"
            aria-label="Toggle Dark Mode"
            title={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
        >
            {theme === 'light' ? (
                <MdDarkMode className="text-2xl" />
            ) : (
                <MdLightMode className="text-2xl text-yellow-400" />
            )}
        </button>
    );
}
