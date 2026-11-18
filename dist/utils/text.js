/** Cuts a long text into pieces of at most `size`, on line or word breaks. / Corta un texto largo en trozos de máximo `size`, en saltos de línea o palabras. */
export function splitText(text, size = 4000) {
    const limit = Math.max(1, Math.floor(size));
    const parts = [];
    let rest = text;
    while (rest.length > limit) {
        const window = rest.slice(0, limit);
        let cut = window.lastIndexOf('\n');
        if (cut < limit / 2)
            cut = window.lastIndexOf(' ');
        if (cut < limit / 2)
            cut = limit;
        parts.push(rest.slice(0, cut).trimEnd());
        rest = rest.slice(cut).trimStart();
    }
    if (rest.length > 0 || parts.length === 0)
        parts.push(rest);
    return parts;
}
