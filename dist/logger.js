const RANK = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
const PALETTE = {
    brand: '38;5;99',
    accent: '38;5;45',
    dim: '38;5;244',
    debug: '38;5;244',
    info: '38;5;45',
    warn: '38;5;214',
    error: '38;5;203',
};
function colorEnabled(stream) {
    if (process.env['NO_COLOR'])
        return false;
    const force = process.env['FORCE_COLOR'];
    if (force !== undefined && force !== '0')
        return true;
    return Boolean(stream.isTTY);
}
function paint(enabled, code, text) {
    return enabled ? `\u001b[${code}m${text}\u001b[0m` : text;
}
function clock() {
    return new Date().toTimeString().slice(0, 8);
}
function metaText(meta) {
    if (meta === undefined)
        return '';
    if (meta instanceof Error)
        return ` ${meta.message}`;
    if (typeof meta === 'string')
        return ` ${meta}`;
    try {
        return ` ${JSON.stringify(meta)}`;
    }
    catch {
        return ` ${String(meta)}`;
    }
}
export const silentLogger = {
    debug() { },
    info() { },
    warn() { },
    error() { },
};
/** Branded console logger. / Logger de consola con la identidad de ORBITX. */
export function createLogger(level = 'info') {
    if (level === 'silent')
        return silentLogger;
    const threshold = RANK[level];
    const write = (name, message, meta) => {
        if (RANK[name] < threshold)
            return;
        const stream = name === 'warn' || name === 'error' ? process.stderr : process.stdout;
        const color = colorEnabled(stream);
        const tag = paint(color, PALETTE.brand, '◉ ORBITX');
        const time = paint(color, PALETTE.dim, clock());
        const label = paint(color, PALETTE[name], name.padEnd(5));
        stream.write(`${tag}  ${time}  ${label}  ${message}${metaText(meta)}\n`);
    };
    return {
        debug: (message, meta) => write('debug', message, meta),
        info: (message, meta) => write('info', message, meta),
        warn: (message, meta) => write('warn', message, meta),
        error: (message, meta) => write('error', message, meta),
    };
}
export function resolveLogger(option) {
    if (option === false)
        return silentLogger;
    if (option === undefined)
        return createLogger('info');
    if (typeof option === 'string')
        return createLogger(option);
    return option;
}
