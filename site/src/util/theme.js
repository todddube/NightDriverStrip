// Theme preference: 'system' follows the OS/browser light/dark setting,
// 'light' and 'dark' override it. Stored in localStorage under 'theme'.

export const THEME_PREFS = ['system', 'light', 'dark'];

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePref() {
    const saved = localStorage.getItem('theme');
    return THEME_PREFS.includes(saved) ? saved : 'system';
}

export function saveThemePref(pref) {
    localStorage.setItem('theme', pref);
}

export function resolveTheme(pref) {
    if (pref === 'system') return darkQuery.matches ? 'dark' : 'light';
    return pref;
}

export function applyTheme(pref) {
    document.documentElement.setAttribute('data-theme', resolveTheme(pref));
}

export function nextThemePref(pref) {
    return THEME_PREFS[(THEME_PREFS.indexOf(pref) + 1) % THEME_PREFS.length];
}

// Calls back whenever the OS light/dark setting changes. Returns an unsubscribe function.
export function onSystemThemeChange(callback) {
    darkQuery.addEventListener('change', callback);
    return () => darkQuery.removeEventListener('change', callback);
}
