<script setup lang="ts">
import { useElementSize } from '@vueuse/core';
import {
    computed, reactive, ref, watch,
} from 'vue';

import { PDivider, PContextMenu, PDataLoader } from '@cloudforet/mirinae';

import { i18n } from '@/translations';

import { useUserWorkspaceStore } from '@/store/app-context/workspace/user-workspace-store';

import { useProxyValue } from '@/common/composables/proxy-state';
import type { SuggestionType, SuggestionItem } from '@/common/modules/navigations/top-bar/modules/top-bar-search/config';
import { SUGGESTION_TYPE } from '@/common/modules/navigations/top-bar/modules/top-bar-search/config';
import TopBarSearchEmpty
    from '@/common/modules/navigations/top-bar/modules/top-bar-search/modules/top-bar-search-dropdown/modules/TopBarSearchEmpty.vue';
import TopBarSearchRecentListItem
    from '@/common/modules/navigations/top-bar/modules/top-bar-search/modules/top-bar-search-dropdown/modules/TopBarSearchRecentListItem.vue';
import TopBarSearchWorkspaceFilter
    from '@/common/modules/navigations/top-bar/modules/top-bar-search/modules/top-bar-search-dropdown/modules/TopBarSearchWorkspaceFilter.vue';
import { useTopBarSearchStore } from '@/common/modules/navigations/top-bar/modules/top-bar-search/store';
import type { FocusingDirection } from '@/common/modules/navigations/top-bar/modules/top-bar-search/type';




interface Props {
    searchLimit: number;
    isFocused: boolean;
    focusingDirection: string;
}

const props = withDefaults(defineProps<Props>(), {
    searchLimit: 15,
    isFocused: false,
    focusingDirection: 'DOWNWARD',
});

const userWorkspaceStore = useUserWorkspaceStore();
const workspaceStoreGetter = userWorkspaceStore.getters;
const topBarSearchStore = useTopBarSearchStore();

const emit = defineEmits<{(event: 'select', item: SuggestionItem): void;
    (event: 'close'): void;
    (event: 'move-focus-end'): void;
    (event: 'update:isFocused', value: boolean): void;
    (event: 'update:contents-size', value: number): void;
}>();

const contentsRef = ref<null | HTMLElement>(null);
const contentsSize = useElementSize(contentsRef);

const state = reactive({
    inputText: computed(() => topBarSearchStore.getters.inputText),
    trimmedInputText: computed(() => topBarSearchStore.getters.trimmedInputText),
    searchMenuList: computed(() => topBarSearchStore.state.searchMenuList),
    recentMenuList: computed(() => [
        { name: 'title', label: i18n.t('COMMON.NAVIGATIONS.TOP_BAR.RECENTLY_VIEWED'), type: 'header' },
        ...topBarSearchStore.state.recentMenuList]),
    serviceMenuCount: computed(() => state.searchMenuList?.length ?? 0),
    currentWorkspaceId: computed(() => workspaceStoreGetter.currentWorkspaceId),
    stagedWorkspaces: computed(() => topBarSearchStore.state.stagedWorkspaces),
    recentMode: computed(() => state.inputText.length === 0),
    // focus
    proxyFocusingDirection: useProxyValue('focusingDirection', props, emit),
    focusingType: SUGGESTION_TYPE.DEFAULT_SERVICE as SuggestionType,
});

const handleFocusEnd = (type: SuggestionType, direction: FocusingDirection) => {
    if (type === SUGGESTION_TYPE.DEFAULT_SERVICE && direction === 'DOWNWARD') {
        state.proxyFocusingDirection = direction;
    }
    // HACK: need UPWARD case
    emit('move-focus-end');
};

const handleSelect = (item) => {
    emit('select', item);
};

watch(() => contentsSize.height.value, (height) => {
    emit('update:contents-size', height);
});

