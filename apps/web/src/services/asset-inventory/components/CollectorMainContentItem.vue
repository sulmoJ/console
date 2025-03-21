<script setup lang="ts">
import { computed, reactive, watch } from 'vue';

import {
    PButton, PCard, PLazyImg, PBadge,
} from '@cloudforet/mirinae';

import type { CollectorUpdateParameters } from '@/schema/inventory/collector/api-verbs/update';
import { i18n } from '@/translations';

import { useAppContextStore } from '@/store/app-context/app-context-store';

import { isMobile } from '@/lib/helper/cross-browsing-helper';

import ErrorHandler from '@/common/composables/error/errorHandler';

import CollectorCurrentStatus from '@/services/asset-inventory/components/CollectorCurrentStatus.vue';
import CollectorItemSchedule
    from '@/services/asset-inventory/components/CollectorMainItemSchedule.vue';
import RecentCollectorJobList from '@/services/asset-inventory/components/RecentCollectorJobList.vue';
import {
    useCollectorDataModalStore,
} from '@/services/asset-inventory/stores/collector-data-modal-store';
import { useCollectorFormStore } from '@/services/asset-inventory/stores/collector-form-store';
import { useCollectorPageStore } from '@/services/asset-inventory/stores/collector-page-store';
import type { CollectorItemInfo, JobAnalyzeStatus } from '@/services/asset-inventory/types/collector-main-page-type';


interface Props {
    item: CollectorItemInfo;
    hasReadWriteAccess?: boolean;
}

const props = defineProps<Props>();

const collectorPageStore = useCollectorPageStore();
const collectorPageState = collectorPageStore.state;
const collectorDataModalStore = useCollectorDataModalStore();
const collectorFormStore = useCollectorFormStore();

const appContextStore = useAppContextStore();

const state = reactive({
    plugin: computed<{name?: string; version: string}|null>(() => {
        const plugin = props.item.plugin;
        if (plugin) return { name: plugin.name, version: plugin.info.version };
        return null;
    }),
    recentJob: computed<JobAnalyzeStatus|undefined>(() => {
        if (!props.item) return undefined;
        return props.item.recentJobAnalyze?.[0];
    }),
    isScheduleActivated: false,
    isAdminMode: computed(() => appContextStore.getters.isAdminMode),
    isScheduleEditable: computed(() => {
        if (state.isAdminMode) return true;
        if (props.item.workspaceId === '*') return false;
        return true;
    }),
});

const handleChangeToggle = async () => {
    try {
        state.isScheduleActivated = !state.isScheduleActivated;
        const params: CollectorUpdateParameters = {
            collector_id: props.item.collectorId,
            schedule: {
                ...props.item.schedule,
                state: state.isScheduleActivated ? 'ENABLED' : 'DISABLED',
            },
        };
        const response = await collectorPageStore.updateCollectorSchedule(params);
        if (response) await collectorFormStore.setOriginCollector(response);
    } catch (e) {
        ErrorHandler.handleRequestError(e, i18n.t('INVENTORY.COLLECTOR.ALT_E_UPDATE_SCHEDULE'));
    }
};

/* API */
const handleClickCollectData = () => {
    if (!props.item) return;
    collectorPageStore.setSelectedCollector(props.item.collectorId);
    collectorDataModalStore.$patch((_state) => {
        if (!props.item) return;
        _state.visible = true;
        _state.selectedCollector = collectorPageState.selectedCollector;
    });
};

/* Watcher */
watch(() => props.item.schedule, (schedule) => {
    if (schedule) {
        state.isScheduleActivated = schedule.state === 'ENABLED';
    }
}, { immediate: true });
</script>

