import { useState, useContext, useEffect } from 'react';
import Icon from '../../Icon';
import Countdown from './countdown/countdown';
import Effect from './effect/effect';
import { EffectsContext } from '../../../context/effectsContext';
import { msToTimeDisp } from '../../../util/time';
import { post } from '../../../api/device';
import { usePersistedPrefs } from '../../../hook/usePersistedPrefs';
import { getEffectCategory, CATEGORIES } from '../../../util/categories';

// Titled group of effect cards. Pass onToggle to make the section collapsible.
const EffectSection = ({ title, count, variant, hint, expanded = true, onToggle, children }) => {
    const heading = (
        <>
            {onToggle && <Icon name="chevron_right" size={16} className={`fx-section-chevron${expanded ? ' open' : ''}`} />}
            <span className="fx-section-dot" />
            <span className="fx-section-title">{title}</span>
            <span className="fx-section-count">{count}</span>
            {hint && <span className="fx-section-hint">{hint}</span>}
        </>
    );
    return (
        <section className={`fx-section fx-section--${variant}`}>
            {onToggle
                ? <button className="fx-section-header" onClick={onToggle} aria-expanded={expanded}>{heading}</button>
                : <div className="fx-section-header">{heading}</div>}
            {expanded && children}
        </section>
    );
};

