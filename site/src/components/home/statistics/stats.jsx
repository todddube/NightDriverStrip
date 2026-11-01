import { useState, useEffect, useContext } from 'react';
import Icon from '../../Icon';
import SystemMonitor from './SystemMonitor';
import { StatsContext } from '../../../context/statsContext';
import { getJson } from '../../../api/device';
import { usePersistedPrefs } from '../../../hook/usePersistedPrefs';


const fmtBytes = b => (!b || b <= 0) ? '0' : b >= 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`;

const StatsPanel = ({ open }) => {
    const [rawData,      setRawData]      = useState(null);
    const [prefs, setPref] = usePersistedPrefs('statsConfig', { statsRefreshRate: 3, maxSamples: 50 });
    const refreshRate = prefs.statsRefreshRate;
    const maxSamples  = prefs.maxSamples;
    const setRefreshRate = v => setPref('statsRefreshRate', v);
    const setMaxSamples  = v => setPref('maxSamples', v);
    const [pollError,    setPollError]    = useState(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [lastRefresh,  setLastRefresh]  = useState(0);

    const { heapSize, dmaSize, psRamSize, chipCores, chipModel, chipSpeed, codeSize, codeFree, flashSize, fsSize, fsUsed, buildInfo, flashVersion } = useContext(StatsContext);

    useEffect(() => {
        if (!open) return;
        const ctrl = new AbortController();
        getJson('/statistics/dynamic', undefined, { signal: ctrl.signal })
            .then(s => { setRawData(s); setPollError(null); })
            .catch(err => { if (err.name !== 'AbortError') setPollError(err.message); });

        const id = setTimeout(() => setLastRefresh(Date.now()), refreshRate * 1000);
        return () => { clearTimeout(id); ctrl.abort(); };
    }, [refreshRate, lastRefresh, open]);

    if (!open) return null;

    const pkgItems = [
        { key: 'Model',  val: chipModel },
        { key: 'Cores',  val: chipCores },
        { key: 'Speed',  val: chipSpeed ? `${chipSpeed} MHz` : '—' },
        { key: 'Flash',  val: fmtBytes(flashSize) },
        { key: 'Code',   val: fmtBytes(codeSize) },
        { key: 'Free',   val: fmtBytes(codeFree) },
        ...(flashVersion ? [{ key: 'Version',      val: flashVersion }] : []),
        ...(buildInfo    ? [{ key: 'Last Updated', val: buildInfo }] : []),
        { key: 'Web UI', val: `${__GIT_HASH__} · ${__UI_BUILD__}` },
        ...(flashSize > 0 ? [{ key: 'Firmware',    val: `${fmtBytes(codeSize)} / ${fmtBytes(flashSize)}` }] : []),
        ...(fsSize    > 0 ? [{ key: 'Filesystem',  val: `${fmtBytes(fsUsed)} / ${fmtBytes(fsSize)}` }] : []),
        ...(rawData   ? [
            { key: 'LED',    val: `${rawData.LED_FPS    ?? 0} fps` },
            { key: 'Serial', val: `${rawData.SERIAL_FPS ?? 0} fps` },
            { key: 'Audio',  val: `${rawData.AUDIO_FPS  ?? 0} fps` },
        ] : []),
    ];

    return (
        <div className="stats-panel">
            {/* Header row */}
            <div className="section-head">
                <span className="section-head-title">Statistics</span>
                <button className="icon-btn" style={{width:26,height:26}} onClick={() => setSettingsOpen(true)} title="Stats settings">
                    <Icon name="settings" size={15} />
                </button>
            </div>

            {/* Package info bar */}
            <div className="pkg-bar">
                {pkgItems.map(({ key, val }) => (
                    <div key={key} className="pkg-bar-item">
                        <span className="pkg-item-key">{key}</span>
                        <span className="pkg-item-val">{val ?? '—'}</span>
                    </div>
                ))}
            </div>

            {pollError && <div className="device-error" role="status">Device unreachable — showing last values. ({pollError})</div>}

            {/* CPU · Memory · Storage · FPS — combined horizontal strip */}
            {rawData
                ? <SystemMonitor
                    raw={rawData}
                    heapSize={heapSize}
                    dmaSize={dmaSize}
                    psRamSize={psRamSize}
                    maxSamples={maxSamples}
                    refreshRate={refreshRate}
                  />
                : <div className="loading">Fetching…</div>
            }

            {/* Settings modal */}
            {settingsOpen && (
                <div className="modal-overlay" onClick={() => setSettingsOpen(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:340}}>
                        <div className="modal-title">Stats Settings</div>
                        <div className="modal-body">
                            <div className="cfg-field">
                                <label className="cfg-label">Refresh rate (seconds)</label>
                                <input className="cfg-input" type="number" min={1} max={60} value={refreshRate}
                                    onChange={e => setRefreshRate(Math.min(60, Math.max(1, Number(e.target.value))))} />
                            </div>
                            <div className="cfg-field">
                                <label className="cfg-label">Sparkline history (samples)</label>
                                <input className="cfg-input" type="number" min={5} max={250} value={maxSamples}
                                    onChange={e => setMaxSamples(Math.min(250, Math.max(5, Number(e.target.value))))} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn primary" onClick={() => setSettingsOpen(false)}>Done</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StatsPanel;
