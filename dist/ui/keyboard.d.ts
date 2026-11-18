import type { Button, ButtonStyle, Menu, MenuOption, MenuSection } from '../types/options.js';
export type ButtonValue = string | {
    url: string;
} | {
    copy: string;
};
export interface ButtonExtra {
    style?: ButtonStyle;
}
/** A button: text for the bot, { url } or { copy }. / Un botón: texto para el bot, { url } o { copy }. */
export declare function button(text: string, value: ButtonValue, extra?: ButtonExtra): Button;
/** A button that opens a link. / Un botón que abre un enlace. */
export declare function link(text: string, url: string, extra?: ButtonExtra): Button;
/** A button that copies a text. / Un botón que copia un texto. */
export declare function copy(text: string, value: string, extra?: ButtonExtra): Button;
/** One option of a menu. / Una opción de un menú. */
export declare function option(title: string, data: string, extra?: {
    description?: string;
    tag?: string;
}): MenuOption;
/** A section of a menu. / Una sección de un menú. */
export declare function section(title: string | undefined, options: MenuOption[]): MenuSection;
/** A list menu opened by one button. / Un menú de lista que se abre con un botón. */
export declare function menu(label: string, sections: MenuSection[], extra?: {
    title?: string;
}): Menu;
/** Splits a list into rows of `size`. / Divide una lista en filas de `size`. */
export declare function chunk<T>(items: readonly T[], size: number): T[][];
export interface Page<T> {
    items: T[];
    page: number;
    pages: number;
    hasPrev: boolean;
    hasNext: boolean;
}
/** One page of a list (pages start at 1). / Una página de una lista (las páginas empiezan en 1). */
export declare function paginate<T>(items: readonly T[], page: number, perPage: number): Page<T>;
/** Builds the rows of buttons under a message. / Arma las filas de botones bajo un mensaje. */
export declare class Keyboard {
    #private;
    static grid(buttons: readonly Button[], columns: number): Keyboard;
    row(...buttons: Button[]): this;
    grid(buttons: readonly Button[], columns: number): this;
    get rows(): Button[][];
    toJSON(): Button[][];
}
export declare function toRows(buttons: Button[][] | Keyboard): Button[][];
