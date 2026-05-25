import { useContext, useState, useRef, useEffect } from 'preact/hooks';
import Icon from '../Icon';
import { StatsContext } from '../../context/statsContext';

/* global __LOCAL_FIRMWARE_BUILD__, __GIT_HASH__, __GIT_DIRTY__ */
const LOCAL_BUILD = __LOCAL_FIRMWARE_BUILD__;
const GIT_HASH    = __GIT_HASH__;
const GIT_DIRTY   = __GIT_DIRTY__;

const STEPS = [
    { key: 'build',  label: '1. Build site',     cmd: 'cd site && npm run build',               endpoint: '/__dev/build'  },
    { key: 'upload', label: '2. Upload firmware', cmd: 'pio run -e mesmerizer --target upload',  endpoint: '/__dev/upload' },
];

const BTN_LABELS = {
    build:  { idle: '▶ Build',  running: '⟳ Building…',  success: '✓ Built',    error: '✗ Build Failed'  },
    upload: { idle: '▲ Upload', running: '⟳ Uploading…', success: '✓ Uploaded', error: '✗ Upload Failed' },
};

const DevBanner = () => {
    const { buildInfo } = useContext(StatsContext);
    const [dismissed,   setDismissed]   = useState(false);
    const [copied,      setCopied]      = useState(null);
    const [buildState,  setBuildState]  = useState('idle');   // idle|running|success|error
    const [uploadState, setUploadState] = useState('idle');
    const [output,      setOutput]      = useState('');
    const [showOutput,  setShowOutput]  = useState(false);
    const termRef = useRef(null);

    useEffect(() => {
        if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
    }, [output]);

    if (!import.meta.env.DEV || dismissed) return null;

    const deviceReachable = !!buildInfo;
    const inSync = deviceReachable && buildInfo === LOCAL_BUILD && !GIT_DIRTY;
    const busy   = buildState === 'running' || uploadState === 'running';

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
            if (!res.ok) throw new Error(`Server returned ${res.status} — is the dev server running?`);
            const reader = res.body.getReader();
            const dec = new TextDecoder();
            let buf = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                // Strip carriage returns — pio uses \r for progress bar updates
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

    return (
        <div className={`dev-banner ${inSync ? 'dev-banner--sync' : 'dev-banner--drift'}`}>

            {/* ── Header ── */}
            <div className="dev-banner-row">
                <span className={`dev-status-dot ${inSync ? 'sync' : 'drift'}`} />
                <span className="dev-banner-title">
                    {!deviceReachable
                        ? 'Dev mode — device not reachable'
                        : inSync
                            ? 'Dev mode — device is up to date'
                            : 'Dev mode — local build not deployed to device'}
                </span>
                {GIT_DIRTY && <span className="dev-badge dirty">uncommitted changes</span>}
                <button className="icon-btn dev-dismiss" onClick={() => setDismissed(true)} title="Dismiss">
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
                            <button
                                className="dev-copy-btn"
                                onClick={() => copy(cmd, key)}
                                disabled={busy}
                            >
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
