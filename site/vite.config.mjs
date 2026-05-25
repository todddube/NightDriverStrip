import { defineConfig }  from 'vite'
import { execSync, spawn } from 'child_process'
import { readFileSync }    from 'fs'
import { fileURLToPath }   from 'url'
import { dirname, join }   from 'path'
import preact              from '@preact/preset-vite'
import viteCompression     from 'vite-plugin-compression'
import { viteStaticCopy }  from 'vite-plugin-static-copy'

const __dirname = dirname(fileURLToPath(import.meta.url));
const siteDir   = __dirname;
const rootDir   = join(__dirname, '..');

// Read firmware build timestamp from the header file so the dev banner
// can compare it to what's currently running on the device.
let firmwareBuildTimestamp = 'unknown';
try {
    const header = readFileSync(join(rootDir, 'include/build_timestamp.h'), 'utf-8');
    const match  = header.match(/BUILD_TIMESTAMP\s+"([^"]+)"/);
    if (match) firmwareBuildTimestamp = match[1];
} catch (_) {}

// Inject current git state so the banner can warn about uncommitted changes.
let gitHash = 'unknown';
let gitDirty = false;
try {
    gitHash  = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf-8' }).trim();
    gitDirty = execSync('git status --porcelain',     { cwd: rootDir, encoding: 'utf-8' }).trim().length > 0;
} catch (_) {}

// Dev-only API plugin — exposes POST /__dev/build and /__dev/upload so the
// DevBanner can trigger builds and firmware uploads directly from the browser.
const devApiPlugin = () => ({
    name: 'dev-api',
    configureServer(server) {
        const addCmd = (route, cwd, file, args) => {
            server.middlewares.use(route, (req, res) => {
                if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                res.setHeader('Cache-Control', 'no-cache');
                const proc = spawn(file, args, { cwd, shell: true });
                proc.stdout.on('data', d => res.write(d));
                proc.stderr.on('data', d => res.write(d));
                proc.on('close',  code => { res.write(`\n__EXIT_${code}__\n`); res.end(); });
                proc.on('error',  err  => { res.write(`\nFailed to start: ${err.message}\n__EXIT_1__\n`); res.end(); });
            });
        };
        addCmd('/__dev/build',  siteDir, 'npm', ['run', 'build']);
        addCmd('/__dev/upload', rootDir, 'pio', ['run', '-e', 'mesmerizer', '--target', 'upload']);
    },
});

export default defineConfig({
    define: {
        __LOCAL_FIRMWARE_BUILD__: JSON.stringify(firmwareBuildTimestamp),
        __GIT_HASH__:             JSON.stringify(gitHash),
        __GIT_DIRTY__:            JSON.stringify(gitDirty),
    },
    root: 'src',
    plugins: [
        preact(),
        devApiPlugin(),
        viteStaticCopy({
            targets: [{ src: '../../assets/favicon.ico', dest: '' }]
        }),
        viteCompression({
            filter:           /\.(js|mjs|json|css|html|ico)$/i,
            deleteOriginFile: true,
            threshold:        0,
        }),
    ],
    server: { port: 9000 },
    build: {
        outDir: '../dist',
        rollupOptions: {
            output: {
                entryFileNames: '[name].js',
                chunkFileNames: '[name].js',
                assetFileNames: '[name].[ext]',
                format: 'iife',
            },
        },
    },
})
