import { useState } from 'react';
import MainApp from './home/home';
import LiteView from './home/lite/LiteView';
import { getUiMode, setUiMode } from '../util/uiMode';

const App = () => {
    const [mode, setMode] = useState(getUiMode);
    const change = next => { setUiMode(next); setMode(next); };

    return mode === 'lite'
        ? <LiteView onSwitchToFull={() => change('full')} />
        : <MainApp onSwitchToLite={() => change('lite')} />;
};

export default App;
