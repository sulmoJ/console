<script setup lang="ts">
import { computed, reactive } from 'vue';

import { makeDistinctValueHandler } from '@cloudforet/core-lib/component-util/query-search';
import { getApiQueryWithToolboxOptions } from '@cloudforet/core-lib/component-util/toolbox';
import { ApiQueryHelper } from '@cloudforet/core-lib/space-connector/helper';
import { PToolboxTable } from '@cloudforet/mirinae';
import { iso8601Formatter } from '@cloudforet/utils';

import { useQueryTags } from '@/common/composables/query-tags';

import WorkspaceGroupTableToolbox from '@/services/advanced/components/WorkspaceGroupTableToolbox.vue';
import { WORKSPACE_GROUP_SEARCH_HANDLERS } from '@/services/advanced/constants/workspace-group-constant';
import { useWorkspaceGroupPageStore } from '@/services/advanced/store/workspace-group-page-store';

interface Props {
    tableHeight: number;
    hasReadWriteAccess?: boolean
}

const workspaceGroupPageStore = useWorkspaceGroupPageStore();
const workspaceGroupPageState = workspaceGroupPageStore.state;

const queryTagHelper = useQueryTags({ keyItemSets: WORKSPACE_GROUP_SEARCH_HANDLERS.keyItemSets });
const { queryTags } = queryTagHelper;

const workspaceGroupListApiQueryHelper = new ApiQueryHelper()
    .setPageStart(workspaceGroupPageState.pageStart).setPageLimit(workspaceGroupPageState.pageLimit)
    .setSort('name', true);
let workspaceGroupListApiQuery = workspaceGroupListApiQueryHelper.data;

const props = withDefaults(defineProps<Props>(), {
    tableHeight: 400,
    hasReadWriteAccess: true,
});

const tableState = reactive({
    fields: [
        { name: 'name', label: 'Name' },
        { name: 'workspaces', label: 'Workspace' },
        { name: 'users', label: 'Group User' },
        { name: 'created_at', label: 'Created At' },
    ],
    items: computed(() => workspaceGroupPageState.workspaceGroups.map(({
        name, workspace_count, users, created_at,
    }) => ({
        name,
        workspaces: workspace_count ?? 0,
        users: users?.length ?? 0,
        created_at,
    }))),
    valueHandlerMap: computed(() => {
        const resourceType = 'identity.WorkspaceGroup';

        return {
            name: makeDistinctValueHandler(resourceType, 'name', 'string', [{ k: 'name', v: '', o: 'not' }]),
            // workspaces: makeReferenceValueHandler(resourceType),
            // users: makeDistinctValueHandler(resourceType, 'users'),
            created: makeDistinctValueHandler(resourceType, 'created', 'datetime'),
        };
    }),
});



const handleUpdateSelectIndices = (indices: number[]) => {
    workspaceGroupPageStore.$patch((_state) => {
        _state.state.selectedIndices = indices;
        _state.userTabState.selectedUserIndices = [];
        _state.userTabState.searchText = '';
        _state.workspaceTabState.selectedWorkspaceIndices = [];
        _state.workspaceTabState.searchText = '';
    });
};

const handleChange = async (options: any = {}) => {
    workspaceGroupListApiQuery = getApiQueryWithToolboxOptions(workspaceGroupListApiQueryHelper, options) ?? workspaceGroupListApiQuery;
    if (options.queryTags !== undefined) {
        workspaceGroupPageStore.$patch((_state) => {
            _state.state.searchFilters = workspaceGroupListApiQueryHelper.filters;
        });
    }

    if (options.pageStart !== undefined) {
        workspaceGroupPageStore.$patch((_state) => {
            _state.state.pageStart = options.pageStart;
        });
    }
    if (options.pageLimit !== undefined) {
        workspaceGroupPageStore.$patch((_state) => {
            _state.state.pageLimit = options.pageLimit;
        });
    }

    await workspaceGroupPageStore.fetchWorkspaceGroups({ query: workspaceGroupListApiQuery });
};

const handleChangeSort = (name:string, desc:boolean) => {
    workspaceGroupListApiQueryHelper.setSort(name, desc);
};
</script>

<template>
    <section class="workspace-group-table">
        <p-toolbox-table
            search-type="query"
            :style="{height: `${props.tableHeight}px`}"
            selectable
            sortable
            searchable
            :fields="tableState.fields"
            :items="tableState.items"
            :loading="workspaceGroupPageState.loading"
            :select-index="workspaceGroupPageState.selectedIndices"
            :key-item-sets="WORKSPACE_GROUP_SEARCH_HANDLERS.keyItemSets"
            :value-handler-map="tableState.valueHandlerMap"
            sort-by="name"
            :sort-desc="true"
            :query-tags="queryTags"
            :multi-select="false"
            @select="handleUpdateSelectIndices"
            @change="handleChange"
            @refresh="handleChange()"
            @changeSort="handleChangeSort"
        >
            <template v-if="props.hasReadWriteAccess"
                      #toolbox-left
            >
                <workspace-group-table-toolbox />
            </template>
            <template #col-created_at-format="{ value }">
                {{ iso8601Formatter(value, 'UTC') }}
            </template>
        </p-toolbox-table>
    </section>
</template>

<style lang="postcss" scoped>
.workspace-group-table {
    border: none;

    .th-tooltip {
        @apply flex items-center;
        gap: 0.25rem;
        .tooltip-wrapper {
            margin-top: -0.125rem;
        }
    }
}
</style>
