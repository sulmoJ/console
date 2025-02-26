<script lang="ts" setup>
import {
    computed, reactive, watch,
} from 'vue';

import type { MenuItem } from '@cloudforet/mirinae/types/controls/context-menu/type';
import type { AutocompleteHandler } from '@cloudforet/mirinae/types/controls/dropdown/select-dropdown/type';

import { i18n } from '@/translations';

import { useAllReferenceStore } from '@/store/reference/all-reference-store';
import type { CostDataSourceReferenceMap } from '@/store/reference/cost-data-source-reference-store';

import { VariableModelFactory } from '@/lib/variable-models';
import type {
    VariableModelMenuHandlerInfo,
} from '@/lib/variable-models/variable-model-menu-handler';
import {
    getVariableModelMenuHandler,
} from '@/lib/variable-models/variable-model-menu-handler';

import DataSelector from '@/common/components/select/DataSelector.vue';
import { useProxyValue } from '@/common/composables/proxy-state';


interface Props {
    selectedCostDataSourceId?: string;
    selectedCostDataType?: string;
}
const props = defineProps<Props>();
const emit = defineEmits<{(e: 'update:selected-cost-data-source-id', costDataSourceId: string): void;
    (e: 'update:selected-cost-data-type', costDataType: string): void;
}>();


const allReferenceStore = useAllReferenceStore();
const storeState = reactive({
    costDataSource: computed<CostDataSourceReferenceMap>(() => allReferenceStore.getters.costDataSource),
});
const state = reactive({
    proxySelectedCostDataSourceId: useProxyValue('selectedCostDataSourceId', props, emit),
    proxySelectedCostDataType: useProxyValue('selectedCostDataType', props, emit),
    // data source
    selectedDataSource: [] as MenuItem[],
    dataSourceMenuHandler: computed<AutocompleteHandler>(() => {
        const variableModelInfo: VariableModelMenuHandlerInfo = {
            variableModel: new VariableModelFactory({ type: 'MANAGED', managedModelKey: 'cost_data_source' }),
        };
        return getVariableModelMenuHandler([variableModelInfo]);
    }),
    // data type
    dataTypeMenuItems: computed<MenuItem[]>(() => {
        if (!state.selectedDataSource.length) return [];
        const targetCostDataSource = storeState.costDataSource[state.selectedDataSource[0].name];
        const costAlias: string|undefined = targetCostDataSource?.data?.plugin_info?.metadata?.cost_info?.name;
        // const dataInfo = targetCostDataSource?.data?.plugin_info?.metadata?.data_info ?? {};
        const additionalMenuItems: MenuItem[] = targetCostDataSource.data?.cost_data_keys?.map((key) => ({
            type: 'item',
            name: `data.${key}`,
            label: key,
        }));
        const dataTypeItems = [
            { type: 'item', name: 'cost', label: costAlias ? `Cost (${costAlias})` : 'Cost' },
            { type: 'item', name: 'usage_quantity', label: 'Usage' },
            ...(additionalMenuItems || []),
        ];
        return dataTypeItems;
    }),
    selectedDataType: [] as MenuItem[],
});

/* Event */
const handleSelectDataSource = (items: MenuItem[]) => {
    state.selectedDataSource = items;
    state.selectedDataType = [];
};

/* Watcher */
watch(() => state.selectedDataSource, (val) => {
    state.proxySelectedCostDataSourceId = val[0]?.name;
});
watch(() => state.selectedDataType, (val) => {
    state.proxySelectedCostDataType = val[0]?.name;
});
</script>

<template>
    <div class="widget-form-cost-data-source-popper">
        <div class="data-source-select-col">
            <data-selector :label="i18n.t('Data Source')"
                           :handler="state.dataSourceMenuHandler"
                           @update:selected="handleSelectDataSource"
            />
        </div>
        <div class="data-source-select-col">
            <data-selector :label="i18n.t('Data Type')"
                           :menu="state.dataTypeMenuItems"
                           @update:selected="state.selectedDataType = $event"
            />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.widget-form-cost-data-source-popper {
    display: flex;
    width: 16rem;
    flex: 1;
    .data-source-select-col {
        @apply border-r border-gray-200;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 16rem;
        padding: 0.75rem 0;
        &:last-child {
            @apply border-r-0;
        }
    }
}
</style>
