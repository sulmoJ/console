<script setup lang="ts">
import {
    computed, onUnmounted, reactive, ref, useSlots, watch,
} from 'vue';

import { reduce } from 'lodash';

import PButton from '@/controls/buttons/button/PButton.vue';
import PTextButton from '@/controls/buttons/text-button/PTextButton.vue';
import PContextMenuItem from '@/controls/context-menu/context-menu-item/PContextMenuItem.vue';
import type { MenuItem } from '@/controls/context-menu/type';
import PSearch from '@/controls/search/search/PSearch.vue';
import PSpinner from '@/feedbacks/loading/spinner/PSpinner.vue';
import { useListFocus } from '@/hooks/use-list-focus/use-list-focus';
import { useProxyValue } from '@/hooks/use-proxy-state/use-proxy-state';

const FOCUS_GROUP_ID = 'context-item';

interface ContextMenuProps<M extends MenuItem = MenuItem> {
    title?: string;
    menu: M[];
    loading?: boolean;
    selected?: MenuItem[];
    multiSelectable?: boolean;
    showSelectMarker?: boolean;
    itemHeightFixed?: boolean;
    highlightTerm?: string;
    noSelectIndication?: boolean;
    showSelectHeader?: boolean;
    showClearSelection?: boolean;
    searchable?: boolean;
    searchText?: string;
    readonly?: boolean;
    resetSelectedOnUnmounted?: boolean;
    beforeSelect?: (item: MenuItem, index: number, isSelected: boolean) => boolean;
    beforeClearSelection?: (clearableSelectedItems: MenuItem[], allSelectedItems: MenuItem[]) => boolean;
}
interface ContextMenuEmits {
    (e: 'update:selected', selected: MenuItem[]): void,
    (e: 'focus', focusedIdx?: number): void,
    (e: 'blur'): void,
    (e: 'keyup:up:end'): void,
    (e: 'keyup:down:end'): void,
    <I extends MenuItem>(e: 'select', item: I, index: number, isSelected: boolean): void,
    (e: 'update:search-text', searchText: string): void,
    (e: 'keyup:esc', mouseEvent: MouseEvent): void,
    (e: 'click-button', item: MenuItem, index: number, mouseEvent: MouseEvent): void,
    (e: 'click-done', mouseEvent: MouseEvent): void,
    (e: 'click-show-more', item: MenuItem, index: number, mouseEvent: MouseEvent): void,
    (e: 'clear-selection'): void,
}
const props = withDefaults(defineProps<ContextMenuProps>(), {
    title: undefined,
    menu: () => [],
    selected: () => [],
    highlightTerm: '',
    searchText: '',
    readonly: false,
    resetSelectedOnUnmounted: true,
    beforeSelect: undefined,
    beforeClearSelection: undefined,
});
const emit = defineEmits<ContextMenuEmits>();
const slots = useSlots();

const contextMenuRef = ref<HTMLElement|null>(null);

const state = reactive({
    proxySearchText: props.searchText ?? '',
    isFocusedOnSearch: false,
    proxySelected: useProxyValue<MenuItem[]>('selected', props, emit),
    selectedNameMap: computed<Record<string, number>>(() => {
        const selectedMap = {};
        state.proxySelected.forEach((item, idx) => {
            selectedMap[item.name] = idx;
        });
        return selectedMap;
    }),
    selectableMenuItems: computed(() => props.menu.filter((d) => !d.disabled && (d.type === undefined || d.type === 'item'))),
    selectedCount: computed(() => state.proxySelected.length),
    clearableSelectedCount: computed(() => state.proxySelected.filter((item) => !item.disabled).length),
    menuItemLength: computed(() => props.menu.filter((d) => d.type === undefined || d.type === 'item').length),
});

const {
    focus: _focus, blur: _blur, handleMoveUp, handleMoveDown, getItemId,
} = useListFocus<MenuItem>(computed(() => props.menu), FOCUS_GROUP_ID, (item) => (!item.type || item.type === 'item') && !item.disabled);

/* util */
const focus = (position?: number) => {
    if (props.searchable && position === undefined) {
        state.isFocusedOnSearch = true;
        return;
    }
    const focusedIdx = _focus(position);
    if (focusedIdx !== undefined) emit('focus', focusedIdx);
};
const blur = () => {
    _blur();
    emit('blur');
};

