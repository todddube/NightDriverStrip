import { useContext, useState, useRef, useEffect } from 'preact/hooks';
import { Fragment } from 'preact';
import Icon from '../Icon';
import { StatsContext } from '../../context/statsContext';
import { readText, writeText } from '../../util/storage';
import { address } from '../../espaddr';

const LOCAL_BUILD = __LOCAL_FIRMWARE_BUILD__;
const GIT_HASH    = __GIT_HASH__;
const GIT_DIRTY   = __GIT_DIRTY__;

// Runtime origin detection — evaluated once at module load
const { hostname } = window.location;
const IS_LOCALHOST = hostname === 'localhost' || hostname === '127.0.0.1';
const IS_DEVICE    = /^192\.168\.\d+\.\d+$/.test(hostname) && !IS_LOCALHOST;
// The full panel needs the Vite dev server's /__dev/* endpoints, so on localhost it only
// shows under `npm start` (not `npm run local`). The compact panel is just a version check.
const SHOW_BANNER  = IS_DEVICE || (IS_LOCALHOST && import.meta.env.DEV);

const STEPS = [
    { key: 'build',  n: 1, title: 'Build site',      icon: 'build',        cmd: 'cd site && npm run build',              endpoint: '/__dev/build',  action: 'Build',  doing: 'Building…',  done: 'Built'    },
    { key: 'upload', n: 2, title: 'Upload firmware', icon: 'cloud_upload', cmd: 'pio run -e mesmerizer --target upload', endpoint: '/__dev/upload', action: 'Upload', doing: 'Uploading…', done: 'Uploaded' },
];

const STATE_LABEL = { idle: 'Ready', running: 'Running', success: 'Done', error: 'Failed' };

// Colour a build-log line by what it says.
const lineClass = line =>
    /error|failed|✗|traceback/i.test(line) ? 'err'
    : /warn/i.test(line)                    ? 'warn'
    : /success|✓|\bdone\b|built in/i.test(line) ? 'ok'
    : '';

const StepCard = ({ step, state, busy, copied, onRun, onCopy }) => (
    <div className={`dev-step dev-step--${state}`}>
        <div className="dev-step-head">
            <span className="dev-step-icon"><Icon name={step.icon} size={20} /></span>
            <div className="dev-step-title">
                <span className="dev-step-n">STEP {step.n}</span>
                <span className="dev-step-name">{step.title}</span>
            </div>
            <span className={`dev-chip dev-chip--${state}`}>
                {state === 'success' && <Icon name="check_circle" size={13} />}
                {state === 'error'   && <Icon name="error" size={13} />}
                {STATE_LABEL[state]}
            </span>
        </div>
        <div className="dev-progress" aria-hidden="true"><div className="dev-progress-bar" /></div>
        <div className="dev-step-cmd">
            <code title={step.cmd}>{step.cmd}</code>
            <button className="icon-btn" onClick={() => onCopy(step.cmd, step.key)} title="Copy command" aria-label={`Copy ${step.title} command`}>
                <Icon name={copied === step.key ? 'check_circle' : 'content_copy'} size={14} />
            </button>
        </div>
        <button className="btn dev-step-run" disabled={busy} onClick={onRun}>
            <Icon name={state === 'running' ? 'refresh' : 'play'} size={15} className={state === 'running' ? 'spin' : ''} />
            {state === 'running' ? step.doing : state === 'success' ? `${step.done} · run again` : step.action}
        </button>
    </div>
);

const VersionTile = ({ label, value, hash, stale }) => (
    <div className={`dev-ver${stale ? ' dev-ver--stale' : ''}`}>
        <span className="dev-ver-label">{label}</span>
        <span className="dev-ver-value">{value ?? '—'}</span>
        {hash && <span className="dev-ver-hash">{hash}</span>}
    </div>
);

