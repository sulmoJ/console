<script lang="ts" setup>
import {
    computed, reactive, watch,
} from 'vue';

import type { XYChart } from '@amcharts/amcharts5/xy';
import dayjs from 'dayjs';
import { cloneDeep, debounce, isEmpty } from 'lodash';

import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import { getCancellableFetcher } from '@cloudforet/core-lib/space-connector/cancellable-fetcher';
import { ApiQueryHelper } from '@cloudforet/core-lib/space-connector/helper';
import {
    PButton, PSelectButton,
    PSelectDropdown, PToggleButton, PFieldTitle,
} from '@cloudforet/mirinae';
import type { SelectDropdownMenuItem } from '@cloudforet/mirinae/types/controls/dropdown/select-dropdown/type';

import type { AnalyzeResponse } from '@/api-clients/_common/schema/api-verbs/analyze';

import ErrorHandler from '@/common/composables/error/errorHandler';

import CostAnalysisStackedColumnChart
    from '@/services/cost-explorer/components/CostAnalysisStackedColumnChart.vue';
import {
    GRANULARITY, GROUP_BY_ITEM_MAP,
} from '@/services/cost-explorer/constants/cost-explorer-constant';
import { useCostAnalysisPageStore } from '@/services/cost-explorer/stores/cost-analysis-page-store';
import type { CostAnalyzeRawData } from '@/services/cost-explorer/types/cost-analyze-type';
import type { CostXYChartData } from '@/services/cost-explorer/types/cost-explorer-chart-type';
import type {
    Period,
} from '@/services/cost-explorer/types/cost-explorer-query-type';


const costAnalysisPageStore = useCostAnalysisPageStore();
const costAnalysisPageGetters = costAnalysisPageStore.getters;
const costAnalysisPageState = costAnalysisPageStore.state;

const state = reactive({
    loading: true,
    legend: {} as Record<string, boolean>,
    data: {} as AnalyzeResponse<CostAnalyzeRawData>,
    chartData: [] as CostXYChartData[],
    chart: null as XYChart | null,
    groupByMenuItems: computed<SelectDropdownMenuItem[]>(() => costAnalysisPageState.groupBy.map((d) => {
        if (GROUP_BY_ITEM_MAP[d]) return GROUP_BY_ITEM_MAP[d];
        return {
            name: d, // tags.Name
            label: d.split('.')[1], // Name
        };
    })),
    showHideAll: computed(() => Object.values(state.legend).some((d) => d)),
    showAccumulatedToggle: computed(() => costAnalysisPageState.granularity === GRANULARITY.DAILY),
    isAccumulated: false,
    analyzeFetcher: computed(() => (costAnalysisPageGetters.isUnifiedCost ? unifiedCostAnalyze : fetchCostAnalyze)),
});

/* Util */
const getValueSumKey = (dataType:string) => {
    switch (dataType) {
    case 'cost':
        return costAnalysisPageGetters.isUnifiedCost ? `cost.${costAnalysisPageGetters.currency}` : 'cost';
    case 'usage':
        return 'usage_quantity';
    default:
        return `data.${dataType}`;
    }
};

/* Api */
const fetchCostAnalyze = getCancellableFetcher<object, AnalyzeResponse<CostAnalyzeRawData>>(SpaceConnector.clientV2.costAnalysis.cost.analyze);
const unifiedCostAnalyze = getCancellableFetcher<object, AnalyzeResponse<CostAnalyzeRawData>>(SpaceConnector.clientV2.costAnalysis.unifiedCost.analyze);
const analyzeApiQueryHelper = new ApiQueryHelper();
const listCostAnalysisData = async (period:Period): Promise<AnalyzeResponse<CostAnalyzeRawData>|undefined> => {
    try {
        analyzeApiQueryHelper.setFilters(costAnalysisPageGetters.consoleFilters);
        let dateFormat = 'YYYY-MM';
        if (costAnalysisPageState.granularity === GRANULARITY.YEARLY) dateFormat = 'YYYY';
        const { status, response } = await state.analyzeFetcher({
            data_source_id: costAnalysisPageGetters.isUnifiedCost ? undefined : costAnalysisPageGetters.selectedDataSourceId,
            query: {
                granularity: costAnalysisPageState.granularity,
                group_by: costAnalysisPageState.chartGroupBy ? [costAnalysisPageState.chartGroupBy] : [],
                start: dayjs.utc(period.start).format(dateFormat),
                end: dayjs.utc(period.end).format(dateFormat),
                fields: {
                    value_sum: {
                        key: getValueSumKey(costAnalysisPageState.displayDataType),
                        operator: 'sum',
                    },
                },
                sort: [{ key: '_total_value_sum', desc: true }],
                field_group: ['date'],
                ...analyzeApiQueryHelper.data,
            },
        });
        if (status === 'succeed') return response;
        return undefined;
    } catch (e) {
        ErrorHandler.handleError(e);
        return { more: false, results: [] };
    }
};
const setChartData = debounce(async (period:Period) => {
    state.loading = true;
    const res = await listCostAnalysisData(period);
    if (res) {
        state.data = res;
        state.loading = false;
    }
}, 0);

