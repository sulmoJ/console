<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core/index';
import {
    computed, defineExpose, onMounted, reactive, ref, watch,
} from 'vue';

import { useQuery } from '@tanstack/vue-query';
import dayjs from 'dayjs';
import type { TreemapSeriesOption } from 'echarts/charts';
import { init } from 'echarts/core';
import type {
    EChartsType,
} from 'echarts/core';
import {
    isEmpty, orderBy, throttle,
} from 'lodash';

import { numberFormatter } from '@cloudforet/utils';

import type { WidgetLoadParams, WidgetLoadResponse } from '@/api-clients/dashboard/_types/widget-type';
import { i18n } from '@/translations';

import ErrorHandler from '@/common/composables/error/errorHandler';
import WidgetFrame from '@/common/modules/widgets/_components/WidgetFrame.vue';
import { useWidgetDateRange } from '@/common/modules/widgets/_composables/use-widget-date-range';
import { useWidgetFormQuery } from '@/common/modules/widgets/_composables/use-widget-form-query';
import { useWidgetFrame } from '@/common/modules/widgets/_composables/use-widget-frame';
import { DATE_FIELD, WIDGET_LOAD_STALE_TIME } from '@/common/modules/widgets/_constants/widget-constant';
import { DATE_FORMAT } from '@/common/modules/widgets/_constants/widget-field-constant';
import {
    normalizeAndSerializeVars,
} from '@/common/modules/widgets/_helpers/global-variable-helper';
import {
    getReferenceLabel,
} from '@/common/modules/widgets/_helpers/widget-date-helper';
import { isDateField } from '@/common/modules/widgets/_helpers/widget-field-helper';
import { getFormattedNumber } from '@/common/modules/widgets/_helpers/widget-helper';
import { getWidgetLoadApiQueryDateRange } from '@/common/modules/widgets/_helpers/widget-load-helper';
import type { CategoryByValue } from '@/common/modules/widgets/_widget-fields/category-by/type';
import type { DataFieldValue } from '@/common/modules/widgets/_widget-fields/data-field/type';
import type { DateFormatValue } from '@/common/modules/widgets/_widget-fields/date-format/type';
import type { DateRangeValue } from '@/common/modules/widgets/_widget-fields/date-range/type';
import type { DisplaySeriesLabelValue } from '@/common/modules/widgets/_widget-fields/display-series-label/type';
import type { GranularityValue } from '@/common/modules/widgets/_widget-fields/granularity/type';
import type { NumberFormatValue } from '@/common/modules/widgets/_widget-fields/number-format/type';
import type { TooltipNumberFormatValue } from '@/common/modules/widgets/_widget-fields/tooltip-number-format/type';
import type { DataTableModel } from '@/common/modules/widgets/types/widget-data-table-type';
import type {
    WidgetProps, WidgetEmit, WidgetExpose,
} from '@/common/modules/widgets/types/widget-display-type';

import { MASSIVE_CHART_COLORS } from '@/styles/colorsets';




interface ChartData {
    name: string;
    value: number;
}
const props = defineProps<WidgetProps>();
const emit = defineEmits<WidgetEmit>();

const { keys, api } = useWidgetFormQuery({
    widgetId: computed(() => props.widgetId),
    preventLoad: true,
});

