/** A button: text for the bot, { url } or { copy }. / Un botón: texto para el bot, { url } o { copy }. */
export function button(text, value, extra = {}) {
    const style = extra.style ? { style: extra.style } : {};
    return typeof value === 'string' ? { text, data: value, ...style } : { text, ...value, ...style };
}
/** A button that opens a link. / Un botón que abre un enlace. */
export function link(text, url, extra = {}) {
    return button(text, { url }, extra);
}
/** A button that copies a text. / Un botón que copia un texto. */
export function copy(text, value, extra = {}) {
    return button(text, { copy: value }, extra);
}
/** One option of a menu. / Una opción de un menú. */
export function option(title, data, extra = {}) {
    return {
        data,
        title,
        ...(extra.description ? { description: extra.description } : {}),
        ...(extra.tag ? { tag: extra.tag } : {}),
    };
}
/** A section of a menu. / Una sección de un menú. */
export function section(title, options) {
    return title ? { title, options } : { options };
}
/** A list menu opened by one button. / Un menú de lista que se abre con un botón. */
export function menu(label, sections, extra = {}) {
    return { button: label, ...(extra.title ? { title: extra.title } : {}), sections };
}
/** Splits a list into rows of `size`. / Divide una lista en filas de `size`. */
export function chunk(items, size) {
    const width = Math.max(1, Math.floor(size));
    const rows = [];
    for (let i = 0; i < items.length; i += width)
        rows.push(items.slice(i, i + width));
    return rows;
}
/** One page of a list (pages start at 1). / Una página de una lista (las páginas empiezan en 1). */
export function paginate(items, page, perPage) {
    const size = Math.max(1, Math.floor(perPage));
    const pages = Math.max(1, Math.ceil(items.length / size));
    const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
    return {
        items: items.slice((current - 1) * size, current * size),
        page: current,
        pages,
        hasPrev: current > 1,
        hasNext: current < pages,
    };
}
/** Builds the rows of buttons under a message. / Arma las filas de botones bajo un mensaje. */
export class Keyboard {
    #rows = [];
    static grid(buttons, columns) {
        return new Keyboard().grid(buttons, columns);
    }
    row(...buttons) {
        if (buttons.length > 0)
            this.#rows.push(buttons);
        return this;
    }
    grid(buttons, columns) {
        for (const row of chunk(buttons, columns))
            this.#rows.push(row);
        return this;
    }
    get rows() {
        return this.#rows.map((row) => [...row]);
    }
    toJSON() {
        return this.rows;
    }
}
export function toRows(buttons) {
    return buttons instanceof Keyboard ? buttons.rows : buttons;
}
