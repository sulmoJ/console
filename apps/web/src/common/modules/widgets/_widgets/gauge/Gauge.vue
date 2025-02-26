<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core/index';
import {
    computed, defineExpose, reactive, ref, watch,
} from 'vue';

import { useQuery } from '@tanstack/vue-query';
import type { GaugeSeriesOption } from 'echarts/charts';
import type {
    EChartsType,
} from 'echarts/core';
import { init } from 'echarts/core';
import { isEmpty, orderBy, throttle } from 'lodash';

import { SpaceConnector } from '@cloudforet/core-lib/space-connector';

import type { PrivateDataTableModel } from '@/schema/dashboard/private-data-table/model';
import type { PrivateWidgetLoadParameters } from '@/schema/dashboard/private-widget/api-verbs/load';
import type { PublicDataTableModel } from '@/schema/dashboard/public-data-table/model';
import type { PublicWidgetLoadParameters } from '@/schema/dashboard/public-widget/api-verbs/load';
import { i18n } from '@/translations';

import WidgetFrame from '@/common/modules/widgets/_components/WidgetFrame.vue';
import { useWidgetDateRange } from '@/common/modules/widgets/_composables/use-widget-date-range';
import { useWidgetFrame } from '@/common/modules/widgets/_composables/use-widget-frame';
import { useWidgetInitAndRefresh } from '@/common/modules/widgets/_composables/use-widget-init-and-refresh';
import { WIDGET_LOAD_STALE_TIME } from '@/common/modules/widgets/_constants/widget-constant';
import {
    normalizeAndSerializeVars,
} from '@/common/modules/widgets/_helpers/global-variable-helper';
import {
    normalizeAndSerializeDataTableOptions,
} from '@/common/modules/widgets/_helpers/widget-data-table-helper';
import { getFormattedNumber, getWidgetDataTable } from '@/common/modules/widgets/_helpers/widget-helper';
import type { DataFieldValue } from '@/common/modules/widgets/_widget-fields/data-field/type';
import type { DateRangeValue } from '@/common/modules/widgets/_widget-fields/date-range/type';
import type { FormatRulesValue, ThresholdValue } from '@/common/modules/widgets/_widget-fields/format-rules/type';
import type { GranularityValue } from '@/common/modules/widgets/_widget-fields/granularity/type';
import type { MaxValue } from '@/common/modules/widgets/_widget-fields/max/type';
import type { MinValue } from '@/common/modules/widgets/_widget-fields/min/type';
import type { NumberFormatValue } from '@/common/modules/widgets/_widget-fields/number-format/type';
import type { WidgetLoadResponse } from '@/common/modules/widgets/types/widget-data-type';
import type {
    WidgetProps, WidgetEmit,
    WidgetExpose,
} from '@/common/modules/widgets/types/widget-display-type';

import { gray } from '@/styles/colors';

const props = defineProps<WidgetProps>();
const emit = defineEmits<WidgetEmit>();

const chartContext = ref<HTMLElement|null>(null);
const { dateRange } = useWidgetDateRange({
    dateRangeFieldValue: computed(() => (props.widgetOptions?.dateRange?.value as DateRangeValue)),
    baseOnDate: computed(() => props.dashboardOptions?.date_range?.end),
    granularity: computed<GranularityValue>(() => props.widgetOptions?.granularity?.value as GranularityValue),
});
const state = reactive({
    runQueries: false,
    isPrivateWidget: computed<boolean>(() => props.widgetId.startsWith('private')),
    dataTable: undefined as PublicDataTableModel|PrivateDataTableModel|undefined,

    unit: computed<string|undefined>(() => {
        if (!widgetOptionsState.dataFieldInfo?.data) return undefined;
        return widgetFrameProps.value.unitMap?.[widgetOptionsState.dataFieldInfo.data as string];
    }),
    data: computed<WidgetLoadResponse | null>(() => queryResult?.data?.value || null),
    chart: null as EChartsType | null,
    chartData: undefined as undefined|number,
    chartOptions: computed<{series: GaugeSeriesOption[]}>(() => ({
        series: [
            {
                type: 'gauge',
                center: ['50%', '60%'],
                startAngle: 200,
                endAngle: -20,
                min: widgetOptionsState.minInfo?.min,
                max: widgetOptionsState.maxInfo?.max,
                splitNumber: 4,
                itemStyle: {
                    color: state.gaugeColor,
                },
                progress: {
                    show: true,
                    width: 30,
                },
                axisLine: {
                    lineStyle: {
                        width: 30,
                        color: [
                            [1, gray[200]],
                        ],
                    },
                },
                axisLabel: {
                    distance: -55,
                    color: gray[700],
                    fontSize: 12,
                    formatter: (val) => getFormattedNumber(val, widgetOptionsState.numberFormatInfo?.[widgetOptionsState.dataFieldInfo?.data as string], state.unit),
                },
                detail: {
                    offsetCenter: [0, 0],
                    fontSize: 32,
                    formatter: (val) => getFormattedNumber(val, widgetOptionsState.numberFormatInfo?.[widgetOptionsState.dataFieldInfo?.data as string], state.unit),
                    color: gray[700],
                },
                data: [
                    {
                        value: state.chartData,
                    },
                ],
                axisTick: { show: false },
                splitLine: { show: false },
                pointer: { show: false },
                anchor: { show: false },
            },
        ],
    })),
    gaugeColor: computed<string>(() => {
        let _formatRules: ThresholdValue[] = widgetOptionsState.formatRulesInfo?.rules || [];
        let _color = widgetOptionsState.formatRulesInfo?.baseColor || gray[200];
        const _percentage = (state.chartData / (widgetOptionsState.maxInfo?.max || 100)) * 100;
        _formatRules = orderBy(_formatRules, ['number'], ['asc']);
        _formatRules?.forEach((d) => {
            if (_percentage >= (d.number || 0)) {
                _color = d.color;
            }
        });
        return _color;
    }),
});

