import type { Button, ButtonStyle, Menu, MenuOption, MenuSection } from '../types/options.js';

export type ButtonValue = string | { url: string } | { copy: string };

export interface ButtonExtra {
  style?: ButtonStyle;
}

/** A button: text for the bot, { url } or { copy }. / Un botón: texto para el bot, { url } o { copy }. */
export function button(text: string, value: ButtonValue, extra: ButtonExtra = {}): Button {
  const style = extra.style ? { style: extra.style } : {};
  return typeof value === 'string' ? { text, data: value, ...style } : { text, ...value, ...style };
}

/** A button that opens a link. / Un botón que abre un enlace. */
export function link(text: string, url: string, extra: ButtonExtra = {}): Button {
  return button(text, { url }, extra);
}

/** A button that copies a text. / Un botón que copia un texto. */
export function copy(text: string, value: string, extra: ButtonExtra = {}): Button {
  return button(text, { copy: value }, extra);
}

/** One option of a menu. / Una opción de un menú. */
export function option(
  title: string,
  data: string,
  extra: { description?: string; tag?: string } = {},
): MenuOption {
  return {
    data,
    title,
    ...(extra.description ? { description: extra.description } : {}),
    ...(extra.tag ? { tag: extra.tag } : {}),
  };
}

/** A section of a menu. / Una sección de un menú. */
export function section(title: string | undefined, options: MenuOption[]): MenuSection {
  return title ? { title, options } : { options };
}

/** A list menu opened by one button. / Un menú de lista que se abre con un botón. */
export function menu(label: string, sections: MenuSection[], extra: { title?: string } = {}): Menu {
  return { button: label, ...(extra.title ? { title: extra.title } : {}), sections };
}

/** Splits a list into rows of `size`. / Divide una lista en filas de `size`. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const width = Math.max(1, Math.floor(size));
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += width) rows.push(items.slice(i, i + width));
  return rows;
}

export interface Page<T> {
  items: T[];
  page: number;
  pages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

/** One page of a list (pages start at 1). / Una página de una lista (las páginas empiezan en 1). */
export function paginate<T>(items: readonly T[], page: number, perPage: number): Page<T> {
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
  readonly #rows: Button[][] = [];

  static grid(buttons: readonly Button[], columns: number): Keyboard {
    return new Keyboard().grid(buttons, columns);
  }

  row(...buttons: Button[]): this {
    if (buttons.length > 0) this.#rows.push(buttons);
    return this;
  }

  grid(buttons: readonly Button[], columns: number): this {
    for (const row of chunk(buttons, columns)) this.#rows.push(row);
    return this;
  }

  get rows(): Button[][] {
    return this.#rows.map((row) => [...row]);
  }

  toJSON(): Button[][] {
    return this.rows;
  }
}

export function toRows(buttons: Button[][] | Keyboard): Button[][] {
  return buttons instanceof Keyboard ? buttons.rows : buttons;
}
