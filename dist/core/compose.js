import { StateError } from '../errors.js';
/** Chains middlewares: each one decides to call next(). / Encadena middlewares: cada uno decide si llama a next(). */
export function compose(stack) {
    return (ctx, done) => {
        let last = -1;
        const run = async (index) => {
            if (index <= last) {
                throw new StateError('NEXT_CALLED_TWICE', 'next() was called more than once');
            }
            last = index;
            const step = stack[index];
            if (step === undefined)
                return done();
            await step(ctx, () => run(index + 1));
        };
        return run(0);
    };
}
