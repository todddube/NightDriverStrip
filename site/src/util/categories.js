export const CATEGORIES = [
    { id: 'fire',     label: 'Fire & Smoke',     keywords: ['fire', 'flame', 'smoke', 'ember', 'torch', 'heat', 'amber', 'inferno', 'lava'] },
    { id: 'weather',  label: 'Weather',           keywords: ['snow', 'rain', 'wind', 'storm', 'twister', 'aurora', 'cloud', 'lightning', 'weather'] },
    { id: 'space',    label: 'Space',             keywords: ['star', 'supernova', 'galaxy', 'nebula', 'nova', 'comet', 'cosmos'] },
    { id: 'audio',    label: 'Audio Reactive',    keywords: ['spectrum', 'audio', 'beat', 'music', 'sound', 'bass', 'analyzer', 'frequency', 'vu '] },
    { id: 'geo',      label: 'Geometric',         keywords: ['radial', 'wave', 'spiral', 'spiro', 'tunnel', 'hypnosis', 'ribbon', 'maze', 'helix', 'vortex', 'ring', 'bounce', 'lattice'] },
    { id: 'particle', label: 'Particles & Flow',  keywords: ['ball', 'particle', 'flow', 'metaball', 'blob', 'drop', 'confetti', 'splash', 'field', 'diffusion', 'walking'] },
    { id: 'color',    label: 'Color & Light',     keywords: ['rainbow', 'color', 'gamma', 'noise', 'blur', 'blurring', 'strobe', 'plasma', 'kaleid', 'picasso', 'gradient', 'hue', 'palette', 'fill', 'cycle', 'twinkle', 'fade'] },
    { id: 'classic',  label: 'Classic & Retro',   keywords: ['snake', 'life', 'pacman', 'rodent', 'ghost', 'munch', 'tetris', 'pong', 'invader'] },
    { id: 'other',    label: 'Other',             keywords: [] },
];

export function getEffectCategory(name) {
    const lower = name.toLowerCase();
    for (const cat of CATEGORIES) {
        if (cat.id === 'other') continue;
        if (cat.keywords.some(kw => lower.includes(kw))) return cat.id;
    }
    return 'other';
}
