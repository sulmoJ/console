<script lang="ts" setup>
import { computed, reactive } from 'vue';

import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import { PDataTable, PI } from '@cloudforet/mirinae';

import type { PrivateFolderDeleteParameters } from '@/schema/dashboard/private-folder/api-verbs/delete';
import type { PublicFolderDeleteParameters } from '@/schema/dashboard/public-folder/api-verbs/delete';
import { i18n } from '@/translations';

import { useDashboardStore } from '@/store/dashboard/dashboard-store';

import { showSuccessMessage } from '@/lib/helper/notice-alert-helper';

import DeleteModal from '@/common/components/modals/DeleteModal.vue';
import ErrorHandler from '@/common/composables/error/errorHandler';
import { useProxyValue } from '@/common/composables/proxy-state';

import { gray } from '@/styles/colors';

import { getSelectedDataTableItems } from '@/services/dashboards/helpers/dashboard-tree-data-helper';
import { useDashboardPageControlStore } from '@/services/dashboards/stores/dashboard-page-control-store';
import type { DashboardDataTableItem } from '@/services/dashboards/types/dashboard-folder-type';



/* Cases
* Single Case: If props.folderId exists, delete single folder
* Multiple Case: Otherwise, delete multiple folders (get selected data from dashboardPageControlGetters)
*/
const DELETE_TABLE_FIELDS = [
    { name: 'name', label: 'Name' },
    { name: 'location', label: 'Location' },
];
type FolderDeleteParams = PublicFolderDeleteParameters | PrivateFolderDeleteParameters;
interface Props {
    visible?: boolean;
    folderId?: string;
}
const props = withDefaults(defineProps<Props>(), {
    visible: false,
    folderId: undefined,
});
const emit = defineEmits<{(e: 'update:visible', visible: boolean): void,
}>();
const dashboardStore = useDashboardStore();
const dashboardPageControlStore = useDashboardPageControlStore();
const dashboardPageControlState = dashboardPageControlStore.state;
const dashboardPageControlGetters = dashboardPageControlStore.getters;
const state = reactive({
    loading: false,
    proxyVisible: useProxyValue<boolean>('visible', props, emit),
    modalTableItems: computed<DashboardDataTableItem[]>(() => {
        let _selectedIdMap = dashboardPageControlState.selectedPublicIdMap;
        // single case
        if (props.folderId) {
            const _childrenIdList = dashboardPageControlGetters.allDashboardItems.filter((d) => d.folder_id === props.folderId);
            _selectedIdMap = {
                [props.folderId]: true,
                ..._childrenIdList.reduce((acc, d) => ({ ...acc, [d.dashboard_id]: true }), {}),
            };
        } else if (dashboardPageControlState.folderModalType === 'PRIVATE') { // bundle case
            _selectedIdMap = dashboardPageControlState.selectedPrivateIdMap;
        }
        return getSelectedDataTableItems(dashboardPageControlGetters.allFolderItems, dashboardPageControlGetters.allDashboardItems, _selectedIdMap);
    }),
});

/* Api */
const deleteFolder = async (folderId: string): Promise<boolean> => {
    const fetcher = folderId.startsWith('private')
        ? SpaceConnector.clientV2.dashboard.privateFolder.delete
        : SpaceConnector.clientV2.dashboard.publicFolder.delete;
    try {
        await fetcher<FolderDeleteParams>({ folder_id: folderId });
        return true;
    } catch (e) {
        return false;
    }
};
const deleteDashboard = async (dashboardId: string): Promise<boolean> => {
    try {
        await dashboardStore.deleteDashboard(dashboardId);
        return true;
    } catch (e) {
        return false;
    }
};

/* Event */
const handleDeleteConfirm = async () => {
    state.loading = true;
    const _deletePromises: Promise<boolean>[] = [];
    state.modalTableItems.forEach((item) => {
        if (!item.id) return;
        if (item.type === 'DASHBOARD') {
            _deletePromises.push(deleteDashboard(item.id));
        } else {
            _deletePromises.push(deleteFolder(item.id));
        }
    });
    const _results = await Promise.all(_deletePromises);
    if (_results.every((r) => r)) {
        showSuccessMessage(i18n.t('DASHBOARDS.ALL_DASHBOARDS.ALT_S_DELETE_DASHBOARD'), '');
    } else {
        ErrorHandler.handleRequestError(new Error('Delete failed'), i18n.t('DASHBOARDS.ALL_DASHBOARDS.ALT_E_DELETE_DASHBOARD'));
    }
    await dashboardStore.load();
    dashboardPageControlStore.reset();
    state.loading = false;
    state.proxyVisible = false;
};
</script>

<template>
    <delete-modal :visible.sync="state.proxyVisible"
                  size="md"
                  :header-title="$t('DASHBOARDS.ALL_DASHBOARDS.DELETE_DASHBOARD')"
                  :loading="state.loading"
                  :disabled="state.loading"
                  :enable-scroll="true"
                  class="dashboard-folder-delete-modal"
                  @confirm="handleDeleteConfirm"
    >
        <template #delete-modal-body>
            <p-data-table :items="state.modalTableItems"
                          :fields="DELETE_TABLE_FIELDS"
                          :loading="state.loading"
            >
                <template #col-name-format="{item}">
                    <div class="table-column">
                        <p-i :name="item.type === 'DASHBOARD' ? 'ic_service_dashboard' : 'ic_folder'"
                             :color="gray[600]"
                             width="1rem"
                             height="1rem"
                        />
                        <span>{{ item.name }}</span>
                    </div>
                </template>
                <template #col-location-format="{item}">
                    <div v-if="item.location"
                         class="table-column"
                    >
                        <p-i name="ic_folder"
                             :color="gray[600]"
                             width="1rem"
                             height="1rem"
                        />
                        <span>{{ item.location }}</span>
                    </div>
                </template>
            </p-data-table>
        </template>
    </delete-modal>
</template>

<style lang="postcss" scoped>
.dashboard-folder-delete-modal {
    .table-column {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
}
</style>