<template>
    <div class="collector-content-item">
        <p-card :header="false"
                style-type="white"
                class="collector-item"
        >
            <div class="collector-item-wrapper">
                <div class="collector-title-wrapper">
                    <span class="collector-item-name">{{ props.item.name }}</span>
                    <p-badge v-if="props.item.workspaceId === '*' && !state.isAdminMode"
                             badge-type="subtle"
                             style-type="indigo100"
                             class="managed-item-label"
                    >
                        {{ $t('INVENTORY.COLLECTOR.MAIN.MANAGED_ITEM_LABEL') }}
                    </p-badge>
                </div>
                <div class="collector-plugin">
                    <p-lazy-img :src="props.item.plugin.icon"
                                width="1.75rem"
                                height="1.75rem"
                                class="plugin-icon"
                    />
                    <div class="title-wrapper">
                        <span class="plugin-name">{{ props.item.plugin.name }}</span>
                        <span class="plugin-version">v{{ props.item.plugin.info.version }}</span>
                    </div>
                </div>
                <div class="collector-info-wrapper">
                    <div v-if="props.item"
                         class="collector-info-view"
                    >
                        <collector-current-status :hours="props.item.schedule?.hours"
                                                  :recent-job="state.recentJob"
                                                  :is-schedule-activated="state.isScheduleActivated"
                        />
                        <recent-collector-job-list :recent-jobs="props.item.recentJobAnalyze"
                                                   :history-link="props.item.historyLink"
                                                   class="collector-info-view-recent-collector"
                        />
                    </div>
                    <collector-item-schedule :collector-id="props.item.collectorId"
                                             :is-schedule-activated="state.isScheduleActivated"
                                             :mode="(props.hasReadWriteAccess && state.isScheduleEditable) ? 'edit' : 'view'"
                                             @change-toggle="handleChangeToggle"
                    />
                </div>
            </div>
            <div v-if="props.hasReadWriteAccess"
                 :class="['collector-status-wrapper', { 'is-mobile': isMobile()}]"
            >
                <p-button style-type="tertiary"
                          class="collector-data-button"
                          @click.stop="handleClickCollectData"
                >
                    {{ $t('INVENTORY.COLLECTOR.MAIN.COLLECT_DATA') }}
                </p-button>
            </div>
        </p-card>
    </div>
</template>

<style lang="postcss" scoped>
.collector-content-item {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);

    /* custom design-system component - p-card */
    :deep(.p-card) {
        &:hover {
            .body {
                @apply bg-blue-100;
            }
        }
    }
    .collector-item {
        @apply relative;
        &:hover {
            @apply cursor-pointer;
            .collector-status-wrapper {
                .collector-data-button {
                    opacity: 1;
                }
            }
            .managed-item-label {
                display: none;
            }
        }
        .collector-status-wrapper {
            @apply absolute;
            top: 1.25rem;
            right: 1.5rem;
            gap: 0.25rem;
            &.is-mobile {
                position: initial;
                margin-top: 0.75rem;
                margin-bottom: 0.5rem;
                .collector-data-button {
                    width: 100%;
                    opacity: 1;
                }
            }
            .collector-data-button {
                @apply flex items-center;
                opacity: 0;
                padding-top: 0.065rem;
            }
        }
        .collector-item-wrapper {
            @apply flex flex-col;
            padding: 0.5rem 0.625rem;
            .collector-title-wrapper {
                @apply flex items-center justify-between;
                height: 2.625rem;
                margin-bottom: 0.75rem;
                .collector-item-name {
                    @apply text-label-xl font-bold truncate;
                    display: inline-block;
                    line-height: 1.40625rem;
                    height: 1.5rem;
                    flex-shrink: 1;
                }
                .managed-item-label {
                    flex: 0 0 auto;
                }
            }

            .collector-plugin {
                @apply flex items-center;
                width: 100%;
                gap: 0.5rem;
                .title-wrapper {
                    @apply relative flex flex-col truncate;
                    height: 2.125rem;
                    flex: 1;
                    .plugin-name {
                        @apply truncate text-label-md;
                    }
                    .plugin-version {
                        @apply absolute text-label-sm text-gray-400 truncate;
                        bottom: 0;
                        left: 0;
                        width: 100%;
                    }
                }
            }
            .collector-info-wrapper {
                margin-top: 1.125rem;

                @screen tablet {
                    flex-direction: column;
                    gap: 1rem;
                }
                .collector-info-view {
                    @apply flex justify-between;
                    .collector-info-view-recent-collector {
                        @apply flex flex-col items-end;
                    }
                    .info-item {
                        @apply relative flex flex-col flex-wrap;
                        gap: 0.5rem;
                    }

                    @screen mobile {
                        position: relative;
                        display: initial;
                    }
                }
            }
        }
    }
}
</style>