// /* Watcher */
// HACK: for focusing
// watch(() => props.isFocused, (isFocused) => {
//     if (isFocused) {
//         if (props.focusingDirection === 'DOWNWARD') {
//             if (state.inputText.length === 0) {
//                 state.focusingType = SUGGESTION_TYPE.MENU;
//         } else {
//             state.focusingType = props.items[props.items.length - 1].itemType;
//         }
//     }
// });
</script>
<template>
    <div class="search-tab-content">
        <div v-if="state.recentMode"
             class="service-item-list"
        >
            <div ref="contentsRef">
                <p-data-loader key="recent-menu-list"
                               class="data-loader-wrapper"
                               :loading="topBarSearchStore.state.loading"
                               :data="topBarSearchStore.state.recentMenuList"
                >
                    <p-context-menu class="search-list-context"
                                    :menu="state.recentMenuList"
                                    no-select-indication
                                    @keyup:up:end="handleFocusEnd(SUGGESTION_TYPE.RECENT, 'UPWARD')"
                                    @keyup:down:end="handleFocusEnd(SUGGESTION_TYPE.RECENT, 'DOWNWARD')"
                                    @keyup:esc="emit('close')"
                                    @focus="emit('update:isFocused', true)"
                                    @blur="emit('update:isFocused', false)"
                    >
                        <template #item--format="{ item }">
                            <top-bar-search-recent-list-item :recent-item="item" />
                        </template>
                    </p-context-menu>
                    <template #no-data>
                        <top-bar-search-empty :is-recent="true" />
                    </template>
                </p-data-loader>
            </div>
        </div>
        <div v-else
             class="service-item-list"
        >
            <div ref="contentsRef">
                <p-data-loader :loading="topBarSearchStore.state.loading"
                               class="data-loader-wrapper"
                               :data="state.searchMenuList"
                >
                    <p-context-menu class="search-list-context"
                                    :menu="state.searchMenuList"
                                    no-select-indication
                                    @keyup:up:end="handleFocusEnd(SUGGESTION_TYPE.DEFAULT_SERVICE, 'UPWARD')"
                                    @keyup:down:end="handleFocusEnd(SUGGESTION_TYPE.DEFAULT_SERVICE, 'DOWNWARD')"
                                    @keyup:esc="emit('close')"
                                    @focus="emit('update:isFocused', true)"
                                    @blur="emit('update:isFocused', false)"
                                    @select="handleSelect"
                    >
                        <template #item--format="{ item }">
                            <slot name="search-menu-item"
                                  v-bind="{item}"
                            />
                        </template>
                    </p-context-menu>
                    <div v-if="state.inputText && state.serviceMenuCount >= props.searchLimit"
                         class="too-many-results-wrapper"
                    >
                        <div class="dim-wrapper" />
                        <p>{{ $t('COMMON.GNB.SEARCH.TOO_MANY_RESULTS') }} <br> {{ $t('COMMON.GNB.SEARCH.TRY_SEARCH_AGAIN') }}</p>
                    </div>
                    <template #no-data>
                        <top-bar-search-empty :input-text="state.inputText"
                                              :is-recent="false"
                        />
                    </template>
                </p-data-loader>
            </div>
        </div>
        <p-divider v-if="!state.recentMode"
                   vertical
        />
        <top-bar-search-workspace-filter v-if="!state.recentMode" />
    </div>
</template>

<style scoped lang="postcss">
.search-tab-content {
    @apply flex gap-3 h-full;
    padding: 1rem 0;

    .service-item-list {
        width: 100%;
        height: 100%;
        overflow-y: auto;

        .data-loader-wrapper {
            min-height: 26.875rem;
        }

        .search-list-context {
            @apply bg-white border-none;
            padding-left: 0.5rem;
            padding-right: 0.5rem;
            padding-bottom: 0.125rem;
            max-height: unset;

            /* custom design-system component - p-context-menu */
            :deep() {
                .context-header {
                    margin-top: unset;
                }

                .p-context-menu-item {
                    justify-content: flex-start;
                    line-height: 1.75;
                    padding: 0.25rem 0.5rem;

                    &:focus {
                        @apply border border-blue-400 rounded-xs;
                        box-shadow: 0 0 0 0.125rem rgba(73, 167, 247, 0.2);
                        outline: none;

                        &:not(:hover):not(.disabled):not(.empty) {
                            @apply bg-white;
                        }
                    }
                }
            }
        }
    }

    .too-many-results-wrapper {
        @apply text-gray-400;
        font-size: 0.75rem;
        line-height: 1.5;
        text-align: center;
        padding: 1rem 0.75rem;

        .dim-wrapper {
            position: relative;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, white 100%);
            height: 2rem;
            pointer-events: none;
            margin-top: -3rem;
            margin-bottom: 1rem;
        }
    }
}
</style>
