export const CATEGORIES = [
    { id: 'fire',     label: 'Fire & Smoke',     hue:  22, keywords: ['fire', 'flame', 'smoke', 'ember', 'torch', 'heat', 'amber', 'inferno', 'lava'] },
    { id: 'weather',  label: 'Weather',           hue: 195, keywords: ['snow', 'rain', 'wind', 'storm', 'twister', 'aurora', 'cloud', 'lightning', 'weather'] },
    { id: 'space',    label: 'Space',             hue: 265, keywords: ['star', 'supernova', 'galaxy', 'nebula', 'nova', 'comet', 'cosmos'] },
    { id: 'audio',    label: 'Audio Reactive',    hue: 330, keywords: ['spectrum', 'audio', 'beat', 'music', 'sound', 'bass', 'analyzer', 'frequency', 'vu '] },
    { id: 'geo',      label: 'Geometric',         hue: 170, keywords: ['radial', 'wave', 'spiral', 'spiro', 'tunnel', 'hypnosis', 'ribbon', 'maze', 'helix', 'vortex', 'ring', 'bounce', 'lattice'] },
    { id: 'particle', label: 'Particles & Flow',  hue: 140, keywords: ['ball', 'particle', 'flow', 'metaball', 'blob', 'drop', 'confetti', 'splash', 'field', 'diffusion', 'walking'] },
    { id: 'color',    label: 'Color & Light',     hue:  45, keywords: ['rainbow', 'color', 'gamma', 'noise', 'blur', 'blurring', 'strobe', 'plasma', 'kaleid', 'picasso', 'gradient', 'hue', 'palette', 'fill', 'cycle', 'twinkle', 'fade'] },
    { id: 'classic',  label: 'Classic & Retro',   hue:   0, keywords: ['snake', 'life', 'pacman', 'rodent', 'ghost', 'munch', 'tetris', 'pong', 'invader'] },
    { id: 'other',    label: 'Other',             hue: 215, keywords: [] },
];

export function getEffectCategory(name) {
    const lower = name.toLowerCase();
    for (const cat of CATEGORIES) {
        if (cat.id === 'other') continue;
        if (cat.keywords.some(kw => lower.includes(kw))) return cat.id;
    }
    return 'other';
}

export function getCategory(id) {
    return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
