<script setup lang="ts">
import {
    computed,
    defineProps, nextTick, reactive, ref,
} from 'vue';

import dayjs from 'dayjs';
import { cloneDeep } from 'lodash';

import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import { getCancellableFetcher } from '@cloudforet/core-lib/space-connector/cancellable-fetcher';
import { ApiQueryHelper } from '@cloudforet/core-lib/space-connector/helper';
import { PDataLoader, PSkeleton, PProgressBar } from '@cloudforet/mirinae';

import type { DateRange } from '@/api-clients/dashboard/_types/dashboard-type';

import { CURRENCY_SYMBOL } from '@/store/display/constant';
import type { CurrencySymbol } from '@/store/display/type';

import { currencyMoneyFormatter } from '@/lib/helper/currency-helper';

import { useAmcharts5 } from '@/common/composables/amcharts5';
import { useDateRangeFormatter } from '@/common/composables/date-range-formatter';
import ErrorHandler from '@/common/composables/error/errorHandler';

import { indigo, red, gray } from '@/styles/colors';

import WidgetFrame from '@/services/_shared/dashboard/dashboard-detail/legacy/widgets/_components/WidgetFrame.vue';
import { useWidgetLifecycle } from '@/services/_shared/dashboard/dashboard-detail/legacy/widgets/_composables/use-widget-lifecycle';
import { useWidget } from '@/services/_shared/dashboard/dashboard-detail/legacy/widgets/_composables/use-widget/use-widget';
import { getDateAxisSettings } from '@/services/_shared/dashboard/dashboard-detail/legacy/widgets/_helpers/widget-chart-helper';
import type { WidgetExpose, WidgetProps, WidgetEmit } from '@/services/_shared/dashboard/dashboard-detail/legacy/widgets/_types/widget-type';


interface Data {
    date: string;
    spent: number;
    budget: number;
    budget_count: number;
}

interface ChartData {
    date: string;
    spent: number;
    budget: number;
    budget_count: number;
}

const props = defineProps<WidgetProps>();
const emit = defineEmits<WidgetEmit>();

const chartContext = ref<HTMLElement|null>(null);
const chartHelper = useAmcharts5(chartContext);

const { widgetState, widgetFrameProps, widgetFrameEventHandlers } = useWidget(props, emit, {
    dateRange: computed<DateRange>(() => {
        const end = dayjs.utc(widgetState.dashboardOptions?.date_range?.end).format('YYYY-MM');
        const start = dayjs.utc(end).subtract(11, 'month').format('YYYY-MM');
        return { start, end };
    }),
    widgetLocation: undefined,
});
const state = reactive({
    loading: true,
    data: null as null|Data[],
    chartData: computed<ChartData[]>(() => cloneDeep(state.data ?? [])),
    //
    noData: computed<boolean>(() => !state.data?.length),
    recentSpentData: computed<number>(() => {
        if (!state.data?.length) return 0;
        const recent = state.data[state.data.length - 1];
        if (recent.date === widgetState.dateRange.end) return recent.spent;
        return 0;
    }),
    recentBudgetData: computed<number>(() => {
        if (!state.data?.length) return 0;
        const recent = state.data[state.data.length - 1];
        if (recent.date === widgetState.dateRange.end) return recent.budget;
        return 0;
    }),
});

const displayState = reactive({
    recentSpent: computed<number>(() => {
        if (!state.recentSpentData) return 0;
        return state.recentSpentData;
    }),
    recentBudget: computed<number>(() => {
        if (!state.recentBudgetData) return 0;
        return state.recentBudgetData;
    }),
    recentBudgetLeft: computed<number>(() => {
        if (!state.recentSpentData || !state.recentBudgetData) return 0;
        return Math.abs(state.recentBudgetData - state.recentSpentData);
    }),
    isSpentOverBudget: computed<boolean>(() => {
        if (!state.recentSpentData || !state.recentBudgetData) return false;
        return state.recentSpentData > state.recentBudgetData;
    }),
    recentSpentRate: computed<number>(() => {
        if (!state.recentSpentData || !state.recentBudgetData) return 0;
        return (state.recentSpentData / state.recentBudgetData) * 100;
    }),
    budgetCount: computed<number>(() => {
        if (!state.data?.length) return 0;
        return state.data[state.data.length - 1].budget_count ?? 0;
    }),
    currencySymbol: computed<CurrencySymbol>(() => (widgetState.currency ? CURRENCY_SYMBOL[widgetState.currency] : CURRENCY_SYMBOL.USD)),
});

const [recentSpentPeriod] = useDateRangeFormatter({
    end: computed(() => widgetState.dateRange.end),
    showTildeIfEndThisMonth: true,
});

