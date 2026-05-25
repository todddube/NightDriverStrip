import { useContext, useState, useRef, useEffect } from 'preact/hooks';
import Icon from '../Icon';
import { StatsContext } from '../../context/statsContext';

/* global __LOCAL_FIRMWARE_BUILD__, __GIT_HASH__, __GIT_DIRTY__ */
const LOCAL_BUILD = __LOCAL_FIRMWARE_BUILD__;
const GIT_HASH    = __GIT_HASH__;
const GIT_DIRTY   = __GIT_DIRTY__;

// Runtime origin detection — evaluated once at module load
const { hostname } = window.location;
const IS_LOCALHOST = hostname === 'localhost' || hostname === '127.0.0.1';
const IS_DEVICE    = /^192\.168\.\d+\.\d+$/.test(hostname) && !IS_LOCALHOST;
const SHOW_BANNER  = IS_LOCALHOST || IS_DEVICE;

const STEPS = [
    { key: 'build',  label: '1. Build site',     cmd: 'cd site && npm run build',              endpoint: '/__dev/build'  },
    { key: 'upload', label: '2. Upload firmware', cmd: 'pio run -e mesmerizer --target upload', endpoint: '/__dev/upload' },
];

const BTN_LABELS = {
    build:  { idle: '▶ Build',  running: '⟳ Building…',  success: '✓ Built',    error: '✗ Build Failed'  },
    upload: { idle: '▲ Upload', running: '⟳ Uploading…', success: '✓ Uploaded', error: '✗ Upload Failed' },
};

