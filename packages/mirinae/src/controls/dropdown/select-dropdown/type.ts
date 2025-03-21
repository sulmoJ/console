import type { MenuItem } from '@/controls/context-menu/type';
import type { MenuAttachHandler, MenuAttachHandlerRes } from '@/hooks/use-context-menu-attach/use-context-menu-attach';

export interface SelectDropdownMenuItem extends MenuItem {
    name: string;
}

export const CONTEXT_MENU_POSITION = {
    LEFT: 'left',
    RIGHT: 'right',
} as const;

export const SELECT_DROPDOWN_STYLE_TYPE = {
    DEFAULT: 'default',
    ROUNDED: 'rounded',
    TRANSPARENT: 'transparent',
    ICON_BUTTON: 'icon-button',
    TERTIARY_ICON_BUTTON: 'tertiary-icon-button',
} as const;

export const SELECT_DROPDOWN_APPEARANCE_TYPE = {
    BASIC: 'basic',
    STACK: 'stack',
    BADGE: 'badge',
    MASKING: 'masking', // this is for resolving a type error in JsonSchemaForm
} as const;


export type ContextMenuPosition = typeof CONTEXT_MENU_POSITION[keyof typeof CONTEXT_MENU_POSITION];
export type SelectDropdownStyleType = typeof SELECT_DROPDOWN_STYLE_TYPE[keyof typeof SELECT_DROPDOWN_STYLE_TYPE];
export type SelectDropdownAppearanceType = typeof SELECT_DROPDOWN_APPEARANCE_TYPE[keyof typeof SELECT_DROPDOWN_APPEARANCE_TYPE];
export type SelectDropdownSize = 'sm' | 'md';

export type HandlerRes = MenuAttachHandlerRes<SelectDropdownMenuItem>;
export type AutocompleteHandler = MenuAttachHandler<SelectDropdownMenuItem>;
