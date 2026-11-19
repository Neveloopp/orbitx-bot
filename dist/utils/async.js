/** Waits `ms`, or less if the signal aborts. / Espera `ms`, o menos si la señal se cancela. */
export function sleep(ms, signal) {
    return new Promise((resolve) => {
        if (signal?.aborted)
            return resolve();
        const timer = setTimeout(done, ms);
        function done() {
            clearTimeout(timer);
            signal?.removeEventListener('abort', done);
            resolve();
        }
        signal?.addEventListener('abort', done, { once: true });
    });
}
/** True if the promise settled before `ms`. / True si la promesa terminó antes de `ms`. */
export async function settledWithin(promise, ms) {
    let timer;
    const timeout = new Promise((resolve) => {
        timer = setTimeout(() => resolve(false), ms);
    });
    try {
        return await Promise.race([promise.then(() => true, () => true), timeout]);
    }
    finally {
        clearTimeout(timer);
    }
}
