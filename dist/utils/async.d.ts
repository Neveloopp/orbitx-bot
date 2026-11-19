/** Waits `ms`, or less if the signal aborts. / Espera `ms`, o menos si la señal se cancela. */
export declare function sleep(ms: number, signal?: AbortSignal): Promise<void>;
/** True if the promise settled before `ms`. / True si la promesa terminó antes de `ms`. */
export declare function settledWithin(promise: Promise<unknown>, ms: number): Promise<boolean>;
