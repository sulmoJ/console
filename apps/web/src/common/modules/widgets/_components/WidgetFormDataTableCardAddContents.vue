<script setup lang="ts">
import {
    computed, defineExpose, onMounted, reactive, watch,
} from 'vue';

import { isArray, isEqual, uniq } from 'lodash';

import type { MenuItem } from '@cloudforet/mirinae/src/controls/context-menu/type';
import type { SelectDropdownMenuItem } from '@cloudforet/mirinae/src/controls/dropdown/select-dropdown/type';

import type { PrivateDataTableModel } from '@/schema/dashboard/private-data-table/model';
import type { DataTableUpdateParameters } from '@/schema/dashboard/public-data-table/api-verbs/update';
import type { PublicDataTableModel } from '@/schema/dashboard/public-data-table/model';
import { i18n } from '@/translations';

import { useAllReferenceStore } from '@/store/reference/all-reference-store';
import type { CostDataSourceReferenceMap } from '@/store/reference/cost-data-source-reference-store';
import type { MetricReferenceMap } from '@/store/reference/metric-reference-store';

import { showErrorMessage, showSuccessMessage } from '@/lib/helper/notice-alert-helper';
import getRandomId from '@/lib/random-id-generator';

import WidgetFormDataTableCardAddForm from '@/common/modules/widgets/_components/WidgetFormDataTableCardAddForm.vue';
import WidgetFormDataTableCardAlertModal
    from '@/common/modules/widgets/_components/WidgetFormDataTableCardAlertModal.vue';
import WidgetFormDataTableCardFooter from '@/common/modules/widgets/_components/WidgetFormDataTableCardFooter.vue';
import WidgetFormDataTableCardHeaderTitle
    from '@/common/modules/widgets/_components/WidgetFormDataTableCardHeaderTitle.vue';
import WidgetFormDataTableCardSourceForm
    from '@/common/modules/widgets/_components/WidgetFormDataTableCardSourceForm.vue';
import {
    DATA_SOURCE_DOMAIN,
    DATA_TABLE_OPERATOR,
    DATA_TABLE_TYPE,
} from '@/common/modules/widgets/_constants/data-table-constant';
import { useWidgetGenerateStore } from '@/common/modules/widgets/_store/widget-generate-store';
import type { DataTableAlertModalMode } from '@/common/modules/widgets/types/widget-data-table-type';
import type {
    DataTableAddOptions,
    DataTableQueryFilter, TimeDiff,
} from '@/common/modules/widgets/types/widget-model';

interface Props {
    selected: boolean;
    item: PublicDataTableModel|PrivateDataTableModel;
}

type DataTableModel = PublicDataTableModel|PrivateDataTableModel;

const props = defineProps<Props>();

const widgetGenerateStore = useWidgetGenerateStore();
const widgetGenerateState = widgetGenerateStore.state;
const allReferenceStore = useAllReferenceStore();

const storeState = reactive({
    costDataSources: computed<CostDataSourceReferenceMap>(() => allReferenceStore.getters.costDataSource),
    metrics: computed<MetricReferenceMap>(() => allReferenceStore.getters.metric),
    selectedDataTableId: computed(() => widgetGenerateState.selectedDataTableId),
    selectedDataTable: computed(() => widgetGenerateStore.getters.selectedDataTable),
    dataTables: computed(() => widgetGenerateState.dataTables),
    allDataTableInvalidMap: computed(() => widgetGenerateState.allDataTableInvalidMap),
});

