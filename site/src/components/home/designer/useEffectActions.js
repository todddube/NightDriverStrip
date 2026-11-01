import { useState, useContext } from 'react';
import { EffectsContext } from '../../../context/effectsContext';
import { post } from '../../../api/device';

// Device commands for the effects panel. Every call counts as in-flight while
// it runs, failures are reported through addNotification, and the effect list
// is re-synced either way.
export function useEffectActions(addNotification) {
    const { sync, effects, currentEffect } = useContext(EffectsContext);
    const [pending, setPending] = useState(0);

    // Resolves to true only if the device accepted the call.
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
    const moveEffect   = (effectIndex, newIndex) => run('moveEffect', '/moveEffect', { effectIndex, newIndex });
    const saveInterval = secs => run('setInterval', '/settings', { effectInterval: secs * 1000 });

    // With shuffle on, "next" jumps to a random other enabled effect.
    const navigate = (up, shuffle) => {
        if (shuffle && up) {
            const candidates = effects.map((e, i) => i).filter(i => effects[i].enabled && i !== currentEffect);
            if (candidates.length > 0)
                return navigateTo(candidates[Math.floor(Math.random() * candidates.length)]);
        }
        return run('navigate', up ? '/nextEffect' : '/previousEffect');
    };

    return { requestRunning: pending > 0, navigateTo, effectEnable, moveEffect, saveInterval, navigate, sync };
}
