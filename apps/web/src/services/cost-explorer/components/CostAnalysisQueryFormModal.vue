<script lang="ts" setup>
import {
    computed, reactive, watch,
} from 'vue';

import {
    PButtonModal, PFieldGroup, PTextInput,
} from '@cloudforet/mirinae';

import type { CostQuerySetModel } from '@/api-clients/cost-analysis/cost-query-set/schema/model';
import { i18n } from '@/translations';

import { showSuccessMessage } from '@/lib/helper/notice-alert-helper';

import ErrorHandler from '@/common/composables/error/errorHandler';
import { useProxyValue } from '@/common/composables/proxy-state';

import { MANAGED_COST_QUERY_SET_ID_LIST } from '@/services/cost-explorer/constants/managed-cost-analysis-query-sets';
import { useCostAnalysisPageStore } from '@/services/cost-explorer/stores/cost-analysis-page-store';


type RequestType = 'SAVE' | 'EDIT';
interface Props {
    visible: boolean;
    headerTitle: string;
    requestType: RequestType;
    selectedQuerySetId?: string;
}

const props = withDefaults(defineProps<Props>(), {
    requestType: 'SAVE',
    selectedQuerySetId: undefined,
});
const emit = defineEmits<{(e: 'update:visible', visible: boolean): void;
    (e: 'update-query', updatedQueryId: string)
}>();

const costAnalysisPageStore = useCostAnalysisPageStore();
const costAnalysisPageGetters = costAnalysisPageStore.getters;

const formState = reactive({
    queryName: undefined as undefined | string,
});
const state = reactive({
    proxyVisible: useProxyValue('visible', props, emit),
    selectedQuerySet: computed<CostQuerySetModel|undefined>(() => {
        if (props.requestType === 'EDIT') {
            return costAnalysisPageGetters.costQueryList.find((query) => query.cost_query_set_id === props.selectedQuerySetId);
        }
        return undefined;
    }),
    queryNameInvalidText: computed(() => {
        if (typeof formState.queryName === 'undefined') return undefined;
        if (formState.queryName.length === 0) {
            return i18n.t('BILLING.COST_MANAGEMENT.COST_ANALYSIS.MODAL_VALIDATION_REQUIRED');
        }
        if (formState.queryName.length > 40) {
            return i18n.t('BILLING.COST_MANAGEMENT.COST_ANALYSIS.MODAL_VALIDATION_LENGTH');
        }
        if (state.mergedCostQuerySetNameList.filter((d) => d !== state.selectedQuerySet?.name).includes(formState.queryName)) {
            return i18n.t('BILLING.COST_MANAGEMENT.COST_ANALYSIS.MODAL_VALIDATION_DUPLICATED');
        }
        return undefined;
    }),
    isQueryNameValid: computed(() => !state.queryNameInvalidText),
    showValidation: false,
    isAllValid: computed(() => state.showValidation && state.isQueryNameValid),
    managedCostQuerySetIdList: [...MANAGED_COST_QUERY_SET_ID_LIST],
    existingCostQuerySetNameList: computed(() => costAnalysisPageGetters.costQueryList.map((query) => query.name)),
    mergedCostQuerySetNameList: computed(() => [...state.managedCostQuerySetIdList, ...state.existingCostQuerySetNameList]),
});

const saveQuery = async () => {
    if (!formState.queryName) return;
    try {
        const updatedQuery = await costAnalysisPageStore.saveQuery(formState.queryName);
        if (!updatedQuery) return;
        showSuccessMessage(i18n.t('BILLING.COST_MANAGEMENT.COST_ANALYSIS.ALT_S_SAVE_AS_QUERY'), '');
        emit('update-query', updatedQuery.cost_query_set_id);
    } catch (e) {
        ErrorHandler.handleRequestError(e, i18n.t('BILLING.COST_MANAGEMENT.COST_ANALYSIS.ALT_E_SAVED_QUERY'));
    }
};

const editQuery = async () => {
    if (!formState.queryName) return;
    try {
        const updatedQuery = await costAnalysisPageStore.editQuery(props.selectedQuerySetId, formState.queryName);
        if (!updatedQuery) return;
        showSuccessMessage(i18n.t('BILLING.COST_MANAGEMENT.COST_ANALYSIS.ALT_S_SAVE_QUERY'), '');
        emit('update-query', updatedQuery.cost_query_set_id);
    } catch (e) {
        ErrorHandler.handleRequestError(e, i18n.t('BILLING.COST_MANAGEMENT.COST_ANALYSIS.ALT_E_EDITED_QUERY'));
    }
};

/* Event */
const handleFormConfirm = async () => {
    if (!state.isAllValid) return;
    if (props.requestType === 'SAVE') await saveQuery();
    else await editQuery();
    state.proxyVisible = false;
};

const handleFirstQueryNameInput = () => {
    state.showValidation = true;
};

/* Watcher */
watch(() => state.proxyVisible, (visible) => {
    if (visible) {
        if (props.requestType === 'EDIT') {
            formState.queryName = state.selectedQuerySet?.name;
        }
        state.showValidation = true;
    } else {
        formState.queryName = undefined;
        state.showValidation = false;
    }
});

</script>

<template>
    <p-button-modal
        :header-title="headerTitle"
        size="sm"
        fade
        backdrop
        :visible.sync="state.proxyVisible"
        :disabled="!state.isAllValid || !formState.queryName"
        @confirm="handleFormConfirm"
    >
        <template #body>
            <p-field-group class="query-name-input-wrap"
                           :label="$t('BILLING.COST_MANAGEMENT.COST_ANALYSIS.NAME_LABEL')"
                           :invalid="!state.isQueryNameValid"
                           :invalid-text="state.queryNameInvalidText"
                           required
            >
                <template #default>
                    <p-text-input v-model="formState.queryName"
                                  class="block w-full"
                                  :placeholder="$t('BILLING.COST_MANAGEMENT.COST_ANALYSIS.LABEL_COST_ANALYSIS_NAME')"
                                  :invalid="!state.isQueryNameValid"
                                  @update:value.once="handleFirstQueryNameInput"
                    />
                </template>
            </p-field-group>
        </template>
    </p-button-modal>
</template>

<style lang="postcss" scoped>
.query-name-input-wrap {
    margin-bottom: 2rem;
}
</style>
