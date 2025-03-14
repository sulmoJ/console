<script setup lang="ts">
import { computed, reactive, watch } from 'vue';

import { useMutation } from '@tanstack/vue-query';
import { cloneDeep } from 'lodash';

import {
    PButton, PButtonModal, PCheckbox, PSearch, PScopedNotification,
} from '@cloudforet/mirinae';

import type { DashboardGlobalVariable } from '@/api-clients/dashboard/_types/dashboard-global-variable-type';
import type { PrivateDashboardModel } from '@/api-clients/dashboard/private-dashboard/schema/model';
import type { PublicDashboardModel } from '@/api-clients/dashboard/public-dashboard/schema/model';
import { i18n } from '@/translations';

import { useAppContextStore } from '@/store/app-context/app-context-store';
import { useUserStore } from '@/store/user/user-store';

import { showSuccessMessage } from '@/lib/helper/notice-alert-helper';

import ErrorHandler from '@/common/composables/error/errorHandler';
import { useProxyValue } from '@/common/composables/proxy-state';
import LSBCollapsibleMenuItem from '@/common/modules/navigations/lsb/modules/LSBCollapsibleMenuItem.vue';

import DashboardManageVariableImportModalTree
    from '@/services/dashboards/components/dashboard-detail/DashboardManageVariableImportModalTree.vue';
import { useDashboardDetailQuery } from '@/services/dashboards/composables/use-dashboard-detail-query';
import { useDashboardQuery } from '@/services/dashboards/composables/use-dashboard-query';
import { getOrderedGlobalVariables } from '@/services/dashboards/helpers/dashboard-global-variables-helper';
import { useDashboardDetailInfoStore } from '@/services/dashboards/stores/dashboard-detail-info-store';



interface Props {
    visible: boolean;
}
const appContextStore = useAppContextStore();
const dashboardDetailStore = useDashboardDetailInfoStore();
const dashboardDetailState = dashboardDetailStore.state;
const userStore = useUserStore();
const props = defineProps<Props>();
const emit = defineEmits<{(e: 'update:visible', value: boolean): void;}>();
/* Query */
const {
    publicDashboardList,
    privateDashboardList,
    publicFolderList,
    privateFolderList,
} = useDashboardQuery();
const {
    dashboard,
    fetcher,
    keys,
    queryClient,
} = useDashboardDetailQuery({
    dashboardId: computed(() => dashboardDetailState.dashboardId),
});

const storeState = reactive({
    isAdminMode: computed(() => appContextStore.getters.isAdminMode),
});

const state = reactive({
    proxyVisible: useProxyValue<boolean>('visible', props, emit),
    currentDashboardId: computed<string>(() => dashboardDetailState.dashboardId || ''),
    currentDashboardVariables: computed<DashboardGlobalVariable[]>(() => Object.values(dashboard.value?.vars_schema?.properties ?? {})),
    keyword: '',
    selectedDashboardId: '' as string|undefined,
    publicDashboardItems: computed<PublicDashboardModel[]>(() => {
        const _v2DashboardItems = publicDashboardList.value.filter((d) => d.version !== '1.0' && d.dashboard_id !== state.currentDashboardId);
        if (storeState.isAdminMode) return _v2DashboardItems;
        return _v2DashboardItems.filter((d) => !(d.resource_group === 'DOMAIN' && !!d.shared && d.scope === 'PROJECT'));
    }),
    privateDashboardItems: computed<PrivateDashboardModel[]>(() => privateDashboardList.value.filter((d) => d.version !== '1.0' && d.dashboard_id !== state.currentDashboardId)),
    publicFolderItems: computed(() => {
        if (storeState.isAdminMode) return publicFolderList.value;
        return publicFolderList.value.filter((d) => !(d.resource_group === 'DOMAIN' && !!d.shared && d.scope === 'PROJECT'));
    }),
    privateFolderItems: computed(() => privateFolderList.value),
    allDashboardItems: computed<PrivateDashboardModel[]>(() => [...state.publicDashboardItems, ...state.privateDashboardItems]),
    selectedDashboardVariables: computed<DashboardGlobalVariable[]>(() => {
        const selectedDashboard = state.allDashboardItems.find((item) => item.dashboard_id === state.selectedDashboardId);
        if (!selectedDashboard) return [];
        const _varsSchemaProperties: DashboardGlobalVariable[] = Object.values(selectedDashboard?.vars_schema?.properties || {});
        return getOrderedGlobalVariables(_varsSchemaProperties);
    }),
    searchedDashboardVariables: computed<DashboardGlobalVariable[]>(() => state.selectedDashboardVariables.filter((variable) => variable?.name?.toLowerCase()?.includes(state.keyword.toLowerCase()))),
    selectedVariableKeys: [] as string[],
    isAllSelected: computed<boolean>(() => {
        if (state.selectedVariableKeys.length === 0) return false;
        return state.selectedVariableKeys.length === state.selectedDashboardVariables.filter((variable) => !isDuplicatedVariableName(variable)).length;
    }),
    notiBannerVisible: true,
});


