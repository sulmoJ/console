<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core/index';
import {
    computed, defineExpose, onMounted, reactive, ref, watch,
} from 'vue';

import { useQuery } from '@tanstack/vue-query';
import dayjs from 'dayjs';
import type { BarSeriesOption } from 'echarts/charts';
import type { EChartsType } from 'echarts/core';
import { init } from 'echarts/core';
import {
    isEmpty, throttle,
} from 'lodash';

import { numberFormatter } from '@cloudforet/utils';

import type { WidgetLoadParams, WidgetLoadResponse } from '@/api-clients/dashboard/_types/widget-type';
import { i18n } from '@/translations';

import ErrorHandler from '@/common/composables/error/errorHandler';
import WidgetFrame from '@/common/modules/widgets/_components/WidgetFrame.vue';
import { useWidgetDateRange } from '@/common/modules/widgets/_composables/use-widget-date-range';
import { useWidgetFormQuery } from '@/common/modules/widgets/_composables/use-widget-form-query';
import { useWidgetFrame } from '@/common/modules/widgets/_composables/use-widget-frame';
import { DATA_TABLE_OPERATOR } from '@/common/modules/widgets/_constants/data-table-constant';
import { DATE_FIELD, WIDGET_LOAD_STALE_TIME } from '@/common/modules/widgets/_constants/widget-constant';
import { DATE_FORMAT, SUB_TOTAL_NAME } from '@/common/modules/widgets/_constants/widget-field-constant';
import {
    normalizeAndSerializeVars,
} from '@/common/modules/widgets/_helpers/global-variable-helper';
import {
    getReferenceLabel,
    getWidgetDateFields,
    getWidgetDateRange,
} from '@/common/modules/widgets/_helpers/widget-date-helper';
import { isDateField } from '@/common/modules/widgets/_helpers/widget-field-helper';
import { getFormattedNumber } from '@/common/modules/widgets/_helpers/widget-helper';
import {
    getWidgetLoadApiQueryDateRange, getWidgetLoadApiQuerySort,
} from '@/common/modules/widgets/_helpers/widget-load-helper';
import type { DataFieldValue } from '@/common/modules/widgets/_widget-fields/data-field/type';
import type { DateFormatValue } from '@/common/modules/widgets/_widget-fields/date-format/type';
import type { DateRangeValue } from '@/common/modules/widgets/_widget-fields/date-range/type';
import type { DisplaySeriesLabelValue } from '@/common/modules/widgets/_widget-fields/display-series-label/type';
import type { GranularityValue } from '@/common/modules/widgets/_widget-fields/granularity/type';
import type { LegendValue } from '@/common/modules/widgets/_widget-fields/legend/type';
import type { NumberFormatValue } from '@/common/modules/widgets/_widget-fields/number-format/type';
import type { TooltipNumberFormatValue } from '@/common/modules/widgets/_widget-fields/tooltip-number-format/type';
import type { YAxisValue } from '@/common/modules/widgets/_widget-fields/y-axis/type';
import type { DataTableModel } from '@/common/modules/widgets/types/widget-data-table-type';
import type { DateRange } from '@/common/modules/widgets/types/widget-data-type';
import type { WidgetEmit, WidgetExpose, WidgetProps } from '@/common/modules/widgets/types/widget-display-type';

import { MASSIVE_CHART_COLORS } from '@/styles/colorsets';




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
    isPivotDataTable: computed<boolean>(() => state.dataTable?.operator === DATA_TABLE_OPERATOR.PIVOT),

    data: computed<WidgetLoadResponse | null>(() => queryResult?.data?.value || null),
    yAxisData: computed<string[]>(() => {
        if (!state.data?.results?.length) return [];
        if (isDateField(widgetOptionsState.yAxisInfo?.data)) {
            const _isSeparatedDate = widgetOptionsState.yAxisInfo?.data !== DATE_FIELD.DATE;
            return getWidgetDateFields(widgetOptionsState.granularityInfo?.granularity, state.widgetDateRange.start, state.widgetDateRange.end, _isSeparatedDate);
        }
        const _yAxisData: string[] = state.data.results.map((d) => d[widgetOptionsState.yAxisInfo?.data as string] as string) || [];
        return Array.from(new Set(_yAxisData)).reverse();
    }),
    chartData: [],
    chart: null as EChartsType | null,
    unitMap: computed<Record<string, string>>(() => widgetFrameProps.value.unitMap || {}),
    dataField: computed<string>(() => widgetOptionsState.dataFieldInfo?.data?.[0] || ''),
    chartOptions: computed<BarSeriesOption>(() => ({
        color: MASSIVE_CHART_COLORS,
        legend: {
            type: 'scroll',
            show: widgetOptionsState.legendInfo?.toggleValue,
            bottom: 0,
            left: 0,
            icon: 'circle',
            itemWidth: 10,
            itemHeight: 10,
            formatter: (val) => {
                if (state.isPivotDataTable) return getReferenceLabel(props.allReferenceTypeInfo, state.dataField, val);
                return val;
            },
        },
        tooltip: {
            formatter: (params) => {
                const _params = Array.isArray(params) ? params : [params];
                return _params.map((p) => {
                    const _unit: string|undefined = state.unitMap[p.seriesName];
                    const _seriesName = getReferenceLabel(props.allReferenceTypeInfo, state.dataField, p.seriesName);
                    let _value = numberFormatter(p.value) || '';
                    if (widgetOptionsState.tooltipNumberFormatInfo?.toggleValue) {
                        const columnFieldForPivot = state.dataTable?.options.PIVOT?.fields?.column;
                        const fieldName = (state.isPivotDataTable && columnFieldForPivot) ? columnFieldForPivot : p.seriesName;
                        const numberFormat = widgetOptionsState.numberFormatInfo[fieldName];
                        _value = getFormattedNumber(p.value, numberFormat, _unit);
                    }
                    return `${p.marker} ${_seriesName}: <b>${_value}</b>`;
                }).join('<br>');
            },
        },
        grid: {
            left: 0,
            right: '3%',
            containLabel: true,
        },
        xAxis: {
            type: 'value',
            axisLabel: {
                formatter: (val) => numberFormatter(val, { notation: 'compact' }),
            },
        },
        yAxis: {
            type: 'category',
            data: state.yAxisData,
            axisLabel: {
                formatter: (val) => {
                    if (state.yAxisField === DATE_FIELD.DATE) {
                        return dayjs.utc(val).format(state.dateFormat);
                    }
                    return getReferenceLabel(props.allReferenceTypeInfo, widgetOptionsState.yAxisInfo?.data, val);
                },
            },
        },
        series: state.chartData,
    })),
    widgetDateRange: computed<DateRange>(() => {
        let _start = dateRange.value.start;
        let _end = dateRange.value.end;
        if (isDateField(widgetOptionsState.yAxisInfo?.data)) {
            [_start, _end] = getWidgetDateRange(widgetOptionsState.granularityInfo?.granularity, _end, widgetOptionsState.yAxisInfo?.count);
        }
        return { start: _start, end: _end };
    }),
    dateFormat: computed<string|undefined>(() => {
        const _dateFormat = (props.widgetOptions?.dateFormat?.value as DateFormatValue)?.format || 'MMM DD, YYYY';
        return DATE_FORMAT?.[_dateFormat]?.[widgetOptionsState.granularityInfo?.granularity];
    }),
    dataTableLoading: false,
});