const { dateRange } = useWidgetDateRange({
    dateRangeFieldValue: computed(() => (props.widgetOptions?.dateRange?.value as DateRangeValue)),
    baseOnDate: computed(() => props.dashboardOptions?.date_range?.end),
    granularity: computed<GranularityValue>(() => props.widgetOptions?.granularity?.value as GranularityValue),
});
const chartContext = ref<HTMLElement|null>(null);
const state = reactive({
    isPrivateWidget: computed<boolean>(() => props.widgetId.startsWith('private')),
    dataTable: undefined as DataTableModel|undefined,

    data: computed<WidgetLoadResponse | null>(() => queryResult?.data?.value || null),
    chart: null as EChartsType | null,
    chartData: [] as ChartData[],
    unit: computed<string|undefined>(() => widgetFrameProps.value.unitMap?.[widgetOptionsState.dataFieldInfo?.data as string]),
    chartOptions: computed<TreemapSeriesOption>(() => ({
        color: MASSIVE_CHART_COLORS,
        tooltip: {
            trigger: 'item',
            position: 'inside',
            formatter: (params) => {
                let _name = getReferenceLabel(props.allReferenceTypeInfo, widgetOptionsState.categoryByInfo?.data, params.name);
                if (state.unit) _name = `${_name} (${state.unit})`;
                let _value = numberFormatter(params.value) || '';
                if (widgetOptionsState.tooltipNumberFormatInfo?.toggleValue) {
                    _value = getFormattedNumber(params.value, widgetOptionsState.numberFormatInfo?.[widgetOptionsState.dataFieldInfo?.data as string], state.unit);
                }
                return `${params.marker} ${_name}: <b>${_value}</b>`;
            },
        },
        legend: {
            show: false,
        },
        series: [
            {
                type: 'treemap',
                roam: false,
                nodeClick: false,
                breadcrumb: {
                    show: false,
                },
                label: {
                    show: true,
                    position: widgetOptionsState.displaySeriesLabelInfo?.position,
                    rotate: widgetOptionsState.displaySeriesLabelInfo?.rotate,
                    fontSize: 10,
                    formatter: (p) => {
                        if (widgetOptionsState.displaySeriesLabelInfo?.toggleValue) {
                            return `${p.name}\n\n${getFormattedNumber(p.value, widgetOptionsState.numberFormatInfo?.[widgetOptionsState.dataFieldInfo?.data as string], state.unit)}`;
                        }
                        return p.name;
                    },
                },
                data: state.chartData,
            },
        ],
    })),
    dateFormat: computed<string|undefined>(() => {
        const _dateFormat = (props.widgetOptions?.dateFormat?.value as DateFormatValue)?.format || 'MMM DD, YYYY';
        return DATE_FORMAT?.[_dateFormat]?.[widgetOptionsState.granularityInfo?.granularity];
    }),
    dataTableLoading: false,
});

const widgetOptionsState = reactive({
    granularityInfo: computed<GranularityValue>(() => props.widgetOptions?.granularity?.value as GranularityValue),
    dataFieldInfo: computed<DataFieldValue>(() => props.widgetOptions?.dataField?.value as DataFieldValue),
    categoryByInfo: computed<CategoryByValue>(() => props.widgetOptions?.categoryBy?.value as CategoryByValue),
    dateFormatInfo: computed<DateFormatValue>(() => props.widgetOptions?.dateFormat?.value as DateFormatValue),
    numberFormatInfo: computed<NumberFormatValue>(() => props.widgetOptions?.numberFormat?.value as NumberFormatValue),
    tooltipNumberFormatInfo: computed<TooltipNumberFormatValue>(() => props.widgetOptions?.tooltipNumberFormat?.value as TooltipNumberFormatValue),
    displaySeriesLabelInfo: computed<DisplaySeriesLabelValue>(() => props.widgetOptions?.displaySeriesLabel?.value as DisplaySeriesLabelValue),
});

/* Api */
const fetchWidgetData = async (params: WidgetLoadParams): Promise<WidgetLoadResponse> => {
    const defaultFetcher = state.isPrivateWidget
        ? api.privateWidgetAPI.load
        : api.publicWidgetAPI.load;
    const res = await defaultFetcher(params);
    return res;
};

const queryKey = computed(() => [
    ...(state.isPrivateWidget ? keys.privateWidgetLoadQueryKey.value : keys.publicWidgetLoadQueryKey.value),
    props.dashboardId,
    props.widgetId,
    props.widgetName,
    {
        start: dateRange.value.start,
        end: dateRange.value.end,
        granularity: widgetOptionsState.granularityInfo?.granularity,
        dataTableId: props.dataTableId,
        // dataTableOptions: normalizeAndSerializeDataTableOptions(state.dataTable?.options || {}),
        // dataTables: normalizeAndSerializeDataTableOptions((props.dataTables || []).map((d) => d?.options || {})),
        groupBy: widgetOptionsState.categoryByInfo?.data,
        count: widgetOptionsState.categoryByInfo?.count,
        vars: normalizeAndSerializeVars(props.dashboardVars),
    },
]);