/* event */
const onKeyUp = (idx?: number) => {
    // this case is from search element
    if (idx === undefined) {
        if (props.searchable) state.isFocusedOnSearch = false;
        emit('keyup:up:end');
        return;
    }

    // event from context menu item
    const focusedIdx = handleMoveUp(idx);
    if (focusedIdx === undefined) {
        // if no items for focus left, focus on search element in searchable case.
        if (props.searchable) state.isFocusedOnSearch = true;
        else emit('keyup:up:end');
    }
};
const onKeyDown = (idx?: number) => {
    // this case is from search element
    if (idx === undefined) {
        if (props.searchable) focus(0);
        return;
    }

    // event from context menu item
    const focusedIdx = handleMoveDown(idx);
    if (focusedIdx === undefined) emit('keyup:down:end');
};
const onClickMenu = (item: MenuItem, index) => {
    if (item.disabled) return;
    if (props.readonly) return;

    let isSelected = true;
    if (state.proxySelected.find((d) => d.name === item.name)) isSelected = false;

    if (props.beforeSelect) {
        const isContinue = props.beforeSelect(item, index, isSelected);
        if (!isContinue) return;
    }

    if (props.multiSelectable) {
        if (state.selectedNameMap[item.name ?? ''] !== undefined) {
            const indexOfSelected = state.selectedNameMap[item.name ?? ''];
            const newSelected = [...state.proxySelected];
            newSelected.splice(indexOfSelected, 1);
            state.proxySelected = newSelected;
        } else {
            state.proxySelected = [...state.proxySelected, item];
        }
    } else {
        state.proxySelected = [item];
    }

    emit('select', item, index, isSelected);
};
const onClickEsc = (e: MouseEvent) => {
    emit('keyup:esc', e);
    blur();
};
const handleClickClearSelection = () => {
    const clearableItems = state.proxySelected.filter((item) => item.disabled);
    if (props.beforeClearSelection) {
        const isContinue = props.beforeClearSelection(clearableItems, state.proxySelected);
        if (!isContinue) return;
    }
    state.proxySelected = clearableItems;
    emit('clear-selection');
};
const handleUpdateSearchText = async (value: string) => {
    state.proxySearchText = value;
    emit('update:search-text', value);
};

watch(() => props.searchText, (searchText) => {
    if (state.proxySearchText === searchText) return;
    state.proxySearchText = searchText;
});

onUnmounted(() => {
    if (props.resetSelectedOnUnmounted) state.proxySelected = [];
});

/* slots */
const searchSlots = computed(() => reduce(slots, (res, d, name) => {
    if (name.startsWith('search-')) res[`${name.substring(7)}`] = d;
    return res;
}, {} as Record<string, typeof slots[string]>));

/* exposes */
defineExpose({
    focus,
});
</script>

<template>
    <div ref="contextMenuRef"
         class="p-context-menu"
         @keyup.esc="onClickEsc"
    >
        <div class="context-menu-title-wrapper">
            <slot name="header">
                <p v-if="title"
                   class="context-menu-title"
                >
                    {{ props.title }}
                </p>
            </slot>
        </div>
        <div class="menu-container">
            <slot name="menu"
                  v-bind="{...props}"
            >
                <div v-if="props.showSelectHeader && props.multiSelectable"
                     v-show="props.menu.length > 0"
                     class="selected-list-wrapper"
                >
                    <div>
                        <b>{{ $t('COMPONENT.CONTEXT_MENU.SELECTED_LIST') }}</b>
                        <span class="pl-2">({{ state.selectedCount }})</span>
                    </div>
                    <p-button size="sm"
                              style-type="primary"
                              :disabled="!state.proxySelected.length"
                              :readonly="readonly"
                              @click="$emit('click-done', $event)"
                    >
                        {{ $t('COMPONENT.CONTEXT_MENU.DONE') }}
                    </p-button>
                </div>
                <div v-if="props.searchable"
                     class="search-wrapper"
                >
                    <p-search :value="state.proxySearchText"
                              :is-focused.sync="state.isFocusedOnSearch"
                              @update:value="handleUpdateSearchText"
                              @keydown.up.native="onKeyUp()"
                              @keydown.down.native="onKeyDown()"
                    >
                        <template v-for="(_, slot) of searchSlots"
                                  #[slot]="scope"
                        >
                            <slot :name="`search-${slot}`"
                                  v-bind="scope"
                            />
                        </template>
                    </p-search>
                </div>
                <p-text-button v-if="props.showClearSelection && props.multiSelectable"
                               class="clear-all-wrapper"
                               style-type="highlight"
                               size="md"
                               :readonly="readonly"
                               @click.stop="handleClickClearSelection"
                >
                    {{ $t('COMPONENT.CONTEXT_MENU.CLEAR_SELECTION') }} ({{ state.clearableSelectedCount }})
                </p-text-button>
                <slot name="items">
                    <template v-for="(item, index) in props.menu">
                        <p-context-menu-item v-if="item.type === undefined || item.type === 'item'"
                                             :id="getItemId(index)"
                                             :key="`item-${item.name}-${index}`"
                                             :name="item.name"
                                             :label="item.label"
                                             :link="item.link"
                                             :target="item.target"
                                             :disabled="item.disabled"
                                             :image-url="item.imageUrl"
                                             :icon="item.icon"
                                             :icon-color="item.iconColor"
                                             :readonly="readonly"
                                             :selected="!props.noSelectIndication && !!item.name && state.selectedNameMap[item.name] !== undefined"
                                             :select-marker="props.showSelectMarker ? props.multiSelectable ? 'checkbox' : 'radio' : undefined"
                                             :ellipsis="props.itemHeightFixed"
                                             :highlight-term="state.proxySearchText || props.highlightTerm"
                                             :tabindex="readonly ? -1 : index"
                                             @click.stop.prevent="onClickMenu(item, index)"
                                             @keyup.enter="onClickMenu(item, index)"
                                             @keydown.up="onKeyUp(index)"
                                             @keydown.down="onKeyDown(index)"
                        >
                            <template #default>
                                <slot name="item--format"
                                      v-bind="{...props, item, index}"
                                />
                            </template>
                            <template #text-list="{text, matched, textList, regex, index: textIndex}">
                                <slot name="item-text-list"
                                      v-bind="{...props, item, index, text, matched, textList, regex, textIndex}"
                                />
                            </template>
                        </p-context-menu-item>
                        <div v-else-if="item.type==='divider'"
                             :key="`divider-${index}`"
                             class="context-divider"
                        />
                        <slot v-else-if="item.type==='header'"
                              :name="`header-${item.name}`"
                              v-bind="{...props, item, key: index}"
                        >
                            <div :key="index"
                                 class="context-header"
                            >
                                {{ item.label }}
                            </div>
                        </slot>
                        <div v-else-if="item.type === 'button'"
                             :key="`button-${index}`"
                             class="context-button"
                             :class="{disabled: item.disabled}"
                        >
                            <p-button :disabled="item.disabled"
                                      size="md"
                                      style-type="secondary"
                                      :block="true"
                                      :icon-left="item.icon"
                                      :readonly="readonly"
                                      @click="$emit('click-button', item, index, $event)"
                            >
                                {{ item.label }}
                            </p-button>
                        </div>
                        <div v-else-if="item.type === 'showMore'"
                             :key="`show-more-${index}`"
                             class="context-show-more"
                        >
                            <p-text-button style-type="highlight"
                                           size="sm"
                                           icon-right="ic_chevron-down"
                                           :disabled="loading"
                                           @click="$emit('click-show-more', item, index, $event)"
                            >
                                {{ item.label ? item.label : $t('COMPONENT.CONTEXT_MENU.SHOW_MORE') }}
                            </p-text-button>
                        </div>
                    </template>
                </slot>
            </slot>
            <div v-show="menu.length === 0"
                 class="no-data"
            >
                <slot name="no-data-format"
                      v-bind="{...props}"
                >
                    {{ $t('COMPONENT.CONTEXT_MENU.NO_ITEM') }}
                </slot>
            </div>
        </div>
        <div v-if="slots.bottom"
             class="bottom-slot-area"
        >
            <slot name="bottom" />
        </div>
        <div v-show="loading"
             class="loader-wrapper"
        >
            <div :class="'loader-backdrop'" />
            <p-spinner class="loader" />
        </div>
    </div>
