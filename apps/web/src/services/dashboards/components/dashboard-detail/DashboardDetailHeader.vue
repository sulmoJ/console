<script lang="ts" setup>
import { computed, reactive } from 'vue';

import {
    PHeading, PSkeleton, PSelectDropdown, PI, PBadge, PHeadingLayout,
} from '@cloudforet/mirinae';
import type { BadgeStyleType, BadgeType } from '@cloudforet/mirinae/src/data-display/badge/type';
import type { MenuItem } from '@cloudforet/mirinae/types/controls/context-menu/type';

import type { DashboardScope } from '@/schema/dashboard/_types/dashboard-type';
import { ROLE_TYPE } from '@/schema/identity/role/constant';
import { i18n } from '@/translations';

import { useAppContextStore } from '@/store/app-context/app-context-store';
import { useUserStore } from '@/store/user/user-store';

import { gray } from '@/styles/colors';

import DashboardControlButtons from '@/services/dashboards/components/dashboard-detail/DashboardControlButtons.vue';
import DashboardLabelsButton from '@/services/dashboards/components/dashboard-detail/DashboardLabelsButton.vue';
import { useDashboardControlMenuItems } from '@/services/dashboards/composables/use-dashboard-control-menu-items';
import { useDashboardDetailInfoStore } from '@/services/dashboards/stores/dashboard-detail-info-store';
import { useDashboardPageControlStore } from '@/services/dashboards/stores/dashboard-page-control-store';



interface Props {
    dashboardId: string;
    templateName?: string;
}
const props = defineProps<Props>();
const dashboardDetailStore = useDashboardDetailInfoStore();
const dashboardDetailState = dashboardDetailStore.state;
const dashboardDetailGetters = dashboardDetailStore.getters;
const dashboardPageControlStore = useDashboardPageControlStore();
const dashboardPageControlGetters = dashboardPageControlStore.getters;
const appContextStore = useAppContextStore();
const userStore = useUserStore();
const storeState = reactive({
    isAdminMode: computed(() => appContextStore.getters.isAdminMode),
    isWorkspaceOwner: computed(() => userStore.state.currentRoleInfo?.roleType === ROLE_TYPE.WORKSPACE_OWNER),
});
const { getControlMenuItems } = useDashboardControlMenuItems({
    isAdminMode: computed(() => storeState.isAdminMode),
    isWorkspaceOwner: computed(() => storeState.isWorkspaceOwner),
    dashboardList: computed(() => dashboardPageControlGetters.allDashboardItems),
});
const state = reactive({
    isSharedDashboard: computed<boolean>(() => !!dashboardDetailGetters.dashboardInfo?.shared),
    sharedScope: computed<DashboardScope|undefined>(() => dashboardDetailGetters.dashboardInfo?.scope),
    selectedSharedScope: 'WORKSPACE' as DashboardScope,
    showBadge: computed<boolean>(() => {
        if (dashboardDetailGetters.dashboardInfo?.user_id) return true;
        return state.isSharedDashboard;
    }),
    badgeType: computed<BadgeType>(() => 'subtle'),
    badgeStyleType: computed<BadgeStyleType>(() => {
        if (dashboardDetailGetters.isPrivate) return 'gray150';
        if (state.sharedScope === 'PROJECT') return 'primary3';
        return 'indigo100';
    }),
    badgeText: computed(() => {
        if (dashboardDetailState.dashboardId?.startsWith('private')) return i18n.t('DASHBOARDS.ALL_DASHBOARDS.PRIVATE');
        if (state.isSharedDashboard) {
            if (storeState.isAdminMode) {
                if (dashboardDetailGetters.dashboardInfo?.scope === 'PROJECT') {
                    return i18n.t('DASHBOARDS.DETAIL.SHARED_TO_ALL_PROJECTS');
                }
                return i18n.t('DASHBOARDS.DETAIL.SHARED_TO_WORKSPACES');
            }
            if (state.sharedScope === 'PROJECT') return i18n.t('DASHBOARDS.DETAIL.SHARED_TO_ALL_PROJECTS');
            return i18n.t('DASHBOARDS.DETAIL.SHARED_BY_ADMIN');
        }
        return '';
    }),
    folderName: computed<string|undefined>(() => {
        const _folderId = dashboardPageControlGetters.allDashboardItems.find((d) => d.dashboard_id === props.dashboardId)?.folder_id;
        const folder = dashboardPageControlGetters.allFolderItems.find((d) => d.folder_id === _folderId);
        return folder?.name;
    }),
});

