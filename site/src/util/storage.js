// Safe wrappers around Web Storage. Storage can throw (private windows, blocked
// site data) and stored JSON can be corrupt — neither should break the UI.

const area = session => (session ? sessionStorage : localStorage);

export function readText(key, { session = false } = {}) {
    try { return area(session).getItem(key); } catch { return null; }
}

export function writeText(key, value, { session = false } = {}) {
    try { area(session).setItem(key, value); } catch { /* storage unavailable: keep going without persistence */ }
}

// Load a JSON object and merge it over `defaults`. Only keys present in
// `defaults` whose stored value has the same type are accepted.
export function loadPrefs(key, defaults) {
    let stored;
    try { stored = JSON.parse(readText(key)); } catch { return { ...defaults }; }
    if (!stored || typeof stored !== 'object') return { ...defaults };
    const out = { ...defaults };
    for (const name of Object.keys(defaults))
        if (typeof stored[name] === typeof defaults[name]) out[name] = stored[name];
    return out;
}

export function savePrefs(key, prefs) {
    writeText(key, JSON.stringify(prefs));
}
