<template>
    <p-field-group :label="$t('INVENTORY.COLLECTOR.CREATE.NAME')"
                   :invalid-text="invalidTexts.name"
                   :invalid="invalidState.name"
                   :required="true"
    >
        <template #default="{invalid}">
            <p-text-input :value="name"
                          class="block"
                          :invalid="invalid"
                          :is-focused="state.isFocused"
                          @update:value="setForm('name', $event)"
            />
        </template>
    </p-field-group>
</template>

<script lang="ts" setup>
import {
    reactive, computed, watch, defineExpose,
} from 'vue';

import { PFieldGroup, PTextInput } from '@cloudforet/mirinae';

import { i18n } from '@/translations';

import { useAllReferenceStore } from '@/store/reference/all-reference-store';
import type { CollectorReferenceMap } from '@/store/reference/collector-reference-store';

import { useFormValidator } from '@/common/composables/form-validator';

import { useCollectorFormStore } from '@/services/asset-inventory/stores/collector-form-store';


interface Props {
    loading?: boolean;
}

const allReferenceStore = useAllReferenceStore();

const props = withDefaults(defineProps<Props>(), {
    loading: false,
});

const emits = defineEmits<{(event: 'update-valid', value: boolean): void;
}>();

const collectorFormStore = useCollectorFormStore();
const collectorFormState = collectorFormStore.state;

const state = reactive({
    collectors: computed<CollectorReferenceMap>(() => allReferenceStore.getters.collector),
    collectorNames: computed(() => Object.values(state.collectors).map((item:any) => item.name)),
    isFocused: false,
});

const {
    forms: {
        name,
    },
    setForm,
    invalidState,
    invalidTexts,
    isAllValid,
} = useFormValidator({
    name: collectorFormState.name,
}, {
    name(value: string) {
        if (value.length < 2) {
            return i18n.t('INVENTORY.COLLECTOR.CREATE.NAME_INVALID_MIN');
        } if (state.collectorNames.includes(value) && !props.loading) {
            return i18n.t('INVENTORY.COLLECTOR.CREATE.NAME_INVALID_DUPLICATED');
        }
        return '';
    },
});

watch(name, (value) => {
    collectorFormStore.setName(value);
});

watch(isAllValid, (value) => {
    emits('update-valid', value);
}, { immediate: true });

defineExpose({ focus: () => { state.isFocused = true; } });

</script>