const DevBanner = () => {
    const { buildInfo } = useContext(StatsContext);
    const [dismissed,   setDismissed]   = useState(() => sessionStorage.getItem('devBannerDismissed') === LOCAL_BUILD);
    const [copied,      setCopied]      = useState(null);
    const [buildState,  setBuildState]  = useState('idle');   // idle|running|success|error
    const [uploadState, setUploadState] = useState('idle');
    const [output,      setOutput]      = useState('');
    const [showOutput,  setShowOutput]  = useState(false);
    const termRef = useRef(null);

    useEffect(() => {
        if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
    }, [output]);

    if (!SHOW_BANNER || dismissed) return null;

    const deviceReachable = !!buildInfo;
    const inSync = deviceReachable && buildInfo === LOCAL_BUILD && !GIT_DIRTY;
    const busy   = buildState === 'running' || uploadState === 'running';

    const dismiss = () => {
        sessionStorage.setItem('devBannerDismissed', LOCAL_BUILD);
        setDismissed(true);
    };

    const copy = (cmd, key) => {
        navigator.clipboard?.writeText(cmd);
        setCopied(key);
        setTimeout(() => setCopied(null), 2000);
    };

    const runCmd = async (endpoint, key) => {
        const setState = key === 'build' ? setBuildState : setUploadState;
        setState('running');
        setOutput('');
        setShowOutput(true);
        try {
            const res = await fetch(endpoint, { method: 'POST' });
            if (!res.ok) throw new Error(`Server returned ${res.status} — is the Vite dev server running?`);
            const reader = res.body.getReader();
            const dec    = new TextDecoder();
            let buf = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += dec.decode(value, { stream: true }).replace(/\r/g, '');
                const m = buf.match(/__EXIT_(\d+)__\n?/);
                if (m) {
                    setOutput(buf.replace(m[0], ''));
                    setState(parseInt(m[1]) === 0 ? 'success' : 'error');
                    return;
                }
                setOutput(buf);
            }
        } catch (e) {
            setOutput(prev => prev + `\nError: ${e.message}\n`);
            setState('error');
        }
    };

    const termClass = [
        'dev-terminal',
        (buildState === 'error'   || uploadState === 'error')   ? 'dev-terminal--error'   : '',
        (buildState === 'success' || uploadState === 'success') ? 'dev-terminal--success' : '',
    ].filter(Boolean).join(' ');

    // ── Compact panel when browsing directly from the device ──────────────────
    if (IS_DEVICE) {
        return (
            <div className={`dev-banner dev-banner--compact ${inSync ? 'dev-banner--sync' : 'dev-banner--drift'}`}>
                <div className="dev-banner-row">
                    <span className={`dev-status-dot ${inSync ? 'sync' : 'drift'}`} />
                    <span className="dev-banner-title">
                        Served from device ({hostname})
                        {inSync ? ' · firmware up to date' : ' · firmware mismatch'}
                    </span>
                    <code className="dev-ver-val" style={{ marginLeft: 8 }}>
                        {LOCAL_BUILD}
                        <span className="dev-hash"> ({GIT_HASH})</span>
                    </code>
                    {!inSync && buildInfo && (
                        <code className="dev-ver-val dev-ver-stale" style={{ marginLeft: 4 }}>
                            → device: {buildInfo}
                        </code>
                    )}
                    <button className="icon-btn dev-dismiss" onClick={dismiss} title="Dismiss">
                        <Icon name="close" size={14} />
                    </button>
                </div>
            </div>
        );
    }

    // ── Full panel when running via Vite dev server (localhost) ───────────────
    return (
        <div className={`dev-banner ${inSync ? 'dev-banner--sync' : 'dev-banner--drift'}`}>

            {/* ── Header ── */}
            <div className="dev-banner-row">
                <span className={`dev-status-dot ${inSync ? 'sync' : 'drift'}`} />
                <span className="dev-banner-title">
                    {!deviceReachable
                        ? `Localhost dev mode — device at ${IS_LOCALHOST ? '192.168.4.36' : hostname} not reachable`
                        : inSync
                            ? 'Localhost dev mode — device is up to date'
                            : 'Localhost dev mode — local build not deployed to device'}
                </span>
                {GIT_DIRTY && <span className="dev-badge dirty">uncommitted changes</span>}
                <button className="icon-btn dev-dismiss" onClick={dismiss} title="Dismiss">
                    <Icon name="close" size={14} />
                </button>
            </div>

            {/* ── Version comparison ── */}
            <div className="dev-versions">
                <div className="dev-ver-row">
                    <span className="dev-ver-label">Local build</span>
                    <code className="dev-ver-val">
                        {LOCAL_BUILD}
                        <span className="dev-hash"> ({GIT_HASH}{GIT_DIRTY ? '*' : ''})</span>
                    </code>
                </div>
                <div className="dev-ver-row">
                    <span className="dev-ver-label">Device</span>
                    <code className={`dev-ver-val${!inSync && deviceReachable ? ' dev-ver-stale' : ''}`}>
                        {buildInfo ?? '—'}
                    </code>
                </div>
            </div>

            {/* ── Commands: copy box + Copy + Run buttons ── */}
            <div className="dev-cmds">
                {STEPS.map(({ key, label, cmd, endpoint }) => {
                    const state    = key === 'build' ? buildState : uploadState;
                    const btnLabel = BTN_LABELS[key][state] ?? BTN_LABELS[key].idle;
                    return (
                        <div key={key} className="dev-cmd-row">
                            <span className="dev-cmd-label">{label}</span>
                            <code className="dev-cmd">{cmd}</code>
                            <button className="dev-copy-btn" disabled={busy} onClick={() => copy(cmd, key)}>
                                {copied === key ? '✓ Copied' : 'Copy'}
                            </button>
                            <button
                                className={`dev-run-btn dev-run-btn--${state}`}
                                disabled={busy}
                                onClick={() => runCmd(endpoint, key)}
                            >
                                {btnLabel}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* ── Output toggle ── */}
            {output && (
                <button className="dev-toggle-output" onClick={() => setShowOutput(v => !v)}>
                    {showOutput ? 'Hide output ▲' : 'Show output ▼'}
                </button>
            )}

            {/* ── Streaming terminal ── */}
            {showOutput && output && (
                <div ref={termRef} className={termClass}>{output}</div>
            )}
        </div>
    );
};

export default DevBanner;
