import { availableParallelism, cpus, freemem, totalmem } from 'node:os';

export interface BudgetOptions {
  fraction: number;
  minBytes: number;
  maxBytes: number;
}

interface MemoryProcess {
  availableMemory?: () => number;
  constrainedMemory?: () => number;
}

const MIB = 1024 * 1024;

/** Bytes this process can still use: the container limit counts, not only the host. / Bytes que este proceso aún puede usar: cuenta el límite del contenedor, no solo el host. */
export function availableMemory(): number {
  const proc = process as unknown as MemoryProcess;
  if (typeof proc.availableMemory === 'function') {
    const value = proc.availableMemory();
    if (Number.isFinite(value) && value > 0) return value;
  }
  const host = freemem();
  const limit = typeof proc.constrainedMemory === 'function' ? proc.constrainedMemory() : 0;
  if (limit > 0 && limit < totalmem()) {
    return Math.max(0, Math.min(host, limit - process.memoryUsage.rss()));
  }
  return host;
}

/** How many bytes the cache may hold now: a share of the free memory, within limits. / Cuántos bytes puede guardar la caché ahora: una parte de la memoria libre, dentro de límites. */
export function createBudget(options: BudgetOptions, probe: () => number = availableMemory): () => number {
  let checkedAt = 0;
  let value = options.minBytes;
  return () => {
    const now = Date.now();
    if (now - checkedAt >= 2000) {
      checkedAt = now;
      let free = 0;
      try {
        free = probe();
      } catch {
        free = 0;
      }
      value = Math.min(options.maxBytes, Math.max(options.minBytes, Math.floor(free * options.fraction)));
    }
    return value;
  };
}

/** Workers that fit the CPUs and the free memory (8 to 64). / Trabajadores que caben en las CPU y la memoria libre (de 8 a 64). */
export function autoConcurrency(probe: () => number = availableMemory): number {
  const threads = typeof availableParallelism === 'function' ? availableParallelism() : cpus().length;
  const byMemory = Math.floor(probe() / (8 * MIB));
  return Math.max(8, Math.min(64, threads * 8, byMemory));
}
