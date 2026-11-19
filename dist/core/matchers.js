export function normalizeCommand(name) {
    return String(name)
        .toLowerCase()
        .replace(/^[/.!#]/, '');
}
function stateless(pattern) {
    return new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
}
export function commandMatcher(names) {
    const list = [].concat(names).map(normalizeCommand);
    return (ctx) => ctx.command !== null && list.includes(ctx.command);
}
export function textMatcher(pattern) {
    if (pattern instanceof RegExp) {
        const re = stateless(pattern);
        return (ctx) => (ctx.type === 'message' && ctx.text !== '' ? re.exec(ctx.text) ?? false : false);
    }
    const wanted = String(pattern).toLowerCase();
    return (ctx) => ctx.type === 'message' && ctx.text !== '' && ctx.text.trim().toLowerCase() === wanted;
}
export function buttonMatcher(pattern) {
    if (pattern instanceof RegExp) {
        const re = stateless(pattern);
        return (ctx) => (ctx.type === 'callback' && ctx.data !== null ? re.exec(ctx.data) ?? false : false);
    }
    return (ctx) => ctx.type === 'callback' && ctx.data === pattern;
}
export function kindMatcher(kinds) {
    const list = [].concat(kinds);
    return (ctx) => list.some((kind) => ctx.is(kind));
}
