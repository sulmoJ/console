<template>
    <p-button-modal class="collector-schedule-modal"
                    :header-title="state.isViewMode ? $t('INVENTORY.COLLECTOR.MAIN.VIEW_SCHEDULE_MODAL_TITLE') : $t('INVENTORY.COLLECTOR.MAIN.COLLECTOR_SCHEDULE')"
                    size="md"
                    fade
                    backdrop
                    :visible="collectorPageState.visible.scheduleModal"
                    :hide-footer-close-button="state.isViewMode"
                    @close="handleCloseModal"
                    @cancel="handleCloseModal"
                    @confirm="handleConfirm"
    >
        <template #body>
            <collector-schedule-form :readonly="state.isViewMode" />
        </template>
        <template v-if="state.isViewMode"
                  #confirm-button
        >
            {{ $t('APP.MAIN.OK') }}
        </template>
    </p-button-modal>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';

import { PButtonModal } from '@cloudforet/mirinae';

import type { CollectorUpdateParameters } from '@/schema/inventory/collector/api-verbs/update';
import type { CollectorModel } from '@/schema/inventory/collector/model';
import { i18n as i18nTranslator } from '@/translations';

import ErrorHandler from '@/common/composables/error/errorHandler';

import CollectorScheduleForm
    from '@/services/asset-inventory-v1/components/CollectorFormSchedule.vue';
import { useCollectorFormStore } from '@/services/asset-inventory-v1/stores/collector-form-store';
import { useCollectorPageStore } from '@/services/asset-inventory-v1/stores/collector-page-store';


const collectorPageStore = useCollectorPageStore();
const collectorPageState = collectorPageStore.state;
const collectorFormStore = useCollectorFormStore();
const collectorFormState = collectorFormStore.state;

const emit = defineEmits<{(e: 'refresh-collector-list'): void}>();

const state = reactive({
    isViewMode: computed(() => collectorPageState.scheduleModalMode === 'view'),
});

/* Components */

const closeScheduleModal = () => {
    collectorPageState.visible.scheduleModal = false;
};

const handleCloseModal = () => {
    closeScheduleModal();
};
const handleConfirm = async () => {
    if (state.isViewMode) {
        closeScheduleModal();
        return;
    }
    try {
        await fetchCollectorUpdate();
        handleCloseModal();
        emit('refresh-collector-list');
    } catch (e) {
        collectorFormStore.resetSchedulePower();
        ErrorHandler.handleRequestError(e, i18nTranslator.t('INVENTORY.COLLECTOR.ALT_E_UPDATE_SCHEDULE'));
    }
};

/* API */
const fetchCollectorUpdate = async (): Promise<CollectorModel|undefined> => {
    if (!collectorFormState.collectorId) throw new Error('collector_id is not defined');
    const params: CollectorUpdateParameters = {
        collector_id: collectorFormState.collectorId,
        schedule: {
            hours: collectorFormState.scheduleHours || [],
            state: collectorFormState.schedulePower ? 'ENABLED' : 'DISABLED',
        },
    };
    return collectorPageStore.updateCollectorSchedule(params);
};

/* Watcher */
watch(() => collectorPageState.selectedCollector, async (value) => {
    await collectorFormStore.setOriginCollector(value);
}, { immediate: true });
</script>