const widgetOptionsState = reactive({
    granularityInfo: computed<GranularityValue>(() => props.widgetOptions?.granularity?.value as GranularityValue),
    yAxisInfo: computed<YAxisValue>(() => props.widgetOptions?.yAxis?.value as YAxisValue),
    dataFieldInfo: computed<DataFieldValue>(() => props.widgetOptions?.dataField?.value as DataFieldValue),
    legendInfo: computed<LegendValue>(() => props.widgetOptions?.legend?.value as LegendValue),
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
        groupBy: widgetOptionsState.yAxisInfo?.data,
        count: widgetOptionsState.yAxisInfo?.count,
        vars: normalizeAndSerializeVars(props.dashboardVars),
    },
]);

const queryResult = useQuery({
    queryKey,
    queryFn: () => fetchWidgetData({
        widget_id: props.widgetId,
        granularity: widgetOptionsState.granularityInfo?.granularity,
        group_by: widgetOptionsState.yAxisInfo?.data ? [widgetOptionsState.yAxisInfo?.data] : [],
        sort: getWidgetLoadApiQuerySort(widgetOptionsState.yAxisInfo?.data as string, widgetOptionsState.dataFieldInfo?.data as string[], state.isPivotDataTable),
        page: { start: 0, limit: widgetOptionsState.yAxisInfo?.count },
        vars: props.dashboardVars,
        ...getWidgetLoadApiQueryDateRange(widgetOptionsState.granularityInfo?.granularity, dateRange.value),
    }),
    enabled: computed(() => props.widgetState !== 'INACTIVE' && !!state.dataTable && !props.loadDisabled),
    staleTime: WIDGET_LOAD_STALE_TIME,
});

const widgetLoading = computed<boolean>(() => queryResult.isFetching.value || state.dataTableLoading);
const errorMessage = computed<string|undefined>(() => {
    if (!state.dataTable) return i18n.t('COMMON.WIDGETS.NO_DATA_TABLE_ERROR_MESSAGE');
    return queryResult.error?.value?.message;
});

/* Util */
const drawChart = (rawData?: WidgetLoadResponse|null) => {
    if (isEmpty(rawData)) return;

    const _seriesData: any[] = [];
    let _dataFields: string[] = widgetOptionsState.dataFieldInfo?.data as string[] || [];

    if (state.isPivotDataTable) {
        const _excludeFields = [...Object.keys(rawData?.labels_info ?? {}), SUB_TOTAL_NAME];
        _dataFields = rawData?.order?.filter((v) => !_excludeFields.includes(v)) || [];
    }
    _dataFields.forEach((_dataField) => {
        const _unit: string|undefined = state.unitMap[_dataField];
        _seriesData.push({
            name: _dataField,
            type: 'bar',
            stack: true,
            barMaxWidth: 50,
            data: state.yAxisData.map((d) => {
                const _data = rawData.results?.find((v) => v[widgetOptionsState.yAxisInfo?.data as string] === d);
                return _data?.[_dataField] || 0;
            }),
            label: {
                show: !!widgetOptionsState.displaySeriesLabelInfo?.toggleValue,
                position: widgetOptionsState.displaySeriesLabelInfo?.position,
                rotate: widgetOptionsState.displaySeriesLabelInfo?.rotate,
                fontSize: 10,
                formatter: (p) => {
                    if (!p.value) return '';
                    const columnFieldForPivot = state.dataTable?.options.PIVOT?.fields?.column;
                    const fieldName = (state.isPivotDataTable && columnFieldForPivot) ? columnFieldForPivot : _dataField;
                    const numberFormat = widgetOptionsState.numberFormatInfo[fieldName];
                    return getFormattedNumber(p.value, numberFormat, _unit);
                },
            },
        });
    });
    state.chartData = _seriesData;
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
