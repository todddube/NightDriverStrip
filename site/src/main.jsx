import { createRoot } from 'react-dom/client';
import MainApp from './components/home/home';
import { EffectsProvider } from './context/effectsContext';
import { StatsProvider } from './context/statsContext';
import { applyTheme, getThemePref } from './util/theme';
import './styles.css';

applyTheme(getThemePref());

const root = createRoot(document.getElementById('root'));
root.render(
    <StatsProvider>
        <EffectsProvider>
            <MainApp/>
        </EffectsProvider>
    </StatsProvider>
);
