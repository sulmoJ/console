<script lang="ts" setup>
import {
    computed, nextTick, reactive, watch,
} from 'vue';

import dayjs from 'dayjs';

import { QueryHelper } from '@cloudforet/core-lib/query';
import type { ConsoleFilter } from '@cloudforet/core-lib/query/type';
import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import { ApiQueryHelper } from '@cloudforet/core-lib/space-connector/helper';
import {
    PLink, PToolboxTable, PTooltip,
} from '@cloudforet/mirinae';
import { numberFormatter } from '@cloudforet/utils';

import { i18n } from '@/translations';

import { useReferenceRouter } from '@/router/composables/use-reference-router';

import { useUserWorkspaceStore } from '@/store/app-context/workspace/user-workspace-store';
import { useAllReferenceStore } from '@/store/reference/all-reference-store';
import type { CloudServiceTypeReferenceMap } from '@/store/reference/cloud-service-type-reference-store';
import type { ProviderReferenceMap } from '@/store/reference/provider-reference-store';
import type { RegionReferenceMap } from '@/store/reference/region-reference-store';
import { useUserStore } from '@/store/user/user-store';

import WidgetLayout from '@/common/components/layouts/WidgetLayout.vue';
import ErrorHandler from '@/common/composables/error/errorHandler';

import { ASSET_INVENTORY_ROUTE } from '@/services/asset-inventory/routes/route-constant';

enum EVENT_CATEGORY {
    accountNotification = 'accountNotification',
    scheduledChange = 'scheduledChange',
    issue = 'issue'
}
const CLOUD_SERVICE_GROUP = 'PersonalHealthDashboard';
const CLOUD_SERVICE_NAME = 'Event';
const EVENT_PERIOD = 7;

interface Props {
    projectId?: string;
}
const props = withDefaults(defineProps<Props>(), {
    projectId: undefined,
});
const allReferenceStore = useAllReferenceStore();
const userStore = useUserStore();
const getEventsApiQuery = new ApiQueryHelper();
const queryHelper = new QueryHelper();
const userWorkspaceStore = useUserWorkspaceStore();

const { getReferenceLocation } = useReferenceRouter();