/* Api */
const { mutate } = useMutation(
    {
        mutationFn: fetcher.updateDashboardFn,
        onSuccess: (_dashboard: PublicDashboardModel|PrivateDashboardModel) => {
            const isPrivate = _dashboard.dashboard_id.startsWith('private');
            const dashboardQueryKey = isPrivate ? keys.privateDashboardQueryKey : keys.publicDashboardQueryKey;
            queryClient.invalidateQueries({ queryKey: dashboardQueryKey.value });
            showSuccessMessage(i18n.t('DASHBOARDS.DETAIL.VARIABLES.ALT_S_UPDATE_DASHBOARD_VARS_SCHEMA'), '');
        },
        onError: (e) => {
            ErrorHandler.handleRequestError(e, i18n.t('DASHBOARDS.DETAIL.VARIABLES.ALT_E_UPDATE_DASHBOARD_VARS_SCHEMA'));
        },
        onSettled() {
            state.proxyVisible = false;
        },
    },
);

/* Event */
const handleChangeSelectedVariableKeys = (selected: string[]) => {
    state.selectedVariableKeys = selected;
};
const handleChangeAllSelectedVariables = (selected: boolean) => {
    state.selectedVariableKeys = selected ? state.selectedDashboardVariables.filter((variable) => !isDuplicatedVariableName(variable)).map((variable) => variable.key) : [];
};
const handleClickClearAll = () => {
    state.selectedVariableKeys = [];
};
const handleConfirmImportVariables = () => {
    const _dashboardVarsSchemaProperties = cloneDeep(dashboard.value?.vars_schema?.properties ?? {});
    state.selectedDashboardVariables
        .filter((variable) => state.selectedVariableKeys.includes(variable.key))
        .forEach((variable) => {
            _dashboardVarsSchemaProperties[variable.key] = {
                ...variable,
                use: false,
                created_by: userStore.state.userId,
            };
        });
    mutate({
        dashboard_id: state.currentDashboardId,
        vars_schema: {
            properties: _dashboardVarsSchemaProperties,
        },
    });
};

const isDuplicatedVariableName = (variable: DashboardGlobalVariable): boolean => state.currentDashboardVariables.some((currentVariable) => currentVariable.name === variable.name
    || currentVariable.key === variable.key);

const getIndeterminate = (): boolean => {
    const availableVariableCount = state.selectedDashboardVariables.filter((variable) => !isDuplicatedVariableName(variable)).length;
    return state.selectedVariableKeys.length > 0 && state.selectedVariableKeys.length < availableVariableCount;
};

watch(() => state.selectedDashboardVariables, (selectedDashboardVariables) => {
    state.notiBannerVisible = selectedDashboardVariables.some((variable) => isDuplicatedVariableName(variable));
}, { immediate: true });
watch(() => state.selectedDashboardId, () => {
    state.selectedVariableKeys = [];
}, { immediate: true });
</script>