const state = reactive({
    loading: false,
    dataTableId: computed(() => props.item.data_table_id),
    sourceType: computed(() => props.item.source_type),
    options: computed(() => props.item.options),
    dataSourceId: computed(() => state.options[state.sourceType].data_source_id), // COST only
    metricId: computed(() => state.options[state.sourceType].metric_id), // ASSET only
    namespaceId: computed(() => storeState.metrics[state.metricId]?.data.namespace_id || ''), // ASSET only
    selectedSourceEndItem: props.item.source_type === DATA_SOURCE_DOMAIN.COST
        ? props.item.options[DATA_SOURCE_DOMAIN.COST]?.data_key
        : props.item.options[DATA_SOURCE_DOMAIN.ASSET]?.metric_id,
    selectedGroupByItems: [] as { name: string; label: string; }[],
    filter: {} as Record<string, DataTableQueryFilter>,
    dataFieldName: '',
    dataUnit: '',
    selectableSourceItems: computed<SelectDropdownMenuItem[]>(() => {
        if (state.sourceType === DATA_SOURCE_DOMAIN.COST) {
            return state.costDataTypeItems;
        }
        if (state.sourceType === DATA_SOURCE_DOMAIN.ASSET) {
            return Object.values(storeState.metrics)
                .filter((metric) => metric.data.namespace_id === state.namespaceId)
                .map((metric) => ({
                    label: metric.label,
                    name: metric.key,
                }));
        }
        return [];
    }),
    costDataTypeItems: computed(() => {
        const targetCostDataSource = storeState.costDataSources[state.dataSourceId];
        const costAlias: string|undefined = targetCostDataSource?.data?.plugin_info?.metadata?.alias?.cost || targetCostDataSource?.data?.plugin_info?.metadata?.cost_info?.name;
        const additionalMenuItems: MenuItem[] = targetCostDataSource.data?.cost_data_keys?.map((key) => ({
            name: `data.${key}`, label: key,
        }));
        return [
            { name: 'cost', label: costAlias ? `Cost (${costAlias})` : 'Cost' },
            { name: 'usage_quantity', label: 'Usage' },
            ...(additionalMenuItems || []),
        ];
    }),
    filterFormKey: getRandomId(),
    optionsChanged: computed(() => {
        const sourceKeyChanged = state.selectedSourceEndItem !== originDataState.sourceKey;
        const groupByChanged = !isEqual(state.selectedGroupByItems, originDataState.groupBy);
        const filterChanged = !isEqual(state.filter, originDataState.filter);
        const dataTableNameChanged = state.dataFieldName !== originDataState.dataName;
        const dataUnitChanged = state.dataUnit !== originDataState.dataUnit;
        const timeDiffChanged = advancedOptionsState.selectedTimeDiff !== originDataState.timeDiff;
        const timeDiffDateChanged = advancedOptionsState.selectedTimeDiffDate !== originDataState.timeDiffDate;

        return sourceKeyChanged || groupByChanged || filterChanged || dataTableNameChanged || dataUnitChanged
            || timeDiffChanged || timeDiffDateChanged;
    }),
    failStatus: false,
    isUnavailable: computed<boolean>(() => props.item.state === 'UNAVAILABLE'),
});

const dataTableNameState = reactive({
    dataTableName: props.item.name ?? '',
});

const advancedOptionsState = reactive({
    selectedTimeDiff: 'none',
    selectedTimeDiffDate: undefined as string|undefined,
    timeDiffDataName: '' as string,
});

const validationState = reactive({
    dataTableApplyInvalid: false,
});

const originDataState = reactive({
    sourceKey: computed(() => (state.sourceType === DATA_SOURCE_DOMAIN.COST ? props.item.options[DATA_SOURCE_DOMAIN.COST]?.data_key : props.item.options[DATA_SOURCE_DOMAIN.ASSET]?.metric_id)),
    groupBy: computed(() => ((props.item.options as DataTableAddOptions).group_by ?? []).map((group) => ({
        name: group.key,
        label: group.name,
    }))),
    filter: computed<Record<string, DataTableQueryFilter>>(() => {
        const _filter = {} as Record<string, DataTableQueryFilter>;
        ((props.item.options as DataTableAddOptions).filter ?? []).forEach((filter) => {
            _filter[filter.k] = filter;
        });
        return _filter;
    }),
    dataName: computed(() => (props.item.options as DataTableAddOptions).data_name ?? ''),
    dataUnit: computed(() => (props.item.options as DataTableAddOptions).data_unit ?? ''),
    timeDiff: computed<string>(() => {
        const timeDiff = (props.item.options as DataTableAddOptions).timediff;
        const timeDiffKeys = Object.keys(timeDiff || {}).filter((key) => key !== 'data_name');
        return timeDiffKeys.length ? timeDiffKeys[0] : 'none';
    }),
    timeDiffDate: computed<string|undefined>(() => {
        const timeDiff = (props.item.options as DataTableAddOptions).timediff;
        const timeDiffKeys = Object.keys(timeDiff || {}).filter((key) => key !== 'data_name');
        return timeDiffKeys.length ? `${-timeDiff[timeDiffKeys[0]]}` : undefined;
    }),
    timeDiffDataName: computed<string>(() => {
        const timeDiff = (props.item.options as DataTableAddOptions).timediff;
        return timeDiff?.data_name || '';
    }),
});

