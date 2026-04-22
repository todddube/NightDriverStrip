import { useEffect, useState, useContext } from 'preact/hooks';
import { StatsContext } from '../../../context/statsContext';
import logoSrc from '../../../assets/lowreslogo.jpg';

const SPLASH_DURATION = 5000; // ms

const SplashScreen = ({ onDismiss }) => {
    const { buildInfo } = useContext(StatsContext);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const start = performance.now();
        let raf;
        const tick = (now) => {
            const pct = Math.min((now - start) / SPLASH_DURATION * 100, 100);
            setProgress(pct);
            if (pct < 100) {
                raf = requestAnimationFrame(tick);
            } else {
                onDismiss();
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [onDismiss]);

    return (
        <div className="splash-overlay" onClick={onDismiss}>
            <div className="splash-card" onClick={e => e.stopPropagation()}>
                <img className="splash-logo" src={logoSrc} alt="NightDriverStrip" />
                <div className="splash-info">
                    <span className="splash-project">NightDriverStrip</span>
                    <span className="splash-repo">github.com/PlummersSoftwareLLC</span>
                    {buildInfo
                        ? <span className="splash-build">Built {buildInfo}</span>
                        : <span className="splash-build splash-build--dim">Build info unavailable</span>
                    }
                </div>
                <div className="splash-progress-track">
                    <div className="splash-progress-bar" style={{ width: `${progress}%` }} />
                </div>
                <button className="splash-skip" onClick={onDismiss}>Skip</button>
            </div>
        </div>
    );
};

export default SplashScreen;
