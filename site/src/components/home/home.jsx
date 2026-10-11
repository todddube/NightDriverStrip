import { useState, useCallback, useContext, useEffect } from 'react';
import Icon from '../Icon';
import { EffectsContext } from '../../context/effectsContext';
import { StatsContext } from '../../context/statsContext';
import StatsPanel from './statistics/stats';
import DesignerPanel from './designer/designer';
import ConfigDialog from './config/configDialog';
import PreviewDialog from './designer/colordata/previewDialog';
import NotificationPanel from './notifications/notifications';
import SplashScreen from './splash/SplashScreen';
import DevBanner from './DevBanner';
import httpPrefix from '../../espaddr';
import { applyTheme, getThemePref, saveThemePref, nextThemePref, resolveTheme, onSystemThemeChange } from '../../util/theme';

const resetUrl = `${httpPrefix !== undefined ? httpPrefix : ""}/reset`;

const THEME_UI = {
    system: { icon: 'brightness_auto', label: 'System theme' },
    light:  { icon: 'light_mode',      label: 'Light mode'   },
    dark:   { icon: 'dark_mode',       label: 'Dark mode'    },
};

const MainApp = () => {
    const [themePref, setThemePref] = useState(getThemePref);
    const [, setSystemTick] = useState(0);   // re-render when the OS theme flips
    const [drawer,   setDrawer]   = useState(false);
    const [showStats,   setStats]   = useState(() => {
        const c = JSON.parse(localStorage.getItem('config') || '{}');
        return c.stats !== undefined ? c.stats : true;
    });
    const [showDesign,  setDesign]  = useState(() => {
        const c = JSON.parse(localStorage.getItem('config') || '{}');
        return c.designer !== undefined ? c.designer : true;
    });
    const [settings, setSettings] = useState(false);
    const [preview,  setPreview]  = useState(false);
    const [devCtrl,  setDevCtrl]  = useState(null); // anchor element
    const [notifications, setNotifications] = useState([]);
    const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splashSeen'));
    const dismissSplash = useCallback(() => {
        sessionStorage.setItem('splashSeen', '1');
        setShowSplash(false);
    }, []);

    const { sync } = useContext(EffectsContext);
    const { framesSocket, buildInfo, flashVersion } = useContext(StatsContext);

    // In 'system' mode, follow OS light/dark changes live.
    useEffect(() => {
        applyTheme(themePref);
        if (themePref !== 'system') return undefined;
        return onSystemThemeChange(() => {
            applyTheme('system');
            setSystemTick(t => t + 1);
        });
    }, [themePref]);

    const cycleTheme = () => {
        const next = nextThemePref(themePref);
        saveThemePref(next);
        applyTheme(next);
        setThemePref(next);
    };
    const themeUi    = THEME_UI[themePref];
    const themeTitle = `${themeUi.label}${themePref === 'system' ? ` (${resolveTheme('system')})` : ''}. Click for ${THEME_UI[nextThemePref(themePref)].label.toLowerCase()}`;

    const saveLayout = (stats, designer) => {
        localStorage.setItem('config', JSON.stringify({ stats, designer }));
    };

    const addNotification = (level, type, target, notification) => {
        setNotifications(prev => {
            const group = prev.find(n => n.level === level && n.type === type && n.target === target)
                       || { level, type, target, notifications: [] };
            group.notifications.push({ date: new Date(), notification });
            return [...prev.filter(n => n !== group), group];
        });
    };

    const navItems = [
        { label: 'Home',       icon: 'home',        active: showDesign,  toggle: () => { const v = !showDesign; setDesign(v);  saveLayout(showStats, v); } },
        { label: 'Statistics', icon: 'area_chart',  active: showStats,   toggle: () => { const v = !showStats;  setStats(v);   saveLayout(v, showDesign); } },
    ];

    return (
        <>
            {showSplash && <SplashScreen onDismiss={dismissSplash} />}
            {/* App bar */}
            <header className={`appbar${drawer ? ' open' : ''}`}>
                <button className="icon-btn" onClick={() => setDrawer(d => !d)} aria-label="toggle drawer">
                    <Icon name={drawer ? 'chevron_left' : 'menu'} />
                </button>
                <span className="appbar-title-group">
                    <span className="appbar-title">NightDriverStrip</span>
                    {buildInfo && <span className="appbar-build">{flashVersion ? `${flashVersion} · ${buildInfo}` : buildInfo}</span>}
                </span>
                {notifications.length > 0 &&
                    <NotificationPanel notifications={notifications} clearNotifications={() => setNotifications([])} />
                }
            </header>

            {/* Side drawer */}
            <nav className={`drawer${drawer ? '' : ' closed'}`}>
                <div className="drawer-header">
                    <div className="flex-grow" />
                    <button className="icon-btn" onClick={() => setDrawer(false)}>
                        <Icon name="chevron_left" />
                    </button>
                </div>
                <hr className="divider" />
                <ul className="drawer-nav">
                    {navItems.map(item => (
                        <li key={item.icon} className="drawer-nav-item">
                            <button
                                className={`icon-btn${item.active ? ' active' : ''}`}
                                onClick={item.toggle}
                                title={item.label}
                            >
                                <Icon name={item.icon} />
                            </button>
                            <span className="nav-label" style={{fontSize:'13px'}}>{item.label}</span>
                        </li>
                    ))}
                    <li className="drawer-nav-item">
                        <button className="icon-btn" onClick={() => setSettings(s => !s)} title="Settings">
                            <Icon name="settings" />
                        </button>
                        <span className="nav-label" style={{fontSize:'13px'}}>Settings</span>
                    </li>
                    <li className="drawer-nav-item">
                        <button
                            className="icon-btn"
                            disabled={!framesSocket}
                            onClick={() => setPreview(p => !p)}
                            title="Preview frames"
                        >
                            <Icon name="smart_display" />
                        </button>
                        <span className="nav-label" style={{fontSize:'13px'}}>Preview</span>
                    </li>
                    <li className="drawer-nav-item" onClick={e => setDevCtrl(devCtrl ? null : e.currentTarget)}>
                        <button className="icon-btn" title="Device control">
                            <Icon name="power" />
                        </button>
                        <span className="nav-label" style={{fontSize:'13px'}}>Device Control</span>
                    </li>
                </ul>

                {/* Theme toggle, pinned to the bottom so it's reachable when the drawer is collapsed */}
                <div className="drawer-footer">
                    <hr className="divider" />
                    <div className="drawer-nav-item" onClick={cycleTheme}>
                        <button className="icon-btn" title={themeTitle} aria-label={themeTitle}>
                            <Icon name={themeUi.icon} />
                        </button>
                        <span className="nav-label" style={{fontSize:'13px'}}>
                            {themeUi.label}
                            {themePref === 'system' && <span className="nav-sublabel"> · {resolveTheme('system')}</span>}
                        </span>
                    </div>
                </div>
            </nav>

            {/* Main content */}
            <main className={`main-content${drawer ? ' open' : ''}`}>
                <DevBanner />
                <StatsPanel  open={showStats}  addNotification={addNotification} />
                <DesignerPanel open={showDesign} addNotification={addNotification} />
            </main>

            {/* Device control menu */}
            {devCtrl && (
                <>
                    <div style={{position:'fixed',inset:0,zIndex:1399}} onClick={() => setDevCtrl(null)} />
                    <div className="dev-ctrl" style={{top: devCtrl.getBoundingClientRect().bottom + 4, left: devCtrl.getBoundingClientRect().left}}>
                        <button className="btn" onClick={() => {
                            fetch(resetUrl, {method:'POST', body: new URLSearchParams({board:1})});
                            setDevCtrl(null);
                        }}>Reboot Device</button>
                        <button className="btn" onClick={() => {
                            fetch(resetUrl, {method:'POST', body: new URLSearchParams({board:1, deviceConfig:1})});
                            setDevCtrl(null);
                        }}>Reset Device Config</button>
                        <button className="btn" onClick={() => {
                            fetch(resetUrl, {method:'POST', body: new URLSearchParams({board:1, effectsConfig:1})});
                            setDevCtrl(null);
                        }}>Reset Effect Settings</button>
                    </div>
                </>
            )}

            {settings && <ConfigDialog heading="Device Settings" open={settings} setOpen={setSettings} saveCallback={sync} />}
            {preview  && <PreviewDialog open={preview} onClose={() => setPreview(false)} />}
        </>
    );
};

export default MainApp;
