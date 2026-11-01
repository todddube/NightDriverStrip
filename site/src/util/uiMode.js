// 'full' is the normal UI; 'lite' is a minimal control page that never opens the
// live preview or polls statistics. Chosen with ?ui=lite / ?ui=full (bookmarkable)
// and remembered in localStorage.
import { readText, writeText } from './storage';

const KEY = 'uiMode';
const isMode = v => v === 'lite' || v === 'full';

export function getUiMode() {
    const fromUrl = new URLSearchParams(window.location.search).get('ui');
    if (isMode(fromUrl)) { writeText(KEY, fromUrl); return fromUrl; }
    const saved = readText(KEY);
    return isMode(saved) ? saved : 'full';
}

export function setUiMode(mode) {
    if (!isMode(mode)) return;
    writeText(KEY, mode);
    // Drop a stale ?ui= from the address bar so a reload follows the saved choice.
    if (new URLSearchParams(window.location.search).has('ui'))
        window.history.replaceState(null, '', window.location.pathname);
}
