<template>
    <widget-layout class="daily-updates"
                   overflow="auto"
    >
        <template #title>
            <div class="top">
                <p class="title">
                    {{ $t('COMMON.WIDGETS.DAILY_UPDATE_TITLE') }}
                </p>
                <p class="time">
                    {{ $t('COMMON.WIDGETS.DAILY_UPDATE_DESC') }}
                </p>
            </div>
        </template>

        <template #default>
            <p-data-loader :loading="loading"
                           :data="data"
                           loader-type="skeleton"
                           class="card-wrapper"
                           :class="{'fixed-height': loading || !data.length}"
            >
                <template #loader>
                    <div v-for="v in skeletons"
                         :key="`skeleton-${v}`"
                         class="flex p-4 items-center"
                    >
                        <p-skeleton width="2rem"
                                    height="2rem"
                                    class="mr-4 flex-shrink-0"
                        />
                        <div class="grid grid-cols-1 gap-1 w-full">
                            <p-skeleton width="80%"
                                        height="0.625rem"
                            />
                            <p-skeleton width="100%"
                                        height="0.625rem"
                            />
                        </div>
                    </div>
                </template>
                <template #no-data>
                    <p-empty
                        v-if="warningData.length === 0"
                        show-image
                        image-size="md"
                        :title="$t('COMMON.WIDGETS.DAILY_UPDATE_NO_DATA')"
                    >
                        <template #image>
                            <img alt="empty-image"
                                 src="@/assets/images/illust_spaceship_3.svg"
                            >
                        </template>
                    </p-empty>
                </template>

                <div v-if="warningData.length > 0"
                     class="daily-update-card-alert"
                >
                    <div v-for="(item, index) in warningData"
                         :key="index"
                         class="daily-update-card"
                    >
                        <div>
                            <p-lazy-img :src="assetUrlConverter(item.icon)"
                                        width="2rem"
                                        height="2rem"
                                        class="rounded flex-shrink-0 service-img"
                            />
                        </div>
                        <p v-if="item.createdCount || item.deletedCount"
                           class="daily-service"
                        >
                            {{ item.title }}<br> <span class="font-bold text-sm">{{ item.totalCount || 0 }}</span>
                        </p>
                        <router-link v-if="item.createdCount"
                                     :to="item.createdHref"
                                     class="daily-created-count"
                        >
                            {{ $t('COMMON.WIDGETS.DAILY_UPDATE_CREATED') }}  <br>
                            <span class="text-blue-600 font-bold text-sm">{{ item.createdCount || 0 }}
                                <p-i v-if="item.isCreateWarning"
                                     name="ic_warning-filled"
                                     width="0.75rem"
                                     height="0.75rem"
                                />
                            </span>
                        </router-link>
                        <router-link v-if="item.deletedCount"
                                     :to="item.deletedHref"
                                     class="daily-deleted-count"
                        >
                            {{ $t('COMMON.WIDGETS.DAILY_UPDATE_DELETED') }} <br>
                            <span class="text-red-500 font-bold text-sm"> {{ item.deletedCount || 0 }}
                                <p-i v-if="item.isDeleteWarning"
                                     name="ic_warning-filled"
                                     width="0.75rem"
                                     height="0.75rem"
                                />
                            </span>
                        </router-link>
                    </div>
                </div>
                <div v-for="(item, index) in commonData"
                     :key="index"
                     class="daily-update-card"
                >
                    <div>
                        <p-lazy-img :src="assetUrlConverter(item.icon)"
                                    width="2rem"
                                    height="2rem"
                                    class="rounded flex-shrink-0 service-img"
                        />
                    </div>
                    <p v-if="item.createdCount || item.deletedCount"
                       class="daily-service"
                    >
                        {{ item.title }}<br> <span class="text-sm font-bold">{{ item.totalCount || 0 }}</span>
                    </p>
                    <router-link v-if="item.createdCount"
                                 :to="item.createdHref"
                                 class="daily-created-count"
                    >
                        {{ $t('COMMON.WIDGETS.DAILY_UPDATE_CREATED') }}  <br>
                        <span class="text-blue-600 font-bold text-sm">{{ item.createdCount || 0 }}</span>
                    </router-link>
                    <router-link v-if="item.deletedCount"
                                 :to="item.deletedHref"
                                 class="daily-deleted-count"
                    >
                        {{ $t('COMMON.WIDGETS.DAILY_UPDATE_DELETED') }} <br>
                        <span class="text-red-500 font-bold text-sm"> {{ item.deletedCount || 0 }}</span>
                    </router-link>
                </div>
            </p-data-loader>
        </template>
    </widget-layout>
</template>

