import type { Context, WaitOptions } from './context.js';
/** People the bot is waiting an answer from. / Personas de las que el bot espera una respuesta. */
export declare class Waiters {
    #private;
    wait(ctx: Context, options?: WaitOptions): Promise<Context | null>;
    /** Gives the update to whoever waits for it; true if it was taken. / Entrega la actualización a quien la espera; true si fue tomada. */
    offer(ctx: Context): boolean;
    cancel(ctx: Context): void;
    clear(): void;
}