const widgetOptionsState = reactive({
    granularityInfo: computed<GranularityValue>(() => props.widgetOptions?.granularity?.value as GranularityValue),
    dataFieldInfo: computed<DataFieldValue>(() => props.widgetOptions?.dataField?.value as DataFieldValue),
    minInfo: computed<MinValue>(() => props.widgetOptions?.min?.value as MinValue),
    maxInfo: computed<MaxValue>(() => props.widgetOptions?.max?.value as MaxValue),
    formatRulesInfo: computed<FormatRulesValue>(() => props.widgetOptions?.formatRules?.value as FormatRulesValue),
    numberFormatInfo: computed<NumberFormatValue>(() => props.widgetOptions?.numberFormat?.value as NumberFormatValue),
});


/* Api */
const fetchWidgetData = async (params: PrivateWidgetLoadParameters|PublicWidgetLoadParameters): Promise<WidgetLoadResponse> => {
    const defaultFetcher = state.isPrivateWidget
        ? SpaceConnector.clientV2.dashboard.privateWidget.load<PrivateWidgetLoadParameters, WidgetLoadResponse>
        : SpaceConnector.clientV2.dashboard.publicWidget.load<PublicWidgetLoadParameters, WidgetLoadResponse>;
    const res = await defaultFetcher(params);
    return res;
};

const queryKey = computed(() => [
    'widget-load-gauge',
    props.widgetId,
    {
        start: dateRange.value.start,
        end: dateRange.value.end,
        granularity: widgetOptionsState.granularityInfo?.granularity,
        dataTableId: state.dataTable?.data_table_id,
        dataTableOptions: normalizeAndSerializeDataTableOptions(state.dataTable?.options || {}),
        dataTables: normalizeAndSerializeDataTableOptions((props.dataTables || []).map((d) => d?.options || {})),
        vars: normalizeAndSerializeVars(props.dashboardVars),
    },
]);

const queryResult = useQuery({
    queryKey,
    queryFn: () => fetchWidgetData({
        widget_id: props.widgetId,
        granularity: widgetOptionsState.granularityInfo?.granularity,
        start: dateRange.value.start,
        end: dateRange.value.end,
        vars: props.dashboardVars,
    }),
    enabled: computed(() => props.widgetState !== 'INACTIVE' && !!state.dataTable && state.runQueries),
    staleTime: WIDGET_LOAD_STALE_TIME,
});

const widgetLoading = computed<boolean>(() => queryResult.isFetching.value || queryResult.isPending.value);
const errorMessage = computed<string|undefined>(() => {
    if (!state.dataTable) return i18n.t('COMMON.WIDGETS.NO_DATA_TABLE_ERROR_MESSAGE');
    return queryResult.error?.value?.message;
});

/* Util */
const drawChart = (rawData: WidgetLoadResponse|null) => {
    if (isEmpty(rawData)) return;
    state.chartData = rawData?.results?.[0]?.[widgetOptionsState.dataFieldInfo?.data as string] || 0;
};
const loadWidget = (forceLoad?: boolean) => {
    state.runQueries = true;
    if (forceLoad) queryResult.refetch();
};


const { widgetFrameProps, widgetFrameEventHandlers } = useWidgetFrame(props, emit, {
    dateRange,
    errorMessage,
    widgetLoading,
});

/* Watcher */
watch([() => state.chartData, () => chartContext.value, () => props.widgetOptions], ([, chartCtx]) => {
    if (chartCtx) {
        state.chart = init(chartContext.value);
        state.chart.setOption(state.chartOptions, true);
    }
});
watch([() => state.data, () => props.widgetOptions], ([newData]) => {
    drawChart(newData);
});

useWidgetInitAndRefresh({ props, emit, loadWidget });
watch(() => props.dataTableId, async (newDataTableId) => {
    if (!newDataTableId) return;
    state.dataTable = await getWidgetDataTable(newDataTableId);
}, { immediate: true });
defineExpose<WidgetExpose>({
    loadWidget,
});
useResizeObserver(chartContext, throttle(() => {
    state.chart?.resize();
}, 500));
</script>

<template>
    <widget-frame v-bind="widgetFrameProps"
                  v-on="widgetFrameEventHandlers"
    >
        <!--Do not delete div element below. It's defense code for redraw-->
        <div class="h-full">
            <div ref="chartContext"
                 class="h-full"
            />
        </div>
    </widget-frame>
</template>
