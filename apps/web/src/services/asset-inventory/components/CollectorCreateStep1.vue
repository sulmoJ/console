<template>
    <div ref="containerRef"
         class="create-collector-step-1"
    >
        <p-search :value="state.inputValue"
                  @search="handleSearch"
                  @delete="handleDeleteInputValue"
        />
        <div class="contents-container">
            <step1-search-filter @selectRepository="handleChangeRepository" />
            <div class="right-area">
                <p-field-title class="contents-title">
                    {{ $t('INVENTORY.COLLECTOR.DETAIL.PLUGIN') }}
                </p-field-title>
                <p-data-loader class="right-area-contents"
                               :data="state.pluginList"
                               :loading="state.loading"
                               :loader-backdrop-color="BACKGROUND_COLOR"
                >
                    <div ref="pluginListContainerRef"
                         class="plugin-card-list"
                    >
                        <p-board-item v-for="item in state.pluginList"
                                      :key="getPluginKey(item)"
                                      class="plugin-card-item"
                        >
                            <template #content>
                                <div class="plugin-card-content">
                                    <collect-plugin-contents :plugin="item"
                                                             size="sm"
                                    />
                                    <p-button style-type="secondary"
                                              class="select-button"
                                              @click="handleClickNextStep(item)"
                                    >
                                        {{ $t('INVENTORY.COLLECTOR.CREATE.SELECT') }}
                                    </p-button>
                                    <p-i class="select-icon"
                                         name="ic_chevron-right"
                                         :color="gray[300]"
                                         width="1.5rem"
                                         height="1.5rem"
                                         @click="handleClickNextStep(item)"
                                    />
                                </div>
                            </template>
                        </p-board-item>
                    </div>
                    <template #no-data>
                        <div class="no-data-box">
                            <p-empty image-size="md"
                                     show-image
                            >
                                <template #image>
                                    <img src="../../../assets/images/illust_microscope.svg"
                                         alt="empty-options"
                                    >
                                </template>
                                {{ $t('INVENTORY.COLLECTOR.NO_DATA') }}
                            </p-empty>
                        </div>
                    </template>
                </p-data-loader>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {
    onMounted, reactive, watch, ref,
} from 'vue';


import { getPageStart } from '@cloudforet/core-lib/component-util/pagination';
import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import { ApiQueryHelper } from '@cloudforet/core-lib/space-connector/helper';
import {
    PSearch, PDataLoader, PBoardItem, PButton, PI, PFieldTitle, PEmpty,
} from '@cloudforet/mirinae';


import type { ListResponse } from '@/api-clients/_common/schema/api-verbs/list';
import type { PluginListParameters } from '@/schema/repository/plugin/api-verbs/list';
import type { PluginModel } from '@/schema/repository/plugin/model';

import ErrorHandler from '@/common/composables/error/errorHandler';
import { useLastItemObserver } from '@/common/composables/last-item-observer';


import { gray } from '@/styles/colors';
import { BACKGROUND_COLOR } from '@/styles/colorsets';

import Step1SearchFilter from '@/services/asset-inventory/components/CollectorCreateStep1SearchFilter.vue';
import CollectPluginContents
    from '@/services/asset-inventory/components/CollectorPluginContents.vue';
import { useCollectorFormStore } from '@/services/asset-inventory/stores/collector-form-store';


const emit = defineEmits([
    'update:currentStep',
]);

const collectorFormStore = useCollectorFormStore();
const collectorFormState = collectorFormStore.state;


const state = reactive({
    inputValue: '',
    pluginList: [] as PluginModel[],
    loading: false,
    selectedRepository: '',
    currentPage: 1,
    totalCount: 0,
});


