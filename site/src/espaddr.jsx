// Where the UI finds the device.
//  - Production build (served by the device itself): same-origin relative URLs.
//  - Dev server (`npm start`): the board at VITE_DEVICE_IP, set in site/.env.local
//    (see .env.example); falls back to the Mesmerizer's usual address.
const DEFAULT_DEV_IP = "192.168.4.36";

const address = import.meta.env.DEV
    ? (import.meta.env.VITE_DEVICE_IP || DEFAULT_DEV_IP)
    : undefined;
const httpPrefix = address ? `http://${address}` : undefined;
const wsPrefix   = address ? `ws://${address}/ws` : `ws://${window.location.host}/ws`;

export { address, httpPrefix, wsPrefix };