const DesignerPanel = ({ open, addNotification }) => {
    const { pinnedEffect, activeInterval, sync, effects, currentEffect } = useContext(EffectsContext);
    const [editing,          setEditing]          = useState(false);
    const [pendingInt,       setPendingInt]        = useState(Math.floor(activeInterval / 1000));
    const [pending,          setPending]           = useState(0);   // in-flight device calls
    const requestRunning = pending > 0;
    const [search,           setSearch]            = useState('');
    const [prefs, setPref] = usePersistedPrefs('designerConfig',
        { gridLayout: true, showDisabled: true, shuffle: false, groupByCategory: false });
    const { gridLayout, showDisabled, shuffle, groupByCategory } = prefs;
    const setGridLayout      = v => setPref('gridLayout', v);
    const setShowDisabled    = v => setPref('showDisabled', v);
    const setShuffle         = v => setPref('shuffle', v);
    const setGroupByCategory = v => setPref('groupByCategory', v);
    const [dragging,   setDragging]   = useState(undefined);
    const [dropTarget, setDropTarget] = useState(undefined);

    useEffect(() => { setPendingInt(Math.floor(activeInterval / 1000)); }, [activeInterval]);

    // Run a device call while counting it as in-flight, report failure as a
    // notification, and re-sync the effect list either way. Resolves to true
    // only if the device accepted the call.
    const run = async (op, path, params) => {
        setPending(n => n + 1);
        let ok = true;
        try {
            await post(path, params);
        } catch (err) {
            ok = false;
            addNotification('Error', op, path, err);
        }
        await sync();
        setPending(n => n - 1);
        return ok;
    };

    const navigateTo   = idx => run('navigateTo', '/currentEffect', { currentEffectIndex: idx });
    const effectEnable = (idx, enable) => run('effectEnable', enable ? '/enableEffect' : '/disableEffect', { effectIndex: idx });
    const saveInterval = async secs => {
        if (await run('setInterval', '/settings', { effectInterval: secs * 1000 })) setEditing(false);
    };

    const navigate = up => {
        if (shuffle && up) {
            const candidates = effects.map((e, i) => i).filter(i => effects[i].enabled && i !== currentEffect);
            if (candidates.length > 0)
                return navigateTo(candidates[Math.floor(Math.random() * candidates.length)]);
        }
        return run('navigate', up ? '/nextEffect' : '/previousEffect');
    };

    if (!open) return null;
    if (!effects) return <div className="loading">Loading…</div>;

    const searchLower = search.toLowerCase();
    const sorted = effects
        .map((effect, idx) => ({ ...effect, origIdx: idx }))
        .filter(effect => !search || effect.name.toLowerCase().includes(searchLower))
        .sort((a, b) => a.name.localeCompare(b.name));

    // Enabled effects first, disabled ones in their own section below. Recomputed
    // on every sync, so toggling an effect moves it between sections immediately.
    const enabledEffects  = sorted.filter(e => e.enabled);
    const disabledEffects = sorted.filter(e => !e.enabled);

    const effectProps = effect => ({
        key:            `effect-${effect.origIdx}`,
        effect,
        effectIndex:    effect.origIdx,
        navigateTo,
        requestRunning,
        effectEnable,
        gridLayout,
    });

    const layoutClass = gridLayout ? 'effects-grid' : 'effects-list';

    const renderEffects = list => groupByCategory ? (
        <div className="cat-container">
            {CATEGORIES.map(cat => {
                const catEffects = list.filter(e => getEffectCategory(e.name) === cat.id);
                if (!catEffects.length) return null;
                return (
                    <div key={cat.id} className="cat-section">
                        <div className="cat-header">
                            <span className="cat-label">{cat.label}</span>
                            <span className="cat-count">{catEffects.length}</span>
                        </div>
                        <div className={layoutClass}>
                            {catEffects.map(effect => (
                                <Effect
                                    {...effectProps(effect)}
                                    onDragStart={() => {}}
                                    onDragOver={() => {}}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    ) : (
        <div
            className={layoutClass}
            onDragOver={e => { e.preventDefault(); setDropTarget(undefined); }}
            onDrop={e => {
                e.preventDefault();
                if (dragging !== undefined && dropTarget !== undefined && dragging !== dropTarget) {
                    run('moveEffect', '/moveEffect', { effectIndex: dragging, newIndex: dropTarget })
                        .then(() => { setDragging(undefined); setDropTarget(undefined); });
                }
            }}
        >
            {list.map(effect => (
                <Effect
                    {...effectProps(effect)}
                    onDragStart={(e, i) => { setDragging(i); e.dataTransfer.setData('index', i); }}
                    onDragOver={(e, i) => { e.preventDefault(); if (i !== undefined) setDropTarget(i); }}
                />
            ))}
        </div>
    );

    return (
        <div className="designer-panel">
            <div className="effects-header">
                {/* Interval display / edit */}
                <div className="hdr-val">
                    <span>Interval:</span>
                    {editing ? (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                            <input
                                className="hdr-val input"
                                type="number"
                                value={pendingInt}
                                min={1}
                                onChange={e => setPendingInt(e.target.value.replace(/\D/g, ''))}
                                onBlur={() => saveInterval(pendingInt)}
                                onKeyDown={e => e.key === 'Enter' && saveInterval(pendingInt)}
                                autoFocus
                                style={{width:70,background:'transparent',border:'none',borderBottom:'1px solid var(--accent)',color:'var(--text)',fontSize:13,padding:'2px 0',outline:'none'}}
                            />
                            <span style={{fontSize:12,color:'var(--text-dim)'}}>sec</span>
                        </div>
                    ) : (
                        <a href="#" onClick={e => { e.preventDefault(); setEditing(true); }}>
                            {pinnedEffect ? <Icon name="infinity" size={18} /> : msToTimeDisp(activeInterval)}
                        </a>
                    )}
                </div>

                <Countdown label="Remaining" />

                {effects.length > 1 && (
                    <div style={{display:'flex', alignItems:'center', gap:2}}>
                        <button className="nav-icon-btn" disabled={requestRunning} onClick={() => navigate(false)} title="Previous">
                            <Icon name="skip_prev" size={18} />
                            <span className="nav-icon-label">Back</span>
                        </button>
                        <button className="nav-icon-btn" disabled={requestRunning} onClick={() => navigate(true)} title="Next">
                            <Icon name="skip_next" size={18} />
                            <span className="nav-icon-label">Next</span>
                        </button>
                        <button className="nav-icon-btn" disabled={requestRunning} onClick={() => sync()} title="Refresh">
                            <Icon name="refresh" size={18} />
                            <span className="nav-icon-label">Refresh</span>
                        </button>
                        <button className={`nav-icon-btn${shuffle ? ' active' : ''}`} onClick={() => setShuffle(v => !v)} title="Shuffle">
                            <Icon name="shuffle" size={18} />
                            <span className="nav-icon-label">Shuffle</span>
                        </button>
                    </div>
                )}

                {/* Search */}
                <div className="search-wrap">
                    <Icon name="search" size={14} />
                    <input
                        className="search-input"
                        type="text"
                        placeholder="Filter effects…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && (
                        <button className="icon-btn" style={{width:18,height:18,flexShrink:0}} onClick={() => setSearch('')}>
                            <Icon name="close" size={12} />
                        </button>
                    )}
                </div>

                <div className="flex-grow" />

                <button
                    className={`icon-btn${groupByCategory ? ' active' : ''}`}
                    onClick={() => setGroupByCategory(v => !v)}
                    title="Group by category"
                >
                    <Icon name="label" />
                </button>

                <button className="icon-btn" onClick={() => setGridLayout(v => !v)} title="Toggle layout">
                    <Icon name={gridLayout ? 'list_view' : 'grid_view'} />
                </button>
            </div>

            {sorted.length === 0 && (
                <div className="loading">No effects match "{search}"</div>
            )}

            {enabledEffects.length > 0 && (
                <EffectSection title="Enabled" count={enabledEffects.length} variant="enabled">
                    {renderEffects(enabledEffects)}
                </EffectSection>
            )}

            {disabledEffects.length > 0 && (
                <EffectSection
                    title="Disabled"
                    count={disabledEffects.length}
                    variant="disabled"
                    hint="Not in rotation. Enable an effect to move it up."
                    expanded={showDisabled}
                    onToggle={() => setShowDisabled(v => !v)}
                >
                    {renderEffects(disabledEffects)}
                </EffectSection>
            )}
        </div>
    );
};

export default DesignerPanel;
