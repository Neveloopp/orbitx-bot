/** Runs updates of the same chat in order and different chats side by side. / Corre las actualizaciones de un mismo chat en orden y de chats distintos en paralelo. */
export declare class Scheduler {
    #private;
    constructor(limit: number);
    submit(key: string, task: () => Promise<void>): Promise<void>;
    /** Frees the worker and the chat while `work` waits (for example for an answer from a person). / Libera al trabajador y al chat mientras `work` espera (por ejemplo la respuesta de una persona). */
    suspend<T>(work: Promise<T>): Promise<T>;
    /** True when everything finished before the time ran out. / True si todo terminó antes de acabarse el tiempo. */
    idle(timeoutMs: number): Promise<boolean>;
}