/* Event */
const handleSelectItem = (item: MenuItem) => {
    if (item.name === 'edit') dashboardPageControlStore.openEditNameModal(props.dashboardId);
    if (item.name === 'clone') dashboardPageControlStore.openCloneModal(props.dashboardId);
    if (item.name === 'move') dashboardPageControlStore.openMoveModal(props.dashboardId);
    if (item.name === 'share') dashboardPageControlStore.openShareModal(props.dashboardId);
    if (item.name === 'shareWithCode') dashboardPageControlStore.openShareWithCodeModal(props.dashboardId);
    if (item.name === 'delete') dashboardPageControlStore.openDeleteModal(props.dashboardId);
};
</script>

<template>
    <div class="dashboard-detail-header">
        <div v-if="state.folderName"
             class="folder-name-wrapper"
        >
            <p-i name="ic_folder"
                 width="1rem"
                 height="1rem"
                 :color="gray[600]"
            />
            <span class="folder-name">{{ state.folderName }}</span>
        </div>
        <p-heading-layout class="mb-6">
            <template #heading>
                <p-heading :title="dashboardDetailGetters.dashboardName">
                    <p-skeleton v-if="!dashboardDetailGetters.dashboardName"
                                width="20rem"
                                height="1.5rem"
                    />
                    <template #title-right-extra>
                        <p-badge v-if="state.showBadge"
                                 :badge-type="state.badgeType"
                                 :style-type="state.badgeStyleType"
                                 class="mr-2"
                        >
                            <p-i v-if="dashboardDetailGetters.isPrivate"
                                 name="ic_lock-filled"
                                 width="0.75rem"
                                 height="0.75rem"
                                 color="gray900"
                                 class="mr-1"
                            />
                            {{ state.badgeText }}
                        </p-badge>
                        <p-select-dropdown class="dashboard-setting-dropdown"
                                           style-type="tertiary-icon-button"
                                           button-icon="ic_ellipsis-horizontal"
                                           size="sm"
                                           :menu="getControlMenuItems(props.dashboardId).value"
                                           :selected="[]"
                                           use-fixed-menu-style
                                           reset-selection-on-menu-close
                                           @select="handleSelectItem"
                        />
                        <dashboard-labels-button class="label-button"
                                                 :dashboard-id="props.dashboardId"
                        />
                    </template>
                </p-heading>
            </template>
            <template v-if="!dashboardDetailGetters.isDeprecatedDashboard"
                      #extra
            >
                <dashboard-control-buttons v-if="!dashboardDetailGetters.disableManageButtons"
                                           :dashboard-id="props.dashboardId"
                                           :name="dashboardDetailGetters.dashboardName"
                />
            </template>
        </p-heading-layout>
        <p v-if="props.templateName"
           class="template-name"
        >
            {{ props.templateName }}
        </p>
    </div>
</template>

<style lang="postcss" scoped>
.dashboard-detail-header {
    margin-bottom: 0.75rem;
    .folder-name-wrapper {
        display: flex;
        align-items: center;
        .folder-name {
            @apply text-paragraph-sm text-gray-600;
            margin-left: 0.125rem;
        }
    }
    .template-name {
        @apply text-paragraph-sm text-gray-500;
        margin-left: 2.5rem;
    }
    .label-button {
        display: inline-flex;
        margin-left: 0.5rem;
    }
}
.select-card-wrapper {
    @apply grid grid-cols-12;
    gap: 0.5rem;
    .p-select-card {
        @apply col-span-6;
    }
}
</style>