const storeState = reactive({
    currentWorkspaceId: computed<string|undefined>(() => userWorkspaceStore.getters.currentWorkspaceId),
});
const state = reactive({
    loading: false,
    regions: computed<RegionReferenceMap>(() => allReferenceStore.getters.region),
    timezone: computed<string|undefined>(() => userStore.state.timezone),
    cloudServiceTypes: computed<CloudServiceTypeReferenceMap>(() => allReferenceStore.getters.cloudServiceType),
    providers: computed<ProviderReferenceMap>(() => allReferenceStore.getters.provider),
    pageStart: 1,
    pageLimit: 5,
    totalCount: 0,
    data: [],
    summaryData: computed(() => ([
        {
            name: EVENT_CATEGORY.issue,
            label: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.SUMMARY_ISSUE'),
            count: state.countData.issue,
            date: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.PAST_7_DAYS'),
        },
        {
            name: EVENT_CATEGORY.scheduledChange,
            label: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.SUMMARY_SCHEDULED_CHANGE'),
            count: state.countData.scheduledChange,
            date: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.UPCOMING_AND_PAST_7_DAYS'),
        },
        {
            name: EVENT_CATEGORY.accountNotification,
            label: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.SUMMARY_NOTIFICATION'),
            count: state.countData.accountNotification,
            date: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.PAST_7_DAYS'),
        },
    ])),
    fields: computed(() => [
        { name: 'event', label: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.FIELD_EVENT'), sortable: false },
        { name: 'region_code', label: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.FIELD_REGION') },
        { name: 'start_time', label: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.FIELD_START_TIME') },
        { name: 'last_update_time', label: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.FIELD_LAST_UPDATE_TIME') },
        { name: 'affected_resources', label: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.FIELD_AFFECTED_RESOURCES'), sortable: false },
    ]),
    countData: {},
    search: '',
    sortBy: 'last_update_time',
    sortDesc: true,
    awsProvider: computed(() => state.providers.aws),
});
const tabState = reactive({
    tabs: computed(() => [
        {
            name: EVENT_CATEGORY.issue,
            label: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.SUMMARY_ISSUE'),
            type: 'item',
        }, {
            name: EVENT_CATEGORY.scheduledChange,
            label: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.SUMMARY_SCHEDULED_CHANGE'),
            type: 'item',
        }, {
            name: EVENT_CATEGORY.accountNotification,
            label: i18n.t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.SUMMARY_NOTIFICATION'),
            type: 'item',
        },
    ]),
    activeTab: EVENT_CATEGORY.issue,
});

/* util */
const summaryLinkFormatter = (category) => {
    const filters: ConsoleFilter[] = [];
    const status = ['open'];
    if (category === EVENT_CATEGORY.scheduledChange) status.push('upcoming');
    filters.push({ k: 'data.event_type_category', o: '=', v: category });
    filters.push({ k: 'data.status_code', o: '=', v: status });

    return {
        name: ASSET_INVENTORY_ROUTE.CLOUD_SERVICE.DETAIL._NAME,
        query: {
            filters: queryHelper.setFilters(filters).rawQueryStrings,
        },
        params: {
            provider: 'aws',
            group: CLOUD_SERVICE_GROUP,
            name: CLOUD_SERVICE_NAME,
        },
    };
};

/* api */
const getCount = async () => {
    try {
        state.countData = await SpaceConnector.client.statistics.topic.phdCountByType({
            project_id: props.projectId,
            period: EVENT_PERIOD,
            workspace_id: storeState.currentWorkspaceId,
        });
    } catch (e) {
        ErrorHandler.handleError(e);
    }
};
const getEvents = async () => {
    try {
        state.loading = true;
        getEventsApiQuery
            .setSort(state.sortBy, state.sortDesc)
            .setPage(state.pageStart, state.pageLimit)
            .setFilters([{ v: state.search }]);
        const res = await SpaceConnector.client.statistics.topic.phdEvents({
            project_id: props.projectId,
            event_type_category: tabState.activeTab,
            query: getEventsApiQuery.data,
            period: EVENT_PERIOD,
            workspace_id: storeState.currentWorkspaceId,
        });

        state.totalCount = res.total_count;
        state.data = res.results.map((d) => {
            const startTime = dayjs.tz(dayjs(d.start_time).utc(), state.timezone).format('YYYY-MM-DD HH:mm:ss');
            const lastUpdateTime = dayjs.tz(dayjs(d.last_update_time).utc(), state.timezone).format('YYYY-MM-DD HH:mm:ss');
            return {
                event: {
                    name: d.event_title,
                    to: getReferenceLocation(d.resource_id, {
                        resource_type: 'inventory.CloudService',
                        workspace_id: storeState.currentWorkspaceId,
                    }),
                },
                region_code: d.region_code,
                start_time: startTime,
                last_update_time: lastUpdateTime,
                affected_resources: d.affected_resources,
            };
        });
    } catch (e) {
        ErrorHandler.handleError(e);
        state.data = [];
    } finally {
        state.loading = false;
    }
};

/* event */
const onChange = () => {
    nextTick(async () => {
        await getEvents();
    });
};

watch(() => tabState.activeTab, () => {
    getEvents();
}, { immediate: false });

/* init */
(async () => {
    await Promise.allSettled([
        getEvents(), getCount(),
    ]);
})();
</script>

<template>
    <div class="project-summary-personal-health-dashboard-widget">
        <template v-if="state.awsProvider">
            <div class="title">
                <span :style="{ color: state.awsProvider ? state.awsProvider.color : '' }">AWS </span>
                <span>{{ $t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.TITLE') }}</span>
            </div>

            <div class="summary-wrapper"
                 :style="{ color: state.awsProvider ? state.awsProvider.color : '' }"
            >
                <div v-for="(data, index) in state.summaryData"
                     :key="index"
                     class="summary"
                     :class="{active: tabState.activeTab === data.name}"
                     @click="tabState.activeTab = data.name"
                >
                    <p-link :to="summaryLinkFormatter(data.name)"
                            class="count"
                            highlight
                    >
                        {{ numberFormatter(data.count, { notation: 'compact' }) }}
                    </p-link>
                    <span class="label">{{ data.label }}</span>
                    <span class="date">{{ data.date }}</span>
                </div>
            </div>

            <widget-layout>
                <p-toolbox-table :loading="state.loading"
                                 :fields="state.fields"
                                 :items="state.data"
                                 :sort-by.sync="state.sortBy"
                                 :sort-desc.sync="state.sortDesc"
                                 :search-text.sync="state.search"
                                 :placeholder="$t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.PLACEHOLDER')"
                                 :page-size-changeable="false"
                                 sortable
                                 class="search-table"
                                 @change="onChange"
                >
                    <template #col-event-format="{ value }">
                        <p-link :to="value.to"
                                action-icon="external-link"
                                highlight
                        >
                            {{ value.name }}
                        </p-link>
                    </template>
                    <template #col-region_code-format="{ value }">
                        <span>{{ state.regions[value]?.name || value }}</span>
                    </template>
                    <template #col-start_time-format="{ value }">
                        <span>{{ value }}</span>
                    </template>
                    <template #col-affected_resources-format="{ value }">
                        <div v-if="value.length > 0">
                            <div v-for="(resource, index) in value"
                                 :key="index"
                                 class="affected-resources-wrapper"
                            >
                                <template v-if="resource.entity_type === 'account'">
                                    <span class="label">{{ $t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.ACCOUNT_ID') }} : </span>
                                    <span class="value">{{ resource.aws_account_id }}</span>
                                </template>
                                <template v-else>
                                    <p-tooltip :contents="resource.entity_value">
                                        <p-link action-icon="internal-link"
                                                new-tab
                                                :to="getReferenceLocation(resource.entity_value, {
                                                    resource_type: 'inventory.CloudService',
                                                    workspace_id: storeState.currentWorkspaceId,
                                                })"
                                                class="affected-resource-link"
                                                highlight
                                        >
                                            {{ resource.entity_value }}
                                        </p-link>
                                    </p-tooltip>
                                </template>
                            </div>
                        </div>
                        <div v-else />
                    </template>
                    <template #no-data-format>
                        {{ $t('COMMON.WIDGETS.PERSONAL_HEALTH_DASHBOARD.NO_DATA') }}
                    </template>
                </p-toolbox-table>
            </widget-layout>
        </template>
    </div>
</template>

<style lang="postcss" scoped>
.project-summary-personal-health-dashboard-widget {
    .title {
        font-size: 1.5rem;
        line-height: 1.4;
        padding-top: 0.5rem;
        margin-bottom: 0.75rem;
    }
    .widget-layout {
        @apply block border border-gray-200 rounded-md;
        padding: 0;
    }
}
.summary-wrapper {
    @apply flex;
    margin-bottom: -1px;
    .summary {
        @apply flex-grow border border-gray-200 bg-white rounded-tr-lg rounded-tl-lg;
        margin-right: 0.375rem;
        max-width: 15.25rem;
        cursor: pointer;
        padding: 0.625rem 1rem;
        &:last-child {
            @apply m-0;
        }
        &.active {
            box-shadow: inset 0 3px currentColor;
            border-bottom-color: theme('colors.white');
        }
        .count {
            font-size: 1.125rem;
            padding-right: 0.375rem;
        }
        .label {
            @apply text-gray-900;
            font-size: 0.875rem;
            font-weight: bold;
        }
        .date {
            @apply text-gray-500;
            display: block;
            font-size: 0.75rem;
            line-height: 1.2;
            padding-top: 0.25rem;
        }
    }
}

.search-table {
    @apply bg-white;
    height: 18.75rem;
    border-width: 0;
    .affected-resources-wrapper {
        display: flex;
        width: 10rem;
        line-height: 1.4;
        flex-wrap: wrap;
        padding-bottom: 0.5rem;
        &:first-child {
            padding-top: 0.5rem;
        }
        .label {
            @apply text-gray-600;
        }
    }
}

/* custom design-system component - p-link */
.affected-resource-link {
    :deep(.p-link) {
        .text {
            @apply truncate;
            width: 10rem;
            display: inline-block;
        }
    }
}
</style>