<script lang="ts">
import {
    computed, reactive, toRefs,
} from 'vue';
import type { Location } from 'vue-router';

import dayjs from 'dayjs';
import { range } from 'lodash';

import { QueryHelper } from '@cloudforet/core-lib/query';
import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import {
    PLazyImg, PSkeleton, PI, PDataLoader, PEmpty,
} from '@cloudforet/mirinae';

import { useUserWorkspaceStore } from '@/store/app-context/workspace/user-workspace-store';
import { useAllReferenceStore } from '@/store/reference/all-reference-store';
import type { ProviderReferenceMap } from '@/store/reference/provider-reference-store';
import { useUserStore } from '@/store/user/user-store';

import { assetUrlConverter } from '@/lib/helper/asset-helper';
import { arrayToQueryString } from '@/lib/router-query-string';

import WidgetLayout from '@/common/components/layouts/WidgetLayout.vue';
import ErrorHandler from '@/common/composables/error/errorHandler';
import { useGrantScopeGuard } from '@/common/composables/grant-scope-guard';

import { ASSET_INVENTORY_ROUTE } from '@/services/asset-inventory/routes/route-constant';
import type { CloudServiceDetailPageUrlQuery } from '@/services/asset-inventory/types/cloud-service-page-type';


interface CloudServiceData {
    cloud_service_group: string;
    cloud_service_type: string;
    total_count: number;
    icon: string;
    provider: string;
    created_count: number;
    deleted_count: number;
    create_warning: boolean;
    delete_warning: boolean;
    display_name?: string;
}

interface Item {
    title: string;
    isCreateWarning?: boolean;
    isDeleteWarning?: boolean;
    icon?: string;
    totalCount: number;
    createdCount: number;
    deletedCount: number;
    createdHref?: Location;
    deletedHref?: Location;
}

export default {
    name: 'DailyUpdates',
    components: {
        WidgetLayout,
        PLazyImg,
        PI,
        PSkeleton,
        PDataLoader,
        PEmpty,
    },
    props: {
        extraParams: {
            type: Object,
            default: () => ({}),
        },
        projectId: {
            type: String,
            default: undefined,
        },
    },
    setup(props) {
        const userWorkspaceStore = useUserWorkspaceStore();
        const allReferenceStore = useAllReferenceStore();
        const userStore = useUserStore();
        const queryHelper = new QueryHelper();
        const state = reactive({
            providers: computed<ProviderReferenceMap>(() => allReferenceStore.getters.provider),
            currentWorkspaceId: computed<string|undefined>(() => userWorkspaceStore.getters.currentWorkspaceId),
            cloudServiceData: [] as CloudServiceData[],
            data: [] as Item[],
            commonData: computed(() => state.data.filter((d) => !d.isCreateWarning && !d.isDeleteWarning)),
            warningData: computed(() => state.data.filter((d) => d.isCreateWarning || d.isDeleteWarning)),
            loading: true,
            skeletons: range(4),
        });

        /* API */
        const listCloudServiceData = async (): Promise<void> => {
            state.loading = true;
            try {
                const params: Record<string, string> = {
                    timezone: userStore.state.timezone,
                };
                if (props.projectId) params.project_id = props.projectId;
                const { results } = await SpaceConnector.client.statistics.topic.dailyUpdateCloudService({
                    ...props.extraParams,
                    ...params,
                    workspace_id: state.currentWorkspaceId,
                });
                state.cloudServiceData = results;
            } catch (e) {
                ErrorHandler.handleError(e);
                state.cloudServiceData = [];
            } finally {
                state.loading = false;
            }
        };

        /* Util */
        const getConvertedCloudServiceData = (rawData: CloudServiceData[]): Item[] => {
            const results: Item[] = [];
            rawData.forEach((d) => {
                const query: CloudServiceDetailPageUrlQuery = {};
                if (props.projectId) {
                    query.project = arrayToQueryString([props.projectId]);
                }

                const result: Item = {
                    title: d.display_name ?? d.cloud_service_group,
                    icon: d.icon || state.providers[d.provider]?.icon,
                    isCreateWarning: d.create_warning,
                    isDeleteWarning: d.delete_warning,
                    totalCount: d.total_count,
                    createdCount: d.created_count,
                    deletedCount: d.deleted_count,
                    createdHref: {
                        name: ASSET_INVENTORY_ROUTE.CLOUD_SERVICE.DETAIL._NAME,
                        params: {
                            provider: d.provider,
                            group: d.cloud_service_group,
                            name: d.cloud_service_type,
                        },
                        query: {
                            ...query,
                            filters: queryHelper.setFilters([
                                { k: 'created_at', v: dayjs().format('YYYY-MM-DD'), o: '=t' },
                            ]).rawQueryStrings,
                        },
                    },
                    deletedHref: {
                        name: ASSET_INVENTORY_ROUTE.CLOUD_SERVICE.DETAIL._NAME,
                        params: {
                            provider: d.provider,
                            group: d.cloud_service_group,
                            name: d.cloud_service_type,
                        },
                        query: {
                            ...query,
                            filters: queryHelper.setFilters([
                                { k: 'deleted_at', v: dayjs().format('YYYY-MM-DD'), o: '=t' },
                                { k: 'state', v: 'DELETED', o: '=' },
                            ]).rawQueryStrings,
                        },
                    },
                };
                results.push(result);
            });
            return results;
        };

        /* Init */
        const init = async (): Promise<void> => {
            await Promise.allSettled([
                listCloudServiceData(),
            ]);
            state.data = getConvertedCloudServiceData(state.cloudServiceData);
        };
        const { callApiWithGrantGuard } = useGrantScopeGuard(['WORKSPACE'], init);
        callApiWithGrantGuard();

        return {
            ...toRefs(state),
            assetUrlConverter,
        };
    },
};
</script>

