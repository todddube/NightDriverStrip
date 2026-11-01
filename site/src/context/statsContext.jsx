import { createContext, useEffect, useState } from "react";
import { getJson } from "../api/device";

const StatsContext = createContext(undefined);

const StatsProvider = ({ children }) => {
    const [stats, setStats] = useState({
        buildInfo: null, flashVersion: null,
        chipCores: 1, chipModel: 'ESP32', chipSpeed: 240,
        codeFree: 0, codeSize: 0, dmaSize: 0,
        effectsSocket: false, flashSize: 0, framesSocket: false,
        fsSize: 0, fsUsed: 0,
        heapSize: 0, matrixHeight: 32, matrixWidth: 64,
        progSize: 0, psRamSize: 0,
    });

    const [error, setError] = useState(null);

    // Load once; if the device isn't reachable yet, keep retrying every 5s.
    useEffect(() => {
        let timer;
        let cancelled = false;
        const load = () => getJson("/statistics/static")
            .then(s => setStats({
                chipCores:    s.CHIP_CORES,
                chipModel:    s.CHIP_MODEL,
                chipSpeed:    s.CHIP_SPEED,
                codeFree:     s.CODE_FREE,
                codeSize:     s.CODE_SIZE,
                dmaSize:      s.DMA_SIZE,
                buildInfo:    s.BUILD_INFO ?? null,
                flashVersion: s.FLASH_VERSION_NAME ?? null,
                effectsSocket:s.EFFECTS_SOCKET,
                flashSize:    s.FLASH_SIZE,
                framesSocket: s.FRAMES_SOCKET,
                fsSize:       s.FS_SIZE ?? 0,
                fsUsed:       s.FS_USED ?? 0,
                heapSize:     s.HEAP_SIZE,
                matrixHeight: s.MATRIX_HEIGHT,
                matrixWidth:  s.MATRIX_WIDTH,
                progSize:     s.PROG_SIZE,
                psRamSize:    s.PSRAM_SIZE,
            }))
            .then(() => { if (!cancelled) setError(null); })
            .catch(err => {
                if (cancelled) return;
                setError(err.message);
                timer = setTimeout(load, 5000);
            });
        load();
        return () => { cancelled = true; clearTimeout(timer); };
    }, []);

    return <StatsContext.Provider value={{ ...stats, error }}>{children}</StatsContext.Provider>;
};

export { StatsContext, StatsProvider };
