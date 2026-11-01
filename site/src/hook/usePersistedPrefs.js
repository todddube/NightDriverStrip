import { useState, useEffect, useCallback } from 'react';
import { loadPrefs, savePrefs } from '../util/storage';

// Object of UI preferences persisted to localStorage under `key`.
//   const [prefs, setPref] = usePersistedPrefs('designerConfig', { shuffle: false });
//   setPref('shuffle', true)  or  setPref('shuffle', v => !v)
export function usePersistedPrefs(key, defaults) {
    const [prefs, setPrefs] = useState(() => loadPrefs(key, defaults));
    useEffect(() => { savePrefs(key, prefs); }, [key, prefs]);
    const setPref = useCallback((name, value) =>
        setPrefs(p => ({ ...p, [name]: typeof value === 'function' ? value(p[name]) : value })), []);
    return [prefs, setPref];
}
