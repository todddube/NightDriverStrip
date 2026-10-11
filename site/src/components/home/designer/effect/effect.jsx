import { useState, useEffect, useContext } from 'react';
import Icon from '../../../Icon';
import ConfigDialog from '../../config/configDialog';
import { EffectsContext } from '../../../../context/effectsContext';
import { getEffectCategory, getCategory } from '../../../../util/categories';

const Effect = ({ effect, effectIndex, effectEnable, navigateTo, requestRunning, gridLayout, onDragStart, onDragOver }) => {
    const { activeInterval, remainingInterval, pinnedEffect, currentEffect } = useContext(EffectsContext);
    const [progress, setProgress] = useState(0);
    const [cfgOpen, setCfgOpen] = useState(false);
    const selected = Number(effectIndex) === currentEffect;
    const category = getCategory(getEffectCategory(effect.name));
    const hueStyle = { '--hue': category.hue };

    useEffect(() => {
        if (!selected || !remainingInterval) { setProgress(0); return; }
        const ref = Date.now() + remainingInterval;
        const id = setInterval(() => {
            const left = ref - Date.now();
            if (left >= 0) setProgress((left / activeInterval) * 100);
        }, 300);
        return () => clearInterval(id);
    }, [remainingInterval, selected, activeInterval]);

    const cls = [
        'effect-card',
        gridLayout ? 'grid' : 'list',
        selected ? 'active' : '',
        !effect.enabled ? 'off' : '',
    ].filter(Boolean).join(' ');

    if (gridLayout) {
        return (
            <div
                className={cls}
                style={hueStyle}
                draggable
                onDragStart={e => onDragStart(e, effectIndex)}
                onDragOver={e => onDragOver(e, effectIndex)}
            >
                {/* NOW PLAYING badge sits on the top border when active */}
                {selected && (
                    <span className="ec-active-badge">
                        <span className="ec-eq" aria-hidden="true"><i /><i /><i /></span>
                        NOW PLAYING
                    </span>
                )}

                <button className="ec-gear icon-btn" onClick={() => setCfgOpen(true)} title="Settings">
                    <Icon name="settings" size={13} />
                </button>

                {/* Centered title + category */}
                <div className="ec-header">
                    <span className="ec-name" title={effect.name}>{effect.name}</span>
                    <span className="ec-cat">{category.label}</span>
                </div>

                {/* Action row / progress */}
                <div className="ec-body">
                    {selected ? (
                        pinnedEffect
                            ? <span className="ec-pinned"><Icon name="infinity" size={14} /></span>
                            : <div className="prog"><div className="prog-fill" style={{width:`${progress}%`}}/></div>
                    ) : (
                        <>
                            {effect.enabled && (
                                <button className="btn-xs btn-xs--play" disabled={requestRunning} onClick={() => navigateTo(effectIndex)}>
                                    <Icon name="play" size={11} />Trigger
                                </button>
                            )}
                            <button className={`btn-xs${effect.enabled ? '' : ' btn-xs--enable'}`} disabled={requestRunning}
                                onClick={() => effectEnable(effectIndex, !effect.enabled)}>
                                {effect.enabled ? 'Disable' : 'Enable'}
                            </button>
                        </>
                    )}
                </div>

                {cfgOpen && <ConfigDialog heading={effect.name} effectIndex={effectIndex} open={cfgOpen} setOpen={setCfgOpen} />}
            </div>
        );
    }

    // List layout
    return (
        <div
            className={cls}
            style={hueStyle}
            draggable
            onDragStart={e => onDragStart(e, effectIndex)}
            onDragOver={e => onDragOver(e, effectIndex)}
        >
            <input
                type="checkbox"
                className="checkbox"
                checked={effect.enabled}
                disabled={selected}
                onChange={() => effectEnable(effectIndex, !effect.enabled)}
                style={{margin:'0 4px',accentColor:'var(--accent)',width:16,height:16,cursor:'pointer'}}
                onClick={e => e.stopPropagation()}
            />
            <div className="ec-avatar" style={{width:26,height:26,fontSize:12,flexShrink:0}}>{effect.name[0]}</div>
            <span className="el-name">{effect.name}</span>
            <div className="el-progress">
                {selected && (
                    pinnedEffect
                        ? <Icon name="infinity" size={16} />
                        : <div className="prog"><div className="prog-fill" style={{width:`${progress}%`}}/></div>
                )}
            </div>
            <div className="el-actions">
                {!selected && effect.enabled && (
                    <button className="icon-btn" style={{width:34,height:34}} disabled={requestRunning}
                        onClick={() => navigateTo(effectIndex)} title="Trigger">
                        <Icon name="play_circle" size={18} />
                    </button>
                )}
                <button className="icon-btn" style={{width:34,height:34}} onClick={() => setCfgOpen(true)} title="Settings">
                    <Icon name="settings" size={18} />
                </button>
            </div>
            {cfgOpen && <ConfigDialog heading={effect.name} effectIndex={effectIndex} open={cfgOpen} setOpen={setCfgOpen} />}
        </div>
    );
};

export default Effect;
