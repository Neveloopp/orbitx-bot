import type { Update } from '../types/entities.js';
export interface PollerOptions {
    minBackoffMs: number;
    maxBackoffMs: number;
    fetchUpdates(offset: number, signal: AbortSignal): Promise<Update[]>;
    onUpdate(update: Update): Promise<void>;
    onError(error: unknown): void;
}
/** Asks the server for updates again and again until stopped. / Pide actualizaciones al servidor una y otra vez hasta que se detiene. */
export declare class Poller {
    #private;
    constructor(options: PollerOptions);
    get stopped(): boolean;
    run(): Promise<void>;
    stop(): void;
}