/* Api */
const apiQueryHelper = new ApiQueryHelper();
const fetchBudgetUsageAnalyze = getCancellableFetcher<object, {results: Data[]}>(SpaceConnector.clientV2.costAnalysis.budgetUsage.analyze);
const fetchData = async (): Promise<Data[]> => {
    try {
        apiQueryHelper.setFilters(widgetState.consoleFilters);
        const { status, response } = await fetchBudgetUsageAnalyze({
            data_source_id: widgetState.options.cost_data_source,
            query: {
                granularity: widgetState.granularity,
                start: widgetState.dateRange.start,
                end: widgetState.dateRange.end,
                fields: {
                    spent: {
                        key: 'cost',
                        operator: 'sum',
                    },
                    budget: {
                        key: 'limit',
                        operator: 'sum',
                    },
                    budget_count: {
                        operator: 'count',
                    },
                },
                sort: [{ key: 'date', desc: false }],
                ...apiQueryHelper.data,
            },
        });
        if (status === 'succeed') {
            return response.results;
        }
        return state.data;
    } catch (e) {
        ErrorHandler.handleError(e);
        return [];
    }
};

const dataColor = (data: ChartData) => {
    if (data.spent > data.budget) return chartHelper.color(red[400]);
    return chartHelper.color(indigo[400]);
};
const drawChart = (chartData: ChartData[]) => {
    // create chart
    const { chart, xAxis, yAxis } = chartHelper.createXYDateChart({}, getDateAxisSettings(widgetState.dateRange));

    // set chart padding
    chart.setAll({
        paddingTop: 0,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: -10,
    });

    // set axis
    xAxis.get('baseInterval').timeUnit = 'month';
    const yRendered = yAxis.get('renderer');
    yRendered.grid.template.setAll({ strokeOpacity: 0 });
    yRendered.labels.template.setAll({ visible: false });

    // create column series, line series
    const columnSeries = chartHelper.createXYColumnSeries(chart, {
        valueYField: 'spent',
    });
    const lineSeries = chartHelper.createXYLineSeries(chart, {
        valueYField: 'budget',
        stroke: chartHelper.color(gray[300]),
        maskBullets: false,
    });

    // set series to chart. do not move this to the bottom of this function.
    chart.series.push(columnSeries);
    chart.series.push(lineSeries);

    // set series default settings
    columnSeries.columns.template.setAll({
        strokeOpacity: 0,
        width: chartHelper.percent(35),
    });
    lineSeries.strokes.template.setAll({
        strokeWidth: 0.5,
        strokeDasharray: [10, 5],
    });

    // disable line series bullets
    lineSeries.bullets.setAll([]);

    // set columns color
    columnSeries.columns.template.adapters.add('fill', (fill, target) => {
        const data = target.dataItem?.dataContext as ChartData;
        if (!data) return chartHelper.color(indigo[400]);
        return dataColor(data);
    });

    // set tooltip to column series
    const tooltip = chartHelper.createTooltip();
    chartHelper.setXYSingleTooltipText(chart, tooltip, widgetState.currency);
    tooltip.label.adapters.add('text', (_, target) => {
        const data = target.dataItem?.dataContext as ChartData;
        if (!data) return '';
        const spent = currencyMoneyFormatter(data.spent, { currency: widgetState.currency });
        const budget = currencyMoneyFormatter(data.budget, { currency: widgetState.currency });
        let text = `[${dataColor(data)};fontSize: 10px]●[/] {valueX}\n`;
        text += `spent: [bold]${spent}[/]\n`;
        text += `budget: [bold]${budget}[/]`;
        return text;
    });
    columnSeries.set('tooltip', tooltip);

    // set series data processor for date
    columnSeries.data.processor = chartHelper.createDataProcessor({
        dateFormat: 'YYYY-MM',
    });
    lineSeries.data.processor = chartHelper.createDataProcessor({
        dateFormat: 'YYYY-MM',
    });

    // set data to series
    columnSeries.data.setAll(chartData);
    lineSeries.data.setAll(chartData);
};

const initWidget = async (data?: Data[]): Promise<Data[]> => {
    state.loading = true;
    state.data = data ?? await fetchData();
    await nextTick();
    if (chartHelper.root.value) drawChart(state.chartData);
    state.loading = false;
    return state.data;
};

const refreshWidget = async (): Promise<Data[]> => {
    await nextTick();
    state.loading = true;
    state.data = await fetchData();
    chartHelper.refreshRoot();
    await nextTick();
    if (chartHelper.root.value) drawChart(state.chartData);
    state.loading = false;
    return state.data;
};

useWidgetLifecycle({
    disposeWidget: chartHelper.disposeRoot,
    initWidget,
    refreshWidget,
    props,
    emit,
    widgetState,
});

defineExpose<WidgetExpose<Data[]>>({
    initWidget,
    refreshWidget,
});

