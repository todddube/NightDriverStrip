import { useState, useContext } from 'react';
import Effect from './effect/effect';
import EffectSection from './EffectSection';
import EffectToolbar from './EffectToolbar';
import { useEffectActions } from './useEffectActions';
import { EffectsContext } from '../../../context/effectsContext';
import { usePersistedPrefs } from '../../../hook/usePersistedPrefs';
import { getEffectCategory, CATEGORIES } from '../../../util/categories';

const DesignerPanel = ({ open, addNotification }) => {
    const { effects } = useContext(EffectsContext);
    const { requestRunning, navigateTo, effectEnable, moveEffect, saveInterval, navigate, sync } = useEffectActions(addNotification);
    const [search, setSearch] = useState('');
    const [prefs, setPref] = usePersistedPrefs('designerConfig',
        { gridLayout: true, showDisabled: true, shuffle: false, groupByCategory: false, sortBy: 'name' });
    const { gridLayout, showDisabled, shuffle, groupByCategory, sortBy } = prefs;
    const setGridLayout      = v => setPref('gridLayout', v);
    const setShowDisabled    = v => setPref('showDisabled', v);
    const setShuffle         = v => setPref('shuffle', v);
    const setGroupByCategory = v => setPref('groupByCategory', v);
    const setSortBy          = v => setPref('sortBy', v);
    // Dragging changes the device's rotation order, so it only makes sense when the grid shows that order.
    const reorderable = sortBy === 'order' && !groupByCategory;
    const [dragging,   setDragging]   = useState(undefined);
    const [dropTarget, setDropTarget] = useState(undefined);

    if (!open) return null;
    if (!effects) return <div className="loading">Loading…</div>;

    const searchLower = search.toLowerCase();
    const sorted = effects
        .map((effect, idx) => ({ ...effect, origIdx: idx }))
        .filter(effect => !search || effect.name.toLowerCase().includes(searchLower))
        .sort((a, b) => sortBy === 'order' ? a.origIdx - b.origIdx : a.name.localeCompare(b.name));

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
        reorderable,
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
                    moveEffect(dragging, dropTarget)
                        .then(() => { setDragging(undefined); setDropTarget(undefined); });
                }
            }}
        >
            {list.map(effect => (
                <Effect
                    {...effectProps(effect)}
                    onDragStart={(e, i) => { setDragging(i); e.dataTransfer.setData('index', i); }}
                    onDragOver={(e, i) => { e.preventDefault(); e.stopPropagation(); if (i !== undefined) setDropTarget(i); }}
                />
            ))}
        </div>
    );

    return (
        <div className="designer-panel">
            <EffectToolbar
                effectCount={effects.length}
                requestRunning={requestRunning}
                saveInterval={saveInterval}
                navigate={up => navigate(up, shuffle)}
                sync={sync}
                shuffle={shuffle} setShuffle={setShuffle}
                search={search} setSearch={setSearch}
                groupByCategory={groupByCategory} setGroupByCategory={setGroupByCategory}
                gridLayout={gridLayout} setGridLayout={setGridLayout}
                sortBy={sortBy} setSortBy={setSortBy}
            />

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
