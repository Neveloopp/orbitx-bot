import type { Keyboard } from '../ui/keyboard.js';
import type { Id } from './entities.js';

export type ButtonStyle = 'primary' | 'danger';

export interface Button {
  text: string;
  data?: string;
  url?: string;
  copy?: string;
  style?: ButtonStyle;
}

export interface MenuOption {
  title: string;
  data: string;
  description?: string;
  tag?: string;
}

export interface MenuSection {
  title?: string;
  options: MenuOption[];
}

export interface Menu {
  button: string;
  title?: string;
  sections: MenuSection[];
}

export interface SendOptions {
  replyTo?: number;
  buttons?: Button[][] | Keyboard;
  menu?: Menu;
  [key: string]: unknown;
}

export interface EditOptions {
  buttons?: Button[][] | Keyboard;
  menu?: Menu;
  [key: string]: unknown;
}

export interface MediaOptions {
  replyTo?: number;
  caption?: string;
  name?: string;
  [key: string]: unknown;
}

export interface StickerOptions {
  replyTo?: number;
  shape?: 'original' | 'square' | 'rounded' | 'circle' | 'heart' | 'star' | 'cloud';
  border?: boolean;
  [key: string]: unknown;
}

export interface DownloadOptions {
  format?: 'jpeg' | 'png';
  [key: string]: unknown;
}

export interface UserPhotoOptions {
  kind?: 'cover';
  [key: string]: unknown;
}

export type UserRef = { userId: Id } | { handle: string };

export interface ChatSettings {
  sendMode?: 'all' | 'admins';
  [key: string]: unknown;
}

export interface ChatInfo {
  name?: string;
  description?: string;
  [key: string]: unknown;
}

export interface MemberQuery {
  [key: string]: unknown;
}

export interface AccountProfile {
  name?: string;
  description?: string;
}

export interface PollExtra {
  [key: string]: unknown;
}

export type CommandSpec = Record<string, unknown>;

export type FileInput =
  | string
  | Uint8Array
  | { url: string }
  | { data: Uint8Array; name?: string };