const pluginApiQuery = new ApiQueryHelper();
const getPluginKey = (item) => `${item.name}-${item.repository_info.repository_id}`;
const getPlugins = async (): Promise<PluginModel[]> => {
    try {
        state.loading = true;
        pluginApiQuery.setPage(getPageStart(state.currentPage, 10), 10).setSort('name', false)
            .setFilters([{ v: state.inputValue }]);

        const res = await SpaceConnector.clientV2.repository.plugin.list<PluginListParameters, ListResponse<PluginModel>>({
            resource_type: 'inventory.Collector',
            repository_id: state.selectedRepository === 'all' ? '' : state.selectedRepository,
            provider: collectorFormState.provider === 'all' ? undefined : collectorFormState.provider,
            query: pluginApiQuery.data,
        });
        state.totalCount = res.total_count ?? 0;
        return res.results ?? [];
    } catch (e) {
        ErrorHandler.handleError(e);
        return [];
    } finally {
        state.loading = false;
    }
};

const loadMorePlugin = async () => {
    if (state.totalCount <= state.pluginList.length) {
        disconnectObserver();
        return;
    }

    disconnectObserver();
    state.currentPage += 1;
    const additionalPlugin = await getPlugins();
    state.pluginList = state.pluginList.concat(additionalPlugin);
    connectObserver();
};

const handleSearch = async (keyword) => {
    if (!state.inputValue && !keyword) return;
    await updateKeyword(keyword);
};
const handleClickNextStep = (item: PluginModel) => {
    emit('update:currentStep', 2);
    collectorFormStore.setRepositoryPlugin(item);
};
const handleChangeRepository = (value:string) => {
    state.selectedRepository = value;
};

const handleDeleteInputValue = async () => {
    if (!state.inputValue) return;
    await updateKeyword('');
};

const updateKeyword = async (keyword) => {
    disconnectObserver();
    state.inputValue = keyword;
    state.pluginList = await getPlugins();
    connectObserver();
};

const pluginListContainerRef = ref<HTMLElement|null>(null);
const { connectObserver, disconnectObserver } = useLastItemObserver({
    containerRef: pluginListContainerRef,
    onAppeared: loadMorePlugin,
});

watch([() => collectorFormState.provider, () => state.selectedRepository], async () => {
    disconnectObserver();
    state.currentPage = 1;
    state.pluginList = await getPlugins();
    connectObserver();
}, { immediate: true });


onMounted(() => {
    collectorFormStore.resetState();
});

</script>

<style lang="postcss" scoped>
.create-collector-step-1 {
    @apply flex flex-col;
    min-width: 59.5625rem;
    width: 100%;
    overflow: visible;
    .contents-container {
        @apply flex justify-between;
        margin-top: 1.5rem;

        .contents-title {
            margin-bottom: 0.75rem;
        }

        .right-area {
            max-width: 44.375rem;
            flex-grow: 1;
            .right-area-contents {
                .plugin-card-list {
                    @apply flex flex-col gap-2;
                    overflow-y: auto;
                    :deep(.p-board-item) {
                        .content-area .content {
                            flex-grow: unset;
                            width: 100%;
                        }
                    }

                    .plugin-card-item {
                        border-radius: 0.375rem;
                        box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.06);
                        width: 100%;
                        min-height: unset;
                        padding: 1.5rem;

                        .plugin-card-content {
                            @apply flex justify-between gap-4;
                            width: 100%;
                            .select-button {
                                flex-shrink: 0;
                            }
                            .select-icon {
                                display: none;
                            }
                        }
                    }
                }

                .no-data-box {
                    @apply flex flex-col justify-end;
                    height: 13.625rem;
                }
            }
        }
    }
}

@screen tablet {
    .create-collector-step-1 {
        min-width: 43rem;
        .contents-container {
            @apply flex-col;
            .right-area {
                .right-area-contents {
                    .plugin-card-list {
                        .plugin-card-item {
                            .plugin-card-content {
                                @apply flex items-center;
                                .select-button {
                                    display: none;
                                }
                                .select-icon {
                                    flex-shrink: 0;
                                    display: inline-block;
                                    cursor: pointer;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@screen mobile {
    .create-collector-step-1 {
        min-width: unset;
        max-width: 100vw;
    }
}
</style>

