import { useState, useContext, useEffect } from 'react';
import Icon from '../../Icon';
import Countdown from './countdown/countdown';
import Effect from './effect/effect';
import { EffectsContext } from '../../../context/effectsContext';
import { msToTimeDisp } from '../../../util/time';
import httpPrefix from '../../../espaddr';
import { getEffectCategory, CATEGORIES } from '../../../util/categories';

const moveUrl = `${httpPrefix !== undefined ? httpPrefix : ""}/moveEffect`;

const DesignerPanel = ({ open, addNotification }) => {
    const { pinnedEffect, activeInterval, sync, effects, currentEffect } = useContext(EffectsContext);
    const [editing,          setEditing]          = useState(false);
    const [pendingInt,       setPendingInt]        = useState(Math.floor(activeInterval / 1000));
    const [requestRunning,   setRunning]           = useState(false);
    const [search,           setSearch]            = useState('');
    const [gridLayout,       setGridLayout]        = useState(() => {
        const c = JSON.parse(localStorage.getItem('designerConfig') || '{}');
        return c.gridLayout !== undefined ? c.gridLayout : true;
    });
    const [showDisabled,     setShowDisabled]      = useState(() => {
        const c = JSON.parse(localStorage.getItem('designerConfig') || '{}');
        return c.showDisabled !== undefined ? c.showDisabled : true;
    });
    const [shuffle,          setShuffle]           = useState(() => {
        const c = JSON.parse(localStorage.getItem('designerConfig') || '{}');
        return c.shuffle !== undefined ? c.shuffle : false;
    });
    const [groupByCategory,  setGroupByCategory]   = useState(() => {
        const c = JSON.parse(localStorage.getItem('designerConfig') || '{}');
        return c.groupByCategory !== undefined ? c.groupByCategory : false;
    });
    const [dragging,   setDragging]   = useState(undefined);
    const [dropTarget, setDropTarget] = useState(undefined);

    useEffect(() => { setPendingInt(Math.floor(activeInterval / 1000)); }, [activeInterval]);
    useEffect(() => {
        localStorage.setItem('designerConfig', JSON.stringify({ gridLayout, showDisabled, shuffle, groupByCategory }));
    }, [gridLayout, showDisabled, shuffle, groupByCategory]);

    const req = (url, opts, op) =>
        fetch(url, opts).catch(err => { addNotification('Error', op, url, err); throw err; });

    const navigateTo = idx => {
        setRunning(true);
        return req(`${httpPrefix !== undefined ? httpPrefix : ""}/currentEffect`,
            { method: 'POST', body: new URLSearchParams({ currentEffectIndex: idx }) }, 'navigateTo')
            .then(sync).finally(() => setRunning(false));
    };

    const effectEnable = (idx, enable) => {
        setRunning(true);
        return req(`${httpPrefix !== undefined ? httpPrefix : ""}/${enable ? 'enable' : 'disable'}Effect`,
            { method: 'POST', body: new URLSearchParams({ effectIndex: idx }) }, 'effectEnable')
            .then(sync).finally(() => setRunning(false));
    };

    const navigate = up => {
        if (shuffle && up && effects) {
            const candidates = effects
                .map((e, i) => i)
                .filter(i => effects[i].enabled && i !== currentEffect);
            if (candidates.length > 0) {
                const idx = candidates[Math.floor(Math.random() * candidates.length)];
                setRunning(true);
                return req(`${httpPrefix !== undefined ? httpPrefix : ""}/currentEffect`,
                    { method: 'POST', body: new URLSearchParams({ currentEffectIndex: idx }) }, 'navigate')
                    .then(sync).finally(() => setRunning(false));
            }
        }
        setRunning(true);
        return req(`${httpPrefix !== undefined ? httpPrefix : ""}/${up ? 'nextEffect' : 'previousEffect'}`,
            { method: 'POST' }, 'navigate')
            .then(sync).finally(() => setRunning(false));
    };

    const saveInterval = secs => {
        setEditing(false);
        setRunning(true);
        return req(`${httpPrefix !== undefined ? httpPrefix : ""}/settings`,
            { method: 'POST', body: new URLSearchParams({ effectInterval: secs * 1000 }) }, 'setInterval')
            .then(sync).finally(() => setRunning(false));
    };

    if (!open) return null;
    if (!effects) return <div className="loading">Loading…</div>;

    const searchLower = search.toLowerCase();
    const sorted = effects
        .map((effect, idx) => ({ ...effect, origIdx: idx }))
        .filter(effect =>
            (effect.enabled || showDisabled) &&
            (!search || effect.name.toLowerCase().includes(searchLower))
        )
        .sort((a, b) => a.name.localeCompare(b.name));

    const effectProps = effect => ({
        key:            `effect-${effect.origIdx}`,
        effect,
        effectIndex:    effect.origIdx,
        navigateTo,
        requestRunning,
        effectEnable,
        gridLayout,
    });

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

                <label className="label-sm">
                    <input type="checkbox" checked={showDisabled} onChange={() => setShowDisabled(v => !v)}
                        style={{accentColor:'var(--accent)'}} />
                    Show Disabled
                </label>

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

            {groupByCategory ? (
                <div className="cat-container">
                    {CATEGORIES.map(cat => {
                        const catEffects = sorted.filter(e => getEffectCategory(e.name) === cat.id);
                        if (!catEffects.length) return null;
                        return (
                            <div key={cat.id} className="cat-section">
                                <div className="cat-header">
                                    <span className="cat-label">{cat.label}</span>
                                    <span className="cat-count">{catEffects.length}</span>
                                </div>
                                <div className={gridLayout ? 'effects-grid' : 'effects-list'}>
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
                    className={gridLayout ? 'effects-grid' : 'effects-list'}
                    onDragOver={e => { e.preventDefault(); setDropTarget(undefined); }}
                    onDrop={e => {
                        e.preventDefault();
                        if (dragging !== undefined && dropTarget !== undefined && dragging !== dropTarget) {
                            fetch(moveUrl, { method: 'POST', body: new URLSearchParams({ effectIndex: dragging, newIndex: dropTarget }) })
                                .then(() => { setDragging(undefined); setDropTarget(undefined); sync(); });
                        }
                    }}
                >
                    {sorted.map(effect => (
                        <Effect
                            {...effectProps(effect)}
                            onDragStart={(e, i) => { setDragging(i); e.dataTransfer.setData('index', i); }}
                            onDragOver={(e, i) => { e.preventDefault(); if (i !== undefined) setDropTarget(i); }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default DesignerPanel;
