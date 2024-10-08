<script setup lang="ts">
import {
    computed,
    onUnmounted, reactive, ref, watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router/composables';

import {
    PDivider, PI,
} from '@cloudforet/mirinae';

import { SpaceRouter } from '@/router';
import { i18n } from '@/translations';

import { useAppContextStore } from '@/store/app-context/app-context-store';
import { useDashboardStore } from '@/store/dashboard/dashboard-store';

import { useBreadcrumbs } from '@/common/composables/breadcrumbs';
import ErrorHandler from '@/common/composables/error/errorHandler';
import { useProperRouteLocation } from '@/common/composables/proper-route-location';
import type { FavoriteOptions } from '@/common/modules/favorites/favorite-button/type';
import { FAVORITE_TYPE } from '@/common/modules/favorites/favorite-button/type';
import { useGnbStore } from '@/common/modules/navigations/stores/gnb-store';
import { useWidgetGenerateStore } from '@/common/modules/widgets/_store/widget-generate-store';

import DashboardDetailHeader from '@/services/dashboards/components/DashboardDetailHeader.vue';
import DashboardRefreshDropdown from '@/services/dashboards/components/DashboardRefreshDropdown.vue';
import DashboardToolsetDateDropdown from '@/services/dashboards/components/DashboardToolsetDateDropdown.vue';
import DashboardVariables from '@/services/dashboards/components/DashboardVariables.vue';
import DashboardVariablesV2 from '@/services/dashboards/components/DashboardVariablesV2.vue';
import DashboardWidgetContainer from '@/services/dashboards/components/DashboardWidgetContainer.vue';
import DashboardWidgetContainerV2 from '@/services/dashboards/components/DashboardWidgetContainerV2.vue';
import { DASHBOARD_SCOPE } from '@/services/dashboards/constants/dashboard-constant';
import { DASHBOARD_TEMPLATES } from '@/services/dashboards/dashboard-template/template-list';
import { DASHBOARDS_ROUTE } from '@/services/dashboards/routes/route-constant';
import { useDashboardDetailInfoStore } from '@/services/dashboards/stores/dashboard-detail-info-store';


interface Props {
    dashboardId: string;
}
const props = defineProps<Props>();

const gnbStore = useGnbStore();
const dashboardStore = useDashboardStore();
const dashboardDetailStore = useDashboardDetailInfoStore();
const dashboardDetailGetters = dashboardDetailStore.getters;
const dashboardDetailState = dashboardDetailStore.state;
const widgetGenerateStore = useWidgetGenerateStore();
const { breadcrumbs } = useBreadcrumbs();
const router = useRouter();
const route = useRoute();

const { getProperRouteLocation } = useProperRouteLocation();
const appContextStore = useAppContextStore();
const widgetContainerRef = ref<typeof DashboardWidgetContainer|null>(null);

const state = reactive({
    isAdminMode: computed(() => appContextStore.getters.isAdminMode),
    templateName: computed(() => DASHBOARD_TEMPLATES[dashboardDetailState.templateId]?.name),
    dashboardScope: computed(() => dashboardDetailState.dashboardScope),
    dashboardMiddleRouteLabel: computed(() => {
        if (state.dashboardScope === DASHBOARD_SCOPE.WORKSPACE) return i18n.t('DASHBOARDS.ALL_DASHBOARDS.WORKSPACE');
        if (state.dashboardScope === DASHBOARD_SCOPE.PROJECT) return i18n.t('DASHBOARDS.ALL_DASHBOARDS.SINGLE_PROJECT');
        if (state.dashboardScope === DASHBOARD_SCOPE.PRIVATE) return i18n.t('DASHBOARDS.ALL_DASHBOARDS.PRIVATE');
        return '';
    }),
    dashboardCustomBreadcrumbs: computed(() => {
        const _breadcrumbs = breadcrumbs.value;
        const customMiddleRoute = router.match({
            name: DASHBOARDS_ROUTE._NAME,
            params: { workspaceId: route.params.workspaceId },
            query: { scope: state.dashboardScope },
        });
        if (state.isAdminMode) return _breadcrumbs;
        const dashboardMiddleRoute = {
            name: state.dashboardMiddleRouteLabel,
            to: { path: customMiddleRoute.fullPath },
        };
        return [_breadcrumbs[0], dashboardMiddleRoute, _breadcrumbs[1]];
    }),
    favoriteOptions: computed<FavoriteOptions>(() => ({
        type: FAVORITE_TYPE.DASHBOARD,
        id: props.dashboardId,
    })),
    dashboardVariablesLoading: false,
});

const getDashboardData = async (dashboardId: string) => {
    try {
        await dashboardDetailStore.getDashboardInfo(dashboardId);
    } catch (e) {
        ErrorHandler.handleError(e);
        await SpaceRouter.router.push(getProperRouteLocation({ name: DASHBOARDS_ROUTE._NAME }));
    }
};

// else
const handleRefresh = async () => {
    if (dashboardDetailState.dashboardInfo?.version === '2.0') await dashboardDetailStore.listDashboardWidgets();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (widgetContainerRef.value) widgetContainerRef.value.refreshAllWidget();
};
const handleUpdateDashboardVariables = async (params) => {
    state.dashboardVariablesLoading = true;
    try {
        const updatedDashboard = await dashboardStore.updateDashboard(props.dashboardId, params);
        dashboardDetailStore.setDashboardInfo(updatedDashboard);
    } catch (e) {
        ErrorHandler.handleError(e);
    } finally {
        state.dashboardVariablesLoading = false;
    }
};

watch(() => props.dashboardId, async (dashboardId, prevDashboardId) => {
    /* NOTE: The dashboard data is reset in first entering case */
    if (dashboardId && !prevDashboardId) { // this includes all three cases
        dashboardDetailStore.reset();
    }
    await getDashboardData(dashboardId);
    // Set Dashboard Detail Custom breadcrumbs
    gnbStore.setBreadcrumbs(state.dashboardCustomBreadcrumbs);
}, { immediate: true });

watch(() => state.favoriteOptions, (favoriteOptions) => {
    gnbStore.setFavoriteItemId(favoriteOptions);
}, { immediate: true });

onUnmounted(() => {
    gnbStore.setBreadcrumbs([]);
    // Reset Dashboard Detail Custom breadcrumbs
    dashboardDetailStore.reset();
    widgetGenerateStore.reset();
});
</script>

<template>
    <div class="dashboard-detail-page">
        <div class="fixed-header">
            <div v-if="dashboardDetailGetters.isDeprecatedDashboard"
                 class="deprecated-banner"
            >
                <p-i name="ic_limit-filled"
                     width="1.25rem"
                     height="1.25rem"
                     color="inherit"
                />
                <div class="banner-content-wrapper">
                    <p class="title">
                        {{ $t('DASHBOARDS.ALL_DASHBOARDS.DEPRECATED') }}
                    </p>
                    <p class="description">
                        {{ $t('DASHBOARDS.ALL_DASHBOARDS.DEPRECATED_DESCRIPTION') }}
                    </p>
                </div>
            </div>
            <dashboard-detail-header :dashboard-id="props.dashboardId"
                                     :template-name="state.templateName"
            />
            <p-divider class="divider" />
        </div>
        <div class="filter-box">
            <dashboard-toolset-date-dropdown :date-range="dashboardDetailState.options.date_range" />
            <dashboard-refresh-dropdown :dashboard-id="props.dashboardId"
                                        :loading="dashboardDetailState.loadingWidgets"
                                        @refresh="handleRefresh"
            />
        </div>
        <div class="dashboard-selectors">
            <dashboard-variables v-if="dashboardDetailGetters.isDeprecatedDashboard"
                                 class="variable-selector-wrapper"
                                 :loading="state.dashboardVariablesLoading"
                                 @update="handleUpdateDashboardVariables"
            />
            <dashboard-variables-v2 v-else
                                    class="variable-selector-wrapper"
                                    :disable-save-button="dashboardDetailGetters.disableManageButtons"
                                    :loading="state.dashboardVariablesLoading"
                                    @update="handleUpdateDashboardVariables"
            />
        </div>

        <dashboard-widget-container v-if="dashboardDetailGetters.isDeprecatedDashboard"
                                    ref="widgetContainerRef"
        />
        <dashboard-widget-container-v2 v-else
                                       ref="widgetContainerRef"
        />
    </div>
</template>

<style lang="postcss" scoped>
.dashboard-detail-page {
    @apply relative;
    .fixed-header {
        @apply sticky bg-gray-100;
        z-index: 20;
        top: 0;
        padding-top: 1.75rem;
        margin-top: -1.75rem;
        .deprecated-banner {
            @apply bg-red-100 text-red-500;
            top: 0;
            width: 105%;
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            padding: 1.125rem 1.5rem;
            margin: -1.5rem 0 1.5rem -1.5rem;
            .banner-content-wrapper {
                .title {
                    @apply text-label-lg text-red-500 font-bold;
                    padding-bottom: 0.25rem;
                }
                .description {
                    @apply text-paragraph-md text-gray-900;
                }
            }
        }
        .divider {
            @apply mb-4;
        }
    }
    .filter-box {
        @apply flex justify-between items-start mb-4;
    }
    .dashboard-selectors {
        padding-bottom: 1.25rem;

        .variable-selector-wrapper {
            @apply relative flex items-center flex-wrap;
            gap: 0.5rem;
            padding-right: 1rem;
        }
    }
}
</style>