const queryResult = useQuery({
    queryKey,
    queryFn: () => fetchWidgetData({
        widget_id: props.widgetId,
        granularity: widgetOptionsState.granularityInfo?.granularity,
        group_by: widgetOptionsState.categoryByInfo?.data ? [widgetOptionsState.categoryByInfo?.data as string] : [],
        sort: widgetOptionsState.dataFieldInfo?.data ? [{ key: widgetOptionsState.dataFieldInfo?.data as string, desc: true }] : undefined,
        page: { start: 0, limit: widgetOptionsState.categoryByInfo?.count ?? 0 },
        vars: props.dashboardVars,
        ...getWidgetLoadApiQueryDateRange(widgetOptionsState.granularityInfo?.granularity, dateRange.value),
    }),
    enabled: computed(() => props.widgetState !== 'INACTIVE' && !!state.dataTable),
    staleTime: WIDGET_LOAD_STALE_TIME,
});

const widgetLoading = computed<boolean>(() => queryResult.isFetching.value || state.dataTableLoading);
const errorMessage = computed<string>(() => {
    if (!state.dataTable) return i18n.t('COMMON.WIDGETS.NO_DATA_TABLE_ERROR_MESSAGE');
    return queryResult.error?.value?.message;
});

const drawChart = (rawData: WidgetLoadResponse|null) => {
    if (isEmpty(rawData)) return;

    let _refinedData: ChartData[] = rawData?.results?.map((d) => ({
        name: d[widgetOptionsState.categoryByInfo?.data as string],
        value: d[widgetOptionsState.dataFieldInfo?.data as string],
    })) || [];
    if (isDateField(widgetOptionsState.categoryByInfo?.data)) {
        _refinedData = orderBy(_refinedData, 'name', 'desc');
        _refinedData = _refinedData?.slice(0, widgetOptionsState.categoryByInfo?.count);
    } else {
        _refinedData = orderBy(_refinedData, 'value', 'desc');
        const _slicedData = _refinedData.slice(0, widgetOptionsState.categoryByInfo?.count);
        const _etcValue = _refinedData.slice(widgetOptionsState.categoryByInfo?.count).reduce((acc, v) => acc + v.value, 0);
        const _etcData: ChartData = {
            name: 'etc',
            value: _etcValue,
        };
        _refinedData = !_etcValue ? _slicedData : [..._slicedData, _etcData];
    }

    // get chart data
    state.chartData = _refinedData?.map((v) => {
        let _name = getReferenceLabel(props.allReferenceTypeInfo, widgetOptionsState.categoryByInfo?.data, v.name);
        if (widgetOptionsState.categoryByInfo?.data === DATE_FIELD.DATE) {
            _name = dayjs.utc(v.name).format(state.dateFormat);
        }
        return {
            name: _name,
            value: v.value,
        };
    }) || [];
};

const { widgetFrameProps, widgetFrameEventHandlers } = useWidgetFrame(props, emit, {
    dateRange,
    errorMessage,
    widgetLoading,
    noData: computed(() => (state.data ? !state.data.results?.length : false)),
});

/* Watcher */
watch([() => state.chartData, () => chartContext.value], ([, chartCtx]) => {
    if (chartCtx) {
        state.chart = init(chartContext.value);
        state.chart.setOption(state.chartOptions, true);
    }
});
watch([() => state.data, () => props.widgetOptions, () => state.dataTable], ([newData,, _dataTable]) => {
    if (!_dataTable) return;
    drawChart(newData);
}, { immediate: true });

useResizeObserver(chartContext, throttle(() => {
    state.chart?.resize();
}, 500));

watch(() => props.dataTableId, async (newDataTableId) => {
    if (!newDataTableId) return;
    state.dataTableLoading = true;
    const fetcher = state.isPrivateWidget
        ? api.privateDataTableAPI.get
        : api.publicDataTableAPI.get;
    try {
        state.dataTable = await fetcher({ data_table_id: newDataTableId });
    } catch (e) {
        ErrorHandler.handleError(e);
    } finally {
        state.dataTableLoading = false;
    }
}, { immediate: true });
defineExpose<WidgetExpose>({
    loadWidget: () => {
        queryResult.refetch();
    },
});
onMounted(() => {
    emit('mounted', props.widgetName);
});
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