const DevBanner = () => {
    const { buildInfo } = useContext(StatsContext);
    const [dismissed,   setDismissed]   = useState(() => readText('devBannerDismissed', { session: true }) === LOCAL_BUILD);
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
    const inSync = deviceReachable && buildInfo === LOCAL_BUILD;
    const busy   = buildState === 'running' || uploadState === 'running';

    const dismiss = () => {
        writeText('devBannerDismissed', LOCAL_BUILD, { session: true });
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
                    const ok = parseInt(m[1]) === 0;
                    setState(ok ? 'success' : 'error');
                    return ok;
                }
                setOutput(buf);
            }
            setState('error');   // stream ended without an exit marker
            return false;
        } catch (e) {
            setOutput(prev => prev + `\nError: ${e.message}\n`);
            setState('error');
            return false;
        }
    };

    // Build, then upload only if the build succeeded.
    const runAll = async () => { if (await runCmd(STEPS[0].endpoint, 'build')) await runCmd(STEPS[1].endpoint, 'upload'); };

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
    const stateOf  = key => (key === 'build' ? buildState : uploadState);
    const headline = !deviceReachable ? `Device at ${address} not reachable`
                   : inSync           ? 'Device is up to date'
                   :                    'Local build not deployed to device';
    const tone     = inSync ? 'sync' : 'drift';
    const logLines = output.split('\n');

    return (
        <section className={`dev-banner dev-banner--${tone}`} aria-label="Deploy to device">
            <header className="dev-head">
                <span className={`dev-status-ring ${tone}`}><Icon name={inSync ? 'check_circle' : 'cloud_upload'} size={22} /></span>
                <div className="dev-head-text">
                    <span className="dev-eyebrow">DEV MODE · LOCALHOST</span>
                    <span className="dev-headline">{headline}</span>
                </div>
                {GIT_DIRTY && <span className="dev-badge dirty">uncommitted changes</span>}
                <button className="btn primary dev-all" disabled={busy} onClick={runAll}>
                    <Icon name="cloud_upload" size={16} /> Build &amp; Upload
                </button>
                <button className="icon-btn dev-dismiss" onClick={dismiss} title="Dismiss" aria-label="Dismiss">
                    <Icon name="close" size={14} />
                </button>
            </header>

            <div className="dev-compare">
                <VersionTile label="Local build" value={LOCAL_BUILD} hash={`${GIT_HASH}${GIT_DIRTY ? '*' : ''}`} />
                <span className={`dev-compare-arrow ${tone}`}><Icon name="arrow_forward" size={18} /></span>
                <VersionTile label="Device" value={buildInfo} stale={deviceReachable && !inSync} />
            </div>

            <div className="dev-pipeline">
                {STEPS.map((step, i) => (
                    <Fragment key={step.key}>
                        {i > 0 && <span className="dev-pipe-link" aria-hidden="true" />}
                        <StepCard
                            step={step}
                            state={stateOf(step.key)}
                            busy={busy}
                            copied={copied}
                            onCopy={copy}
                            onRun={() => runCmd(step.endpoint, step.key)}
                        />
                    </Fragment>
                ))}
            </div>

            {output && (
                <div className="dev-log">
                    <div className="dev-log-bar">
                        <button className="dev-toggle-output" onClick={() => setShowOutput(v => !v)} aria-expanded={showOutput}>
                            <Icon name="chevron_right" size={14} className={`fx-section-chevron${showOutput ? ' open' : ''}`} />
                            Build log
                        </button>
                        <button className="icon-btn" onClick={() => copy(output, 'log')} title="Copy log" aria-label="Copy log">
                            <Icon name={copied === 'log' ? 'check_circle' : 'content_copy'} size={14} />
                        </button>
                    </div>
                    {showOutput && (
                        <div ref={termRef} className={termClass}>
                            {logLines.map((line, i) => <div key={i} className={`dev-line ${lineClass(line)}`}>{line || '\u00a0'}</div>)}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default DevBanner;
