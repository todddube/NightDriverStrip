import { useContext, useState } from 'react';
import Icon from '../../Icon';
import { EffectsContext } from '../../../context/effectsContext';
import { useEffectActions } from '../designer/useEffectActions';
import { msToTimeDisp } from '../../../util/time';

// Minimal control page: current effect, previous/next, and a way back to the full UI.
// Mounts no statistics polling and no live preview, which is where the device CPU goes.
const LiteView = ({ onSwitchToFull }) => {
    const { effects, currentEffect, activeInterval, pinnedEffect, error } = useContext(EffectsContext);
    const [actionError, setActionError] = useState(null);
    const { requestRunning, navigate } = useEffectActions((_level, _op, _path, err) => setActionError(err.message));

    const current = effects[currentEffect];
    const step = up => { setActionError(null); navigate(up, false); };

    return (
        <main className="lite">
            <div className="lite-brand">NightDriverStrip <span className="lite-tag">lite</span></div>

            <div className="lite-now" aria-live="polite">
                <span className="lite-label">Now playing</span>
                <span className="lite-name">{current ? current.name : '…'}</span>
                <span className="lite-meta">
                    {pinnedEffect ? 'Held on this effect' : `Changes every ${msToTimeDisp(activeInterval)}`}
                </span>
            </div>

            <div className="lite-controls">
                <button className="btn" disabled={requestRunning} onClick={() => step(false)}>
                    <Icon name="skip_prev" size={20} /> Previous
                </button>
                <button className="btn primary" disabled={requestRunning} onClick={() => step(true)}>
                    Next <Icon name="skip_next" size={20} />
                </button>
            </div>

            {(error || actionError) && (
                <div className="device-error" role="alert">Can't reach the device. ({actionError ?? error})</div>
            )}

            <button className="btn lite-switch" onClick={onSwitchToFull}>Switch to full UI</button>
        </main>
    );
};

export default LiteView;
