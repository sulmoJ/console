<script lang="ts" setup>
import {
    computed, reactive,
} from 'vue';

import {
    PSelectDropdown,
} from '@cloudforet/mirinae';
import type { MenuItem } from '@cloudforet/mirinae/types/controls/context-menu/type';

import { i18n } from '@/translations';

import { GRANULARITY } from '@/services/asset-inventory/constants/asset-analysis-constant';
import { getInitialPeriodByGranularity } from '@/services/asset-inventory/helpers/asset-analysis-period-helper';
import { useMetricExplorerPageStore } from '@/services/asset-inventory/stores/metric-explorer-page-store';
import type { Granularity } from '@/services/asset-inventory/types/asset-analysis-type';


const metricExplorerPageStore = useMetricExplorerPageStore();
const metricExplorerPageState = metricExplorerPageStore.state;
const state = reactive({
    granularityItems: computed<MenuItem[]>(() => ([
        {
            type: 'item',
            name: GRANULARITY.DAILY,
            label: i18n.t('INVENTORY.METRIC_EXPLORER.DAILY'),
        },
        {
            type: 'item',
            name: GRANULARITY.MONTHLY,
            label: i18n.t('INVENTORY.METRIC_EXPLORER.MONTHLY'),
        },
    ])),
    granularity: GRANULARITY.MONTHLY as Granularity|undefined,
});

/* event */
const handleSelectGranularity = async (granularity: Granularity) => {
    metricExplorerPageStore.setGranularity(granularity);
    // set period
    const [_period, _relativePeriod] = getInitialPeriodByGranularity(granularity);
    metricExplorerPageStore.setPeriod(_period);
    metricExplorerPageStore.setRelativePeriod(_relativePeriod);
    metricExplorerPageStore.setRefreshMetricPeriodDropdown(true);
};
</script>

<template>
    <div class="metric-explorer-granularity-dropdown">
        <p-select-dropdown :menu="state.granularityItems"
                           :selection-label="$t('INVENTORY.METRIC_EXPLORER.GRANULARITY')"
                           style-type="rounded"
                           :selected="metricExplorerPageState.granularity"
                           class="granularity-dropdown"
                           reset-selection-on-menu-close
                           @select="handleSelectGranularity"
        />
    </div>
</template>

<style lang="postcss" scoped>
.metric-explorer-granularity-dropdown {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    .granularity-dropdown {
        min-width: unset;
    }
}

</style>