<template>
    <p-button-modal class="dashboard-manage-variable-import-modal"
                    :header-title="$t('DASHBOARDS.DETAIL.VARIABLES.IMPORT_MODAL_HEADER')"
                    :visible.sync="state.proxyVisible"
                    :disabled="!state.selectedVariableKeys.length"
                    @confirm="handleConfirmImportVariables"
    >
        <template #body>
            <div class="import-contents">
                <div class="left-dashboard-variable-tree-contents">
                    <l-s-b-collapsible-menu-item v-if="state.publicDashboardItems.length || publicFolderItems.length"
                                                 class="category-menu-item mt-1"
                                                 :item="{
                                                     type: 'collapsible',
                                                     label: $t('DASHBOARDS.LNB.SHARED'),
                                                     subItems: state.publicDashboardItems,
                                                 }"
                                                 is-sub-item
                                                 show-sub-item-count
                    >
                        <template #collapsible-contents>
                            <dashboard-manage-variable-import-modal-tree type="PUBLIC"
                                                                         :dashboards="state.publicDashboardItems"
                                                                         :folders="state.publicFolderItems"
                                                                         :selected.sync="state.selectedDashboardId"
                            />
                        </template>
                    </l-s-b-collapsible-menu-item>
                    <l-s-b-collapsible-menu-item v-if="state.privateDashboardItems.length || privateFolderItems.length"
                                                 class="category-menu-item mt-1"
                                                 :item="{
                                                     type: 'collapsible',
                                                     label: $t('DASHBOARDS.LNB.PRIVATE'),
                                                     subItems: state.privateDashboardItems,
                                                 }"
                                                 is-sub-item
                                                 show-sub-item-count
                    >
                        <template #collapsible-contents>
                            <dashboard-manage-variable-import-modal-tree type="PRIVATE"
                                                                         :dashboards="state.privateDashboardItems"
                                                                         :folders="state.privateFolderItems"
                                                                         :selected.sync="state.selectedDashboardId"
                            />
                        </template>
                    </l-s-b-collapsible-menu-item>
                </div>
                <div class="left-dashboard-variable-contents">
                    <p-search v-model="state.keyword" />
                    <div class="variable-list-wrapper">
                        <div class="variable-list-header">
                            <div class="header">
                                <p-checkbox :selected="state.isAllSelected"
                                            :indeterminate="getIndeterminate()"
                                            @change="handleChangeAllSelectedVariables"
                                />
                                <span>{{ $t('DASHBOARDS.DETAIL.VARIABLES.NAME') }}</span>
                            </div>
                            <p-button size="sm"
                                      style-type="tertiary"
                                      @click="handleClickClearAll"
                            >
                                {{ $t('DASHBOARDS.DETAIL.VARIABLES.CLEAR_ALL') }}
                            </p-button>
                        </div>
                        <div class="variable-list">
                            <p-scoped-notification v-if="state.notiBannerVisible"
                                                   type="warning"
                                                   icon="ic_warning-filled"
                                                   layout="in-section"
                                                   :visible.sync="state.notiBannerVisible"
                                                   show-close-button
                            >
                                {{ $t('DASHBOARDS.DETAIL.VARIABLES.DUPLICATED_NAME_WARNING') }}
                            </p-scoped-notification>
                            <div v-for="(variable) in state.searchedDashboardVariables"
                                 :key="variable.key"
                                 class="variable"
                            >
                                <p-checkbox :selected="state.selectedVariableKeys"
                                            :value="variable.key"
                                            :disabled="isDuplicatedVariableName(variable)"
                                            @change="handleChangeSelectedVariableKeys"
                                >
                                    <span class="variable-text">{{ variable.name }}</span>
                                </p-checkbox>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </p-button-modal>
</template>

<style scoped lang="postcss">
.dashboard-manage-variable-import-modal {
    .import-contents {
        @apply bg-gray-100 flex;
        height: 36.6875rem;

        .left-dashboard-variable-tree-contents {
            width: 14.625rem;
            padding-right: 1rem;
            height: 100%;
            overflow: auto;
        }
        .left-dashboard-variable-contents {
            @apply flex-1 flex flex-col gap-2;
            padding: 0.5rem;

            .variable-list-wrapper {
                @apply bg-white border border-gray-150 rounded-lg;
                height: 100%;
                overflow: auto;

                .variable-list-header {
                    @apply border-b-2 border-gray-200 flex items-center justify-between;
                    padding: 0.5rem;
                    height: 2.5rem;
                    .header {
                        @apply flex items-center gap-1 text-label-md font-bold text-gray-900;
                    }
                }

                .variable-list {
                    height: calc(100% - 2.5rem);
                    overflow: auto;

                    .variable {
                        @apply flex items-center;
                        padding: 0.5rem;
                        height: 2.25rem;
                        .variable-text {
                            @apply text-label-md text-gray-900;
                            padding-left: 0.25rem;
                            line-height: 1.5;
                        }
                    }
                }
            }
        }
    }
}
</style>