<style lang="postcss" scoped>
.daily-updates {
    @apply bg-white;

    /* custom widget-layout */
    :deep(&.widget-contents) {
        padding: 0;
    }

    /* custom design-system component - p-lazy-img */
    :deep(.p-lazy-img .img-container) {
        @apply rounded;
    }

    max-height: 25rem;
}

@screen lg {
    /* custom widget-layout */
    :deep(.daily-updates) {
        &.p-pane-layout {
            background-color: rgba(theme('colors.white'));
        }
        .title {
            font-size: 0.875rem;
            line-height: 1.5;
        }
    }
}

.top {
    @apply pb-4;
    .title {
        @apply text-gray-900;
        font-size: 1rem;
        line-height: 1.2;
        font-weight: bold;
        .desc {
            @apply text-gray-700;
            font-size: 0.75rem;
            line-height: 1.2;
            font-weight: normal;
        }
    }
    .time {
        @apply text-gray-500;
        margin-top: 0.375rem;
        font-size: 0.625rem;
        line-height: 1;
    }
}

.card-wrapper {
    @apply overflow-hidden whitespace-nowrap w-full rounded-md;
    height: 100%;
    &.fixed-height {
        height: 16rem;
    }
    .daily-update-card {
        @apply flex items-center w-full content-between overflow-hidden;
        padding-left: 1rem;
        height: 4rem;

        .daily-service {
            @apply text-xs truncate flex-shrink-0;
            margin-left: 0.75rem;
            width: 24%;
            max-width: 6.5rem;
            padding: 0.5rem;

            @media screen and (1024px < width < 1280px) {
                margin-left: 0;
            }
        }
        .daily-created-count {
            @apply text-xs flex-shrink-0;
            padding: 0.5rem;
            margin-right: 0.75rem;
            width: 24%;
            max-width: 6.5rem;
            &:hover {
                @apply bg-blue-100 cursor-pointer underline text-blue-600 rounded-md;
                opacity: 0.75;
            }
        }
        .daily-deleted-count {
            @apply text-xs flex-shrink-0;
            padding: 0.5rem;
            margin-right: 0.75rem;
            width: 24%;
            max-width: 6.5rem;
            &:hover {
                @apply bg-blue-100 cursor-pointer underline text-red-500 rounded-md;
                opacity: 0.75;
            }
        }
        .p-i-icon, .service-img {
            @apply rounded;

            @media screen and (1024px < width < 1280px) {
                display: none;
            }
        }
        &:nth-of-type(odd) {
            background-color: rgba(theme('colors.primary4'), 0.5);
        }
    }
}

/* custom design-system component - p-data-loader */
:deep(.p-data-loader) {
    .data-loader-container {
        .loader-wrapper {
            .loader {
                display: block;
            }
        }
    }
}
.card-wrapper .daily-update-card-alert {
    @apply flex items-center w-full content-between border rounded-md;
    flex-wrap: wrap;
    overflow: hidden;
    border-color: rgba(theme('colors.yellow.500'), 0.75);
    background: linear-gradient(90deg, rgba(theme('colors.yellow.100'), 0.75) 23.96%, rgba(theme('colors.yellow.300'), 0.75) 49.48%, rgba(theme('colors.yellow.100'), 0.75) 74.48%);
    background-size: 200% 200%;
    animation: gradient 3s ease infinite;

    @keyframes gradient {
        0% {
            background-position: 0% 50%;
        }
        100% {
            background-position: 100% 50%;
        }
    }

    .daily-update-card {
        background-color: rgba(theme('colors.yellow.100'), 0.75);
    }
}
</style>