</template>

<style lang="postcss">
.p-context-menu {
    @apply rounded bg-white border border-gray-300;
    position: relative;
    min-width: 100%;
    text-align: left;
    background-clip: padding-box;
    border-width: 1px;
    border-style: solid;
    user-select: none;
    overflow: hidden;
    .context-menu-title {
        @apply text-label-xl;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        padding-right: 0.5rem;
        padding-left: 0.5rem;
    }
    > .menu-container {
        min-height: inherit;
        max-height: inherit;
        overflow-y: auto;
        > .selected-list-wrapper {
            @apply border-b border-gray-200;
            display: flex;
            justify-content: space-between;
            font-size: 0.875rem;
            line-height: 1.5;
            padding: 0.5rem;
        }
        > .search-wrapper {
            padding: 0.5rem;
        }
        > .clear-all-wrapper {
            width: max-content;
            padding: 0.375rem 0.5rem 0.25rem 0.5rem;
        }
        > .context-header {
            @apply text-gray-500;
            margin-top: 0.5rem;
            margin-bottom: 0.25rem;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
            font-weight: bold;
            font-size: 0.75rem;
            line-height: 1.5;
        }
        > .context-divider {
            @apply border-t border-gray-200;
            border-top-width: 1px;
            border-top-style: solid;
        }
        > .context-button {
            padding: 0.5rem;

            @media (hover: hover) {
                &:hover:not(.disabled):not(.readonly) {
                    @apply bg-blue-100;
                }
            }
        }
        > .context-show-more {
            padding: 0.5rem;
            min-width: 7rem;
        }

        > .no-data {
            @apply text-gray-300;
            padding: 0.5rem;
            line-height: 1.25;
            font-size: 0.875rem;
        }
    }
    > .bottom-slot-area {
        padding: 0.5rem;
    }
    > .loader-wrapper {
        @apply absolute w-full h-full overflow-hidden;
        top: 0;
        z-index: 1;
        .loader-backdrop {
            @apply w-full h-full bg-white;
            opacity: 0.5;
        }
        .loader {
            @apply absolute flex w-full h-full justify-center items-center;
            top: 0;
            z-index: 1;
            max-height: 16.875rem;
        }
    }
}
</style>
