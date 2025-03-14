<script lang="ts" setup>
import {
    onUnmounted, watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router/composables';

import type { CostQuerySetModel } from '@/api-clients/cost-analysis/cost-query-set/schema/model';

import {
    queryStringToArray,
    queryStringToObject,
    queryStringToString,
} from '@/lib/router-query-string';

import CostAnalysisChart from '@/services/cost-explorer/components/CostAnalysisChart.vue';
import CostAnalysisDataTable from '@/services/cost-explorer/components/CostAnalysisDataTable.vue';
import CostAnalysisGroupBy from '@/services/cost-explorer/components/CostAnalysisGroupBy.vue';
import CostAnalysisHeader from '@/services/cost-explorer/components/CostAnalysisHeader.vue';
import CostAnalysisQuerySection from '@/services/cost-explorer/components/CostAnalysisQuerySection.vue';
import { DYNAMIC_COST_QUERY_SET_PARAMS } from '@/services/cost-explorer/constants/managed-cost-analysis-query-sets';
import { useCostAnalysisPageStore } from '@/services/cost-explorer/stores/cost-analysis-page-store';
import type { CostAnalysisPageUrlQuery } from '@/services/cost-explorer/types/cost-analysis-url-query-type';
import type {
    Granularity,
} from '@/services/cost-explorer/types/cost-explorer-query-type';


const route = useRoute();
const router = useRouter();

const costAnalysisPageStore = useCostAnalysisPageStore();
const costAnalysisPageGetters = costAnalysisPageStore.getters;

/* util */
const getQueryOptionsFromUrlQuery = (urlQuery: CostAnalysisPageUrlQuery): CostQuerySetModel['options'] => ({
    granularity: queryStringToString(urlQuery.granularity) as Granularity,
    group_by: queryStringToArray(urlQuery.group_by),
    period: queryStringToObject(urlQuery.period),
    filters: queryStringToObject(urlQuery.filters),
});

onUnmounted(() => {
    costAnalysisPageStore.reset();
});

watch(() => costAnalysisPageGetters.selectedQuerySet, async (selectedQuerySet) => {
    if (selectedQuerySet) {
        costAnalysisPageStore.setQueryOptions(selectedQuerySet.options);
    } else if (route.params.costQuerySetId === DYNAMIC_COST_QUERY_SET_PARAMS) {
        const currentQuery = router.currentRoute.query;
        const costQuerySetOptions = getQueryOptionsFromUrlQuery(currentQuery);
        costAnalysisPageStore.setQueryOptions(costQuerySetOptions);
    } else {
        costAnalysisPageStore.setQueryOptions();
    }
}, { immediate: true });

</script>

<template>
    <div class="cost-analysis-content">
        <cost-analysis-header />
        <div class="content-wrapper">
            <div class="overflow-wrapper">
                <cost-analysis-query-section />
                <div class="contents-wrapper">
                    <cost-analysis-group-by />
                    <cost-analysis-chart />
                    <cost-analysis-data-table />
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="postcss" scoped>
.cost-analysis-content {
    .content-wrapper {
        overflow-x: auto;
        padding-bottom: 1.625rem;
        .overflow-wrapper {
            min-width: 50rem;
            .contents-wrapper {
                @apply bg-white rounded-md border border-gray-200;
                padding: 0 1rem 2.5rem 1rem;
            }
        }
    }
}
</style>