const modalState = reactive({
    visible: false,
    mode: '' as DataTableAlertModalMode,
    referenceDataTableName: '',
});

const setFailStatus = (status: boolean) => {
    state.failStatus = status;
};
const getTimeDiffValue = (): TimeDiff|undefined => {
    if (advancedOptionsState.selectedTimeDiff === 'none' || !Number(advancedOptionsState.selectedTimeDiffDate)) return undefined;
    const defaultFieldName = state.selectableSourceItems.find((source) => source.name === state.selectedSourceEndItem)?.label || '';
    const timeDiffOptions = {
        none: '',
        months: 'month',
        years: 'year',
    };
    return {
        [advancedOptionsState.selectedTimeDiff]: -Number(advancedOptionsState.selectedTimeDiffDate),
        data_name: advancedOptionsState.timeDiffDataName || `${defaultFieldName} (- ${advancedOptionsState.selectedTimeDiffDate} ${timeDiffOptions[advancedOptionsState.selectedTimeDiff]})`,
    };
};
const updateDataTable = async (): Promise<DataTableModel|undefined> => {
    if (!state.dataFieldName.length) {
        showErrorMessage(i18n.t('COMMON.WIDGETS.DATA_TABLE.FORM.UPDATE_DATA_TALBE_INVALID_WARNING'), '');
        setFailStatus(true);
        return undefined;
    }

    const domainOptions = state.sourceType === DATA_SOURCE_DOMAIN.COST
        ? { data_source_id: state.dataSourceId, data_key: state.selectedSourceEndItem }
        : { metric_id: state.selectedSourceEndItem };

    const costGroupBy = state.selectedGroupByItems.map((group) => ({
        key: group.name,
        name: group.label,
    }));
    const metricLabelsInfo = storeState.metrics[state.metricId ?? '']?.data?.labels_info;
    const assetGroupBy = (metricLabelsInfo ?? []).filter((label) => state.selectedGroupByItems.map((group) => group.name).includes(label.key));
    const groupBy = state.sourceType === DATA_SOURCE_DOMAIN.COST ? costGroupBy : assetGroupBy;
    const refinedFilter = Object.values(state.filter as Record<string, DataTableQueryFilter>)
        .filter((filter) => {
            if (isArray(filter.v)) return filter?.v?.length;
            return !!filter?.v;
        })
        .map((filter) => {
            if (isArray(filter.v)) {
                return {
                    ...filter,
                    v: uniq(filter.v),
                };
            }
            return {
                ...filter,
                v: filter.v,
            };
        });

    const updateParams: DataTableUpdateParameters = {
        data_table_id: state.dataTableId,
        options: {
            [state.sourceType]: domainOptions,
            group_by: groupBy,
            filter: refinedFilter,
            data_name: state.dataFieldName,
            data_unit: state.dataUnit,
            timediff: getTimeDiffValue(),
        },
    };

    const result = await widgetGenerateStore.updateDataTable(updateParams);

    if (result) {
        setInitialDataTableForm();
        state.filterFormKey = getRandomId();
        setFailStatus(false);
    } else setFailStatus(true);

    return result;
};