/* Event */
const handleChartGroupByItem = (groupBy?: string) => {
    state.legend = {};
    costAnalysisPageStore.setChartGroupBy(groupBy);
};
const handleToggleAllLegends = () => {
    const _legend = cloneDeep(state.legend);
    if (state.showHideAll) {
        Object.keys(_legend).forEach((d) => {
            _legend[d] = false;
        });
    } else {
        Object.keys(_legend).forEach((d) => {
            _legend[d] = true;
        });
    }
    state.legend = _legend;
};
const handleToggleAccumulated = (value: boolean) => {
    state.isAccumulated = value;
};

/* Watcher */
watch([
    () => costAnalysisPageState,
    () => costAnalysisPageGetters.selectedDataSourceId,
    () => costAnalysisPageGetters.selectedQueryId,
    () => costAnalysisPageGetters.isUnifiedCost,
], ([, selectedDataSourceId, , isUnifiedCost]) => {
    if (costAnalysisPageState.period && (selectedDataSourceId || isUnifiedCost)) setChartData(costAnalysisPageState.period);
}, { immediate: true, deep: true });
watch(() => state.groupByMenuItems, (after) => {
    if (!after.length) {
        costAnalysisPageStore.setChartGroupBy(undefined);
    } else if (!after.filter((d) => d.name === costAnalysisPageState.chartGroupBy).length) {
        costAnalysisPageStore.setChartGroupBy(after[0].name);
    }
});
watch([() => costAnalysisPageState.chartGroupBy, () => costAnalysisPageState.granularity], () => {
    state.legend = {};
});
watch(() => costAnalysisPageState.granularity, () => {
    if (state.isAccumulated) state.isAccumulated = false;
});
</script>

<template>
    <div class="cost-analysis-chart">
        <div class="top-part">
            <p-select-dropdown :menu="state.groupByMenuItems"
                               :selected="costAnalysisPageState.chartGroupBy"
                               :disabled="!costAnalysisPageState.groupBy.length"
                               class="group-by-select-dropdown"
                               @select="handleChartGroupByItem"
            />
            <div v-if="state.showAccumulatedToggle"
                 class="accumulated-toggle-wrapper"
            >
                <p-field-title>{{ $t('BILLING.COST_MANAGEMENT.COST_ANALYSIS.ACCUMULATED') }}</p-field-title>
                <p-toggle-button :value="state.isAccumulated"
                                 @update:value="handleToggleAccumulated"
                />
            </div>
            <div class="select-button-wrapper">
                <p-select-button :selected="true"
                                 icon-name="ic_chart-bar"
                                 layout="icon-only"
                                 style-type="gray"
                                 size="sm"
                />
            </div>
        </div>
        <div class="bottom-part">
            <div class="bottom-right-part">
                <p v-if="state.data?.more"
                   class="too-many-text"
                >
                    {{ $t('INVENTORY.METRIC_EXPLORER.SHOWING_TOP_15') }}
                </p>
                <p-button size="sm"
                          style-type="tertiary"
                          :disabled="isEmpty(state.legend)"
                          @click="handleToggleAllLegends"
                >
                    {{ state.showHideAll ? $t('INVENTORY.METRIC_EXPLORER.HIDE_ALL') : $t('INVENTORY.METRIC_EXPLORER.SHOW_ALL') }}
                </p-button>
            </div>
            <cost-analysis-stacked-column-chart :loading="state.loading"
                                                :data="state.data"
                                                :legend.sync="state.legend"
                                                :accumulated="state.isAccumulated"
                                                class="cost-analysis-stacked-column-chart"
            />
        </div>
    </div>
</template>

<style lang="postcss" scoped>
.cost-analysis-chart {
    @apply border border-gray-200 rounded-md;
    grid-gap: 1rem;
    padding: 1rem;
    margin-bottom: 1rem;

    .top-part {
        display: flex;
        text-align: right;
        gap: 1rem;
        .accumulated-toggle-wrapper {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .select-button-wrapper {
            display: flex;
            justify-content: flex-end;
            gap: 0.375rem;
            padding-bottom: 0.5rem;
            flex: 1;
        }
        .group-by-select-dropdown {
            width: 24%;
        }
    }
    .bottom-part {
        display: flex;
        flex-direction: column;
        height: 25rem;
        margin-top: 1rem;
        .cost-analysis-stacked-column-chart {
            flex: 1;
        }
        .bottom-right-part {
            text-align: right;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            padding-bottom: 0.5rem;
        }
        .too-many-text {
            @apply text-gray-400;
            font-size: 0.75rem;
            padding-right: 0.5rem;
        }
    }
}
</style>
