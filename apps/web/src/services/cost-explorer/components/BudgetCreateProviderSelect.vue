<script setup lang="ts">
import {
    computed, reactive, watch,
} from 'vue';

import { debounce } from 'lodash';

import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import { getCancellableFetcher } from '@cloudforet/core-lib/space-connector/cancellable-fetcher';
import { PFieldGroup, PRadio, PSelectDropdown } from '@cloudforet/mirinae';
import type {
    AutocompleteHandler,
    SelectDropdownMenuItem,
} from '@cloudforet/mirinae/types/controls/dropdown/select-dropdown/type';

import type { BudgetModel } from '@/api-clients/cost-analysis/budget/schema/model';
import { i18n } from '@/translations';


import { useAllReferenceStore } from '@/store/reference/all-reference-store';
import type { ProviderReferenceMap } from '@/store/reference/provider-reference-store';
import type { RegionReferenceMap } from '@/store/reference/region-reference-store';
import type { ServiceAccountReferenceMap } from '@/store/reference/service-account-reference-store';
import type { ReferenceMap } from '@/store/reference/type';

import ErrorHandler from '@/common/composables/error/errorHandler';
import { useFormValidator } from '@/common/composables/form-validator';


type ProviderFilter = BudgetModel['provider_filter'];

interface Props {
    costTypes?: ProviderFilter;
    disableValidation?: boolean;
}

interface DistinctResult {
    results?: {name: string; key: string}[];
    total_count?: number;
}

const getSearchDropdownItems = (resourceItems: ReferenceMap): SelectDropdownMenuItem[] => Object.keys(resourceItems).map((k) => ({
    name: k, label: resourceItems[k].label,
}));

const props = withDefaults(defineProps<Props>(), {
    costTypes: undefined,
    disableValidation: false,
});

const emit = defineEmits<{(e: 'update', providerFilter: ProviderFilter|undefined, isValid: boolean): void; }>();

const {
    forms: {
        selectedCostType, selectedResources,
    },
    setForm,
    invalidState,
    invalidTexts,
    isAllValid,
} = useFormValidator({
    selectedCostType: 'all',
    selectedResources: [] as SelectDropdownMenuItem[],
}, {
    selectedResources(value: string) {
        if (selectedCostType.value === 'all') return '';
        return value.length ? '' : i18n.t('BILLING.COST_MANAGEMENT.BUDGET.FORM.BASE_INFO.REQUIRED_COST_TYPE');
    },
}, { selectedCostType: true, selectedResources: true });

const allReferenceStore = useAllReferenceStore();
const state = reactive({
    providers: computed<ProviderReferenceMap>(() => allReferenceStore.getters.provider),
    regions: computed<RegionReferenceMap>(() => allReferenceStore.getters.region),
    serviceAccounts: computed<ServiceAccountReferenceMap>(() => allReferenceStore.getters.serviceAccount),
    costTypeItems: computed(() => ({
        all: i18n.t('BILLING.COST_MANAGEMENT.BUDGET.FORM.BASE_INFO.ALL'),
        provider: i18n.t('BILLING.COST_MANAGEMENT.BUDGET.FORM.BASE_INFO.SPECIFIC_PROVIDER'),
    })),
    resourceMenuItems: computed<SelectDropdownMenuItem[]|undefined>(() => (selectedCostType.value === 'provider' ? getSearchDropdownItems(state.providers) : undefined)),
    resourceMenuLoading: false,
    visibleResourceMenu: false,
    costTypeInfo: computed<ProviderFilter|undefined>(() => {
        const providers = selectedResources.value.map((d) => d.name as string);
        return {
            state: selectedCostType.value === 'all' ? 'DISABLED' : 'ENABLED',
            providers,
        };
    }),
});

const fetcher = getCancellableFetcher(SpaceConnector.client.addOns.autocomplete.distinct);
const getResources = async (inputText: string, distinctKey): Promise<DistinctResult> => {
    try {
        state.resourceMenuLoading = true;
        const { status, response } = await fetcher({
            resource_type: 'cost_analysis.Cost',
            distinct_key: distinctKey,
            search: inputText,
            options: {
                limit: 10,
            },
        });
        if (status === 'succeed') {
            state.resourceMenuLoading = false;
            return response;
        }
        return {};
    } catch (e: any) {
        state.resourceMenuLoading = false;
        ErrorHandler.handleError(e);
        return {};
    }
};

const resourceMenuHandler: AutocompleteHandler = async (inputText: string) => {
    if (state.resourceMenuItems) return { results: [] };

    const { results, total_count } = await getResources(inputText, selectedCostType.value);

    return {
        results: results ? results.map((d) => ({ name: d.key, label: d.name })) : [],
        totalCount: total_count,
    };
};

watch(() => selectedCostType.value, () => {
    state.visibleResourceMenu = false;
    setForm('selectedResources', []);
});

watch([() => state.costTypeInfo, () => isAllValid.value], debounce(([costTypeInfo, isValid]) => {
    emit('update', costTypeInfo, isValid);
}, 300) as any, { immediate: true });
</script>

<template>
    <p-field-group :label="$t('BILLING.COST_MANAGEMENT.BUDGET.FORM.BASE_INFO.PROVIDER')"
                   required
                   :invalid="!props.disableValidation && invalidState.selectedResources"
                   :invalid-text="invalidTexts.selectedResources"
                   class="budget-create-provider-select"
    >
        <div class="cost-type-wrapper">
            <p-radio v-for="(costTypeLabel, costTypeKey) in state.costTypeItems"
                     :key="costTypeKey"
                     :selected="selectedCostType"
                     :value="costTypeKey"
                     @change="setForm('selectedCostType', $event)"
            >
                {{ costTypeLabel }}
            </p-radio>
        </div>
        <p-select-dropdown v-if="selectedCostType !== 'all'"
                           :visible-menu.sync="state.visibleResourceMenu"
                           :menu="state.resourceMenuItems"
                           :handler="state.resourceMenuItems ? undefined : resourceMenuHandler"
                           :loading="state.resourceMenuLoading"
                           :invalid="!props.disableValidation && invalidState.selectedResources"
                           :selected="selectedResources"
                           multi-selectable
                           show-select-marker
                           appearance-type="stack"
                           class="mt-2"
                           is-filterable
                           show-delete-all-button
                           @update:selected="setForm('selectedResources', $event)"
        />
    </p-field-group>
</template>

<style lang="postcss" scoped>
.budget-create-provider-select {
    width: 30rem;
}

.cost-type-wrapper {
    display: flex;
    flex-wrap: wrap;
    .p-radio {
        margin-right: 1rem;
        margin-bottom: 0.25rem;
    }
}

@screen mobile {
    .budget-create-provider-select {
        display: flex;
        flex-wrap: wrap;
        width: 100%;
    }
}
</style>