/* Events */
const handleSelectSourceItem = (selectedItem: string) => {
    state.selectedSourceEndItem = selectedItem;
    showSuccessMessage(i18n.t('COMMON.WIDGETS.DATA_TABLE.FORM.SELECT_DATA_SOURCE_SUCCESS'), '');
};

const handleClickDeleteDataTable = async () => {
    const isExistingDataTableInTransformed = storeState.dataTables.find((dataTable) => {
        const isTransformedData = dataTable.data_type === DATA_TABLE_TYPE.TRANSFORMED;
        if (!isTransformedData) return undefined;
        const isDualDataTableOperator = dataTable.operator === DATA_TABLE_OPERATOR.CONCAT || dataTable.operator === DATA_TABLE_OPERATOR.JOIN;
        const operatorOptions = (dataTable.options ?? {})[dataTable.operator ?? ''];
        return isDualDataTableOperator ? operatorOptions?.data_tables.includes(state.dataTableId) : operatorOptions?.data_table_id === state.dataTableId;
    });
    if (isExistingDataTableInTransformed) {
        modalState.referenceDataTableName = isExistingDataTableInTransformed.name || '';
        modalState.mode = 'DELETE_UNABLED';
        modalState.visible = true;
        return;
    }
    modalState.mode = 'DELETE';
    modalState.visible = true;
};
const handleClickResetDataTable = () => {
    modalState.mode = 'RESET';
    modalState.visible = true;
};
const handleConfirmModal = async () => {
    if (modalState.mode === 'DELETE') {
        const beforeSelectedDataTableId = storeState.selectedDataTableId;
        const deleteParams = {
            data_table_id: state.dataTableId,
        };
        await widgetGenerateStore.deleteDataTable(deleteParams);
        if (beforeSelectedDataTableId === state.dataTableId) {
            const dataTableId = storeState.dataTables.length ? storeState.dataTables[0]?.data_table_id : undefined;
            widgetGenerateStore.setSelectedDataTableId(dataTableId?.startsWith('UNSAVED-') ? undefined : dataTableId);
        }
    }
    if (modalState.mode === 'RESET') {
        setInitialDataTableForm();
        state.filterFormKey = getRandomId();
    }
    modalState.visible = false;
};
const handleCancelModal = () => {
    modalState.visible = false;
};
const handleUpdateDataTable = async () => {
    state.loading = true;
    const result = await updateDataTable();
    if (result) {
        showSuccessMessage(i18n.t('COMMON.WIDGETS.DATA_TABLE.FORM.UPDATE_DATA_TALBE_INVALID_SUCCESS'), '');
        widgetGenerateStore.setSelectedDataTableId(state.dataTableId);
    }
    setTimeout(() => {
        state.loading = false;
    }, 1000);
};

/* Utils */
const setInitialDataTableForm = () => {
    // Initial Form Setting
    // Basic Options
    state.selectedGroupByItems = [...originDataState.groupBy];
    state.filter = originDataState.filter;
    state.dataFieldName = originDataState.dataName;
    state.dataUnit = originDataState.dataUnit;

    // Advanced Options
    advancedOptionsState.selectedTimeDiff = originDataState.timeDiff;
    advancedOptionsState.selectedTimeDiffDate = originDataState.timeDiffDate;
    advancedOptionsState.timeDiffDataName = originDataState.timeDiffDataName;
};

onMounted(() => {
    // Initial Form Setting
    setInitialDataTableForm();
});

watch(() => state.selectedSourceEndItem, (_selectedSourceItem) => {
    // Base Options
    state.selectedGroupByItems = [];
    state.dataFieldName = state.selectableSourceItems.find((source) => source.name === _selectedSourceItem)?.label;
    state.dataUnit = state.sourceType === DATA_SOURCE_DOMAIN.ASSET ? storeState.metrics[_selectedSourceItem]?.data?.unit || '' : '';
    state.filter = {};


    // Advanced Options
    advancedOptionsState.selectedTimeDiff = 'none';
    advancedOptionsState.selectedTimeDiffDate = undefined;
    advancedOptionsState.timeDiffDataName = '';
});

