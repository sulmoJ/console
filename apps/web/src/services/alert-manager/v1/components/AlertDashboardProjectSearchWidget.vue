<script setup lang="ts">
import {
    computed, reactive, watch,
} from 'vue';
import { useRouter } from 'vue-router/composables';


import { makeReferenceValueHandler } from '@cloudforet/core-lib/component-util/query-search';
import { getApiQueryWithToolboxOptions } from '@cloudforet/core-lib/component-util/toolbox';
import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import { ApiQueryHelper } from '@cloudforet/core-lib/space-connector/helper';
import {
    PPaneLayout, PToolbox, PI, PDataLoader,
} from '@cloudforet/mirinae';
import type { KeyItemSet } from '@cloudforet/mirinae/types/controls/search/query-search/type';

import { useUserWorkspaceStore } from '@/store/app-context/workspace/user-workspace-store';
import { useAllReferenceStore } from '@/store/reference/all-reference-store';
import type { ProjectReferenceMap } from '@/store/reference/project-reference-store';

import ErrorHandler from '@/common/composables/error/errorHandler';

import { BACKGROUND_COLOR } from '@/styles/colorsets';

import AlertDashboardProjectSearchWidgetAlertList from '@/services/alert-manager/v1/components/AlertDashboardProjectSearchWidgetAlertList.vue';
import { PROJECT_ROUTE_V1 } from '@/services/project/v1/routes/route-constant';


const props = defineProps<{
    activatedProjects: string[];
}>();
const router = useRouter();

const allReferenceStore = useAllReferenceStore();
const userWorkspaceStore = useUserWorkspaceStore();
const storeState = reactive({
    currentWorkspaceId: computed<string|undefined>(() => userWorkspaceStore.getters.currentWorkspaceId),
});
const state = reactive({
    projects: computed<ProjectReferenceMap>(() => allReferenceStore.getters.project),
    totalCount: 0,
    pageLimit: 12,
    items: [],
    tags: [],
    loading: false,
    isHealthy: computed(() => {
        if (state.totalCount === 0 && props.activatedProjects.length > 0 && !state.loading) return true;
        return false;
    }),
});
const handlers = {
    keyItemSets: [{
        title: 'Properties',
        items: [
            { name: 'project_id', label: 'Project' },
        ],
    }] as KeyItemSet[],
    valueHandlerMap: {
        project_id: makeReferenceValueHandler('identity.Project'),
    },
};

/* util */
const projectGroupNameFormatter = (projectId: string, projects?: ProjectReferenceMap) => {
    if (!projects) return undefined;
    const projectLabel = projects[projectId]?.label;
    const projectName = projects[projectId]?.name;
    if (!projectLabel || projectLabel === projectName) return undefined;
    return projectLabel.replace(` > ${projectName}`, '');
};
const projectNameFormatter = (projectId: string, projects: ProjectReferenceMap) => projects[projectId]?.name || projectId;

/* api */
const AlertByProjectApiQueryHelper = new ApiQueryHelper()
    .setPageStart(1).setPageLimit(state.pageLimit);
let AlertByProjectApiQuery = AlertByProjectApiQueryHelper.data;
const listAlertByProject = async () => {
    state.loading = true;
    try {
        const { results, total_count } = await SpaceConnector.client.monitoring.dashboard.alertByProject({
            workspace_id: storeState.currentWorkspaceId,
            activated_projects: props.activatedProjects,
            query: AlertByProjectApiQuery,
        });
        state.items = results;
        state.totalCount = total_count;
    } catch (e) {
        ErrorHandler.handleError(e);
        state.items = [];
        state.totalCount = 0;
    } finally {
        state.loading = false;
    }
};

/* event */
const onChange = async (options?: any) => {
    AlertByProjectApiQuery = getApiQueryWithToolboxOptions(AlertByProjectApiQueryHelper, options) ?? AlertByProjectApiQuery;
    await listAlertByProject();
};
const onClickProjectBox = (item) => {
    router.push({ name: PROJECT_ROUTE_V1.DETAIL.TAB.ALERT._NAME, params: { id: item.project_id } });
};

/* init */
watch(() => props.activatedProjects, async (activatedProjects) => {
    if (activatedProjects.length) {
        await listAlertByProject();
    }
});
</script>

<template>
    <div class="project-search-widget">
        <p-toolbox search-type="query"
                   :query-tags="state.tags"
                   :key-item-sets="handlers.keyItemSets"
                   :value-handler-map="handlers.valueHandlerMap"
                   :total-count="state.totalCount"
                   :page-size.sync="state.pageLimit"
                   :page-size-options="[12, 24, 36]"
                   @change="onChange"
                   @refresh="onChange()"
        />
        <p-data-loader
            :data="state.items"
            :loading="state.loading"
            :loader-backdrop-color="BACKGROUND_COLOR"
        >
            <div class="box-group">
                <div v-for="(item, idx) in state.items"
                     :key="`box-${idx}`"
                     class="box"
                     @click="onClickProjectBox(item)"
                >
                    <p class="sub-title">
                        {{ projectGroupNameFormatter(item.project_id, state.projects) }}
                    </p>
                    <p class="title">
                        {{ projectNameFormatter(item.project_id, state.projects) }}
                    </p>
                    <div class="content-wrapper">
                        <alert-dashboard-project-search-widget-alert-list
                            v-if="item.alert_count > 0"
                            :project-id="item.project_id"
                        />
                    </div>
                </div>
            </div>
        </p-data-loader>
        <p-pane-layout v-if="state.isHealthy"
                       class="project-healthy"
        >
            <p-i name="ic_face-smile"
                 width="3rem"
                 height="3rem"
                 color="inherit"
            />
            <p>{{ $t('MONITORING.ALERT.DASHBOARD.PROJECTS_HEALTHY') }}</p>
        </p-pane-layout>
    </div>
</template>

<style lang="postcss" scoped>
.project-search-widget {
    /* custom design-system component - .p-toolbox */
    :deep(.p-toolbox) {
        .p-search {
            @apply rounded-md;
        }
    }

    .box-group {
        @apply grid grid-cols-12;
        gap: 1rem;

        .box {
            @apply col-span-6 bg-white border border-gray-200 rounded-md;
            height: 20rem;
            box-sizing: border-box;
            box-shadow: 0 0.125rem 0.25rem rgba(theme('colors.black'), 0.06);
            cursor: pointer;
            padding: 1rem;

            &:hover {
                @apply bg-secondary2;
            }

            .sub-title {
                @apply text-gray-500;
                line-height: 1.3;
                font-size: 0.75rem;
            }
            .title {
                line-height: 1.6;
                font-size: 1rem;
                font-weight: bold;
                margin-bottom: 0.75rem;
            }
            .content-wrapper {
                display: flex;
                flex-direction: column;
                gap: 0.75rem;

                /* custom design-system component - p-list-card */
                :deep(.project-alert-list-item) {
                    .body {
                        max-height: 12.5rem;
                    }
                }
            }
        }
    }

    .project-healthy {
        @apply bg-green-100 text-green-600 text-center;
        padding: 3rem 0;
        margin-top: 0.5rem;
        .p-i-icon {
            margin: 0 auto;
        }
        p {
            margin-top: 0.5rem;
            color: inherit;
            font-size: 1rem;
            line-height: 1.6;
        }
    }

    @screen mobile {
        .box-group {
            .box {
                grid-column: span 12 / span 12;
            }
        }
    }
}
</style>