</script>

<template>
    <widget-frame v-bind="widgetFrameProps"
                  no-height-limit
                  v-on="widgetFrameEventHandlers"
    >
        <div class="budget-usage-summary">
            <div class="recent-budget-spent">
                <p-data-loader class="data-loader"
                               :loading="props.loading || state.loading"
                               :data="!state.noData"
                               :loader-backdrop-opacity="1"
                               disable-empty-case
                               loader-type="skeleton"
                >
                    <div class="row-wrapper">
                        <span class="spent-rate">{{ displayState.recentSpentRate === undefined ? '--' : displayState.recentSpentRate.toFixed(2) }}%</span>
                        <span class="budget-count">{{ $t('DASHBOARDS.WIDGET.BUDGET_USAGE_SUMMARY.BUDGETED', { count: displayState.budgetCount }) }}</span>
                    </div>
                    <div class="row-wrapper">
                        <p-progress-bar :percentage="displayState.recentSpentRate"
                                        :color="displayState.isSpentOverBudget ? red[400] : indigo[300]"
                                        size="lg"
                                        height="1.5rem"
                        />
                    </div>
                    <div class="row-wrapper">
                        <span class="spent-cost">
                            <span class="currency-symbol">{{ displayState.currencySymbol }}</span>
                            {{ currencyMoneyFormatter(displayState.recentSpent, { style: 'decimal' }) }}
                        </span>
                        <i18n path="DASHBOARDS.WIDGET.BUDGET_USAGE_SUMMARY.OUT_OF"
                              class="recent-budget"
                        >
                            <template #value>
                                <span class="currency-symbol">{{ displayState.currencySymbol }}</span>
                                <span class="value">{{ currencyMoneyFormatter(displayState.recentBudget, { style: 'decimal' }) }}</span>
                            </template>
                        </i18n>
                    </div>
                    <div class="row-wrapper">
                        <i18n path="DASHBOARDS.WIDGET.BUDGET_USAGE_SUMMARY.BUDGET_USAGE_IN"
                              class="period"
                        >
                            <template #period>
                                <strong>{{ recentSpentPeriod }}</strong>
                            </template>
                        </i18n>
                        <span class="budget-left">
                            ({{ displayState.isSpentOverBudget ?
                                $t('DASHBOARDS.WIDGET.BUDGET_USAGE_SUMMARY.EXCEED', { value: currencyMoneyFormatter(displayState.recentBudgetLeft, { currency: widgetState.currency }) }) :
                                $t('DASHBOARDS.WIDGET.BUDGET_USAGE_SUMMARY.LEFT', { value: currencyMoneyFormatter(displayState.recentBudgetLeft, { currency: widgetState.currency }) })
                            }})
                        </span>
                    </div>
                    <template #loader>
                        <div class="skeleton-wrapper">
                            <p-skeleton class="skeleton"
                                        width="10rem"
                                        height="1.875rem"
                            />
                        </div>
                    </template>
                </p-data-loader>
            </div>
            <div class="chart-wrapper">
                <p-data-loader class="data-loader"
                               :loading="props.loading || state.loading"
                               :data="!state.noData"
                               :loader-backdrop-opacity="1"
                               loader-type="skeleton"
                >
                    <div ref="chartContext"
                         class="chart"
                    />
                </p-data-loader>
            </div>
        </div>
    </widget-frame>
</template>

<style lang="postcss" scoped>
.budget-usage-summary {
    display: flex;
    flex-direction: column;
    height: 100%;
}
.recent-budget-spent {
    min-height: 7.5rem;
    .row-wrapper {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.5rem;
    }
    .spent-rate {
        @apply text-display-lg font-bold;
    }
    .budget-count {
        @apply text-label-lg font-normal;
    }
    .spent-cost {
        @apply text-display-md font-medium;
        .currency-symbol {
            @apply text-display-sm font-normal text-gray-600;
        }
    }
    .recent-budget {
        @apply text-label-lg font-normal text-gray-600;
        .currency-symbol {
            @apply text-label-xl font-normal text-gray-900;
        }
        .value {
            @apply text-display-md font-medium text-gray-900;
        }
    }
    .period {
        @apply text-label-lg font-normal text-gray-600;
    }
    .budget-left {
        @apply text-label-lg font-medium text-gray-600;
    }
}
.chart-wrapper {
    flex-grow: 1;
    margin-top: 1.5rem;
    margin-bottom: 1.5rem;
    width: 100%;
    .chart {
        height: 100%;
    }
}
.data-loader {
    display: flex;
    width: 100%;
    height: 100%;
    .skeleton-wrapper {
        width: 100%;
        height: 100%;
        .skeleton {
            display: block;
            margin-top: 0.25rem;
        }
    }
}
</style>