// Validation
watch(() => validationState.dataTableApplyInvalid, (invalid) => {
    const _allDataTableInvalidMap = {
        ...storeState.allDataTableInvalidMap,
        [state.dataTableId]: invalid,
    };
    widgetGenerateStore.setAllDataTableInvalidMap(_allDataTableInvalidMap);
}, { immediate: true });

defineExpose({
    updateDataTable,
});

</script>

<template>
    <div class="widget-form-data-table-card-add-contents"
         :class="{ 'selected': props.selected, 'failed': state.failStatus, 'unavailable': state.isUnavailable }"
    >
        <div class="card-header">
            <widget-form-data-table-card-header-title :data-table-id="state.dataTableId"
                                                      :data-type="DATA_TABLE_TYPE.ADDED"
                                                      :selected="props.selected"
                                                      :data-table-name.sync="dataTableNameState.dataTableName"
            />
            <widget-form-data-table-card-source-form :source-type="state.sourceType"
                                                     :parent-source-id="state.sourceType === DATA_SOURCE_DOMAIN.COST ? state.dataSourceId : state.namespaceId"
                                                     :menu="state.selectableSourceItems"
                                                     :selected="state.selectedSourceEndItem"
                                                     @select="handleSelectSourceItem"
            />
        </div>
        <widget-form-data-table-card-add-form :filter-form-key="state.filterFormKey"
                                              :data-table-id="state.dataTableId"
                                              :source-id="state.sourceType === DATA_SOURCE_DOMAIN.COST ? state.dataSourceId : state.selectedSourceEndItem"
                                              :source-key="state.selectedSourceEndItem"
                                              :source-type="state.sourceType"
                                              :source-items="state.selectableSourceItems"
                                              :selected-group-by-items.sync="state.selectedGroupByItems"
                                              :filter.sync="state.filter"
                                              :data-field-name.sync="state.dataFieldName"
                                              :data-unit.sync="state.dataUnit"
                                              :selected-time-diff.sync="advancedOptionsState.selectedTimeDiff"
                                              :selected-time-diff-date.sync="advancedOptionsState.selectedTimeDiffDate"
                                              :time-diff-data-name.sync="advancedOptionsState.timeDiffDataName"
                                              :form-invalid.sync="validationState.dataTableApplyInvalid"
        />
        <widget-form-data-table-card-footer :disabled="validationState.dataTableApplyInvalid"
                                            :changed="state.optionsChanged"
                                            :loading="state.loading"
                                            @delete="handleClickDeleteDataTable"
                                            @reset="handleClickResetDataTable"
                                            @update="handleUpdateDataTable"
        />
        <widget-form-data-table-card-alert-modal :mode="modalState.mode"
                                                 :visible="modalState.visible"
                                                 :reference-data-table-name="modalState.referenceDataTableName"
                                                 @cancel="handleCancelModal"
                                                 @confirm="handleConfirmModal"
        />
    </div>
</template>

<style lang="scss" scoped>
.widget-form-data-table-card-add-contents {
    @apply border border-gray-200 rounded-lg w-full bg-white;
    width: 25vw;
    min-width: 21rem;
    max-width: 24rem;
    padding-top: 0.125rem;
    margin-bottom: 2rem;

    &:hover {
        @apply border border-primary2;
        box-shadow: 0 0 0 3px theme('colors.violet.200');
    }
    &.selected {
        @apply border-violet-600;
        box-shadow: 0 0 0 0.1875rem rgba(137, 124, 214, 0.6);
        .card-header {
            @apply bg-violet-100 border border-violet-200;
        }
    }

    &.failed {
        @apply border-red-400;
        box-shadow: 0 0 0 0.1875rem rgba(255, 193, 193, 1);
    }

    &.unavailable {
        @apply border-dashed;
    }

    .card-header {
        @apply bg-gray-100 rounded-lg border border-gray-200;
        width: calc(100% - 0.5rem);
        padding: 0.75rem;
        margin: auto;
    }
}
</style>
