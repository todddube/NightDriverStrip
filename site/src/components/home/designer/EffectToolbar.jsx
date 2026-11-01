import { useState, useContext, useEffect } from 'react';
import Icon from '../../Icon';
import Countdown from './countdown/countdown';
import { EffectsContext } from '../../../context/effectsContext';
import { msToTimeDisp } from '../../../util/time';

// Interval display that turns into a number field on click.
const IntervalEditor = ({ saveInterval }) => {
    const { pinnedEffect, activeInterval } = useContext(EffectsContext);
    const [editing,    setEditing]    = useState(false);
    const [pendingInt, setPendingInt] = useState(Math.floor(activeInterval / 1000));

    useEffect(() => { setPendingInt(Math.floor(activeInterval / 1000)); }, [activeInterval]);

    // Leave the editor open if the device rejected the change, so it can be retried.
    const save = async () => { if (await saveInterval(pendingInt)) setEditing(false); };

    return (
        <div className="hdr-val">
            <span>Interval:</span>
            {editing ? (
                <div className="interval-edit">
                    <input
                        className="interval-input"
                        type="number"
                        aria-label="Effect interval in seconds"
                        value={pendingInt}
                        min={1}
                        onChange={e => setPendingInt(e.target.value.replace(/\D/g, ''))}
                        onBlur={save}
                        onKeyDown={e => e.key === 'Enter' && save()}
                        autoFocus
                    />
                    <span className="interval-unit">sec</span>
                </div>
            ) : (
                <button className="hdr-link" onClick={() => setEditing(true)} title="Change interval">
                    {pinnedEffect ? <Icon name="infinity" size={18} /> : msToTimeDisp(activeInterval)}
                </button>
            )}
        </div>
    );
};

const NavButton = ({ icon, label, onClick, disabled, active }) => (
    <button className={`nav-icon-btn${active ? ' active' : ''}`} disabled={disabled} onClick={onClick}
        title={label} aria-label={label} aria-pressed={active}>
        <Icon name={icon} size={18} />
        <span className="nav-icon-label">{label}</span>
    </button>
);

// Header row of the effects panel: interval, countdown, navigation, search, view toggles.
const EffectToolbar = ({
    effectCount, requestRunning, saveInterval, navigate, sync,
    shuffle, setShuffle, search, setSearch,
    groupByCategory, setGroupByCategory, gridLayout, setGridLayout, sortBy, setSortBy,
}) => (
    <div className="effects-header">
        <IntervalEditor saveInterval={saveInterval} />
        <Countdown label="Remaining" />

        {effectCount > 1 && (
            <div className="nav-group">
                <NavButton icon="skip_prev" label="Previous" disabled={requestRunning} onClick={() => navigate(false)} />
                <NavButton icon="skip_next" label="Next"     disabled={requestRunning} onClick={() => navigate(true)} />
                <NavButton icon="refresh"   label="Refresh"  disabled={requestRunning} onClick={() => sync()} />
                <NavButton icon="shuffle"   label="Shuffle"  active={shuffle} onClick={() => setShuffle(v => !v)} />
            </div>
        )}

        <div className="search-wrap">
            <Icon name="search" size={14} />
            <input
                className="search-input"
                type="text"
                placeholder="Filter effects…"
                aria-label="Filter effects"
                value={search}
                onChange={e => setSearch(e.target.value)}
            />
            {search && (
                <button className="icon-btn search-clear" onClick={() => setSearch('')} aria-label="Clear filter">
                    <Icon name="close" size={12} />
                </button>
            )}
        </div>

        <div className="flex-grow" />

        <button className={`icon-btn${groupByCategory ? ' active' : ''}`} onClick={() => setGroupByCategory(v => !v)}
            title="Group by category" aria-label="Group by category" aria-pressed={groupByCategory}>
            <Icon name="label" />
        </button>
        <button className={`icon-btn${sortBy === 'order' ? ' active' : ''}`}
            onClick={() => setSortBy(sortBy === 'order' ? 'name' : 'order')}
            title={sortBy === 'order' ? 'Sorted by rotation order (drag to reorder). Click for A–Z' : 'Sorted A–Z. Click for rotation order (enables drag to reorder)'}
            aria-label="Sort by rotation order" aria-pressed={sortBy === 'order'}>
            <Icon name="sort" />
        </button>
        <button className="icon-btn" onClick={() => setGridLayout(v => !v)}
            title="Toggle layout" aria-label="Toggle layout">
            <Icon name={gridLayout ? 'list_view' : 'grid_view'} />
        </button>
    </div>
);

export default EffectToolbar;
