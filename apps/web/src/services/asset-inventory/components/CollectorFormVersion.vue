<template>
    <div class="collector-version-form">
        <div class="label-row">
            <p-field-title>{{ $t('INVENTORY.COLLECTOR.CREATE.VERSION_LABEL') }}</p-field-title>
            <p-field-title font-weight="regular"
                           size="sm"
                           color="gray"
                           :label="$t('INVENTORY.COLLECTOR.CREATE.AUTO_UPGRADE_LABEL')"
            >
                <template #right>
                    <p-toggle-button :value="collectorFormState.autoUpgrade"
                                     @change-toggle="handleClickAutoUpgrade"
                    />
                </template>
            </p-field-title>
        </div>
        <p-select-dropdown :selected="collectorFormState.version"
                           :menu="state.versionItems"
                           :disabled="collectorFormState.autoUpgrade"
                           class="w-full"
                           @update:selected="handleChangeVersion"
        />
        <div v-show="state.isVersionValid && !collectorFormState.autoUpgrade"
             class="invalid-feedback"
        >
            {{ state.versionInvalidText }}
        </div>
    </div>
</template>

<script lang="ts" setup>

import { computed, reactive, watch } from 'vue';
import type { TranslateResult } from 'vue-i18n';

import {
    PFieldTitle, PToggleButton, PSelectDropdown,
} from '@cloudforet/mirinae';
import type { MenuItem } from '@cloudforet/mirinae/types/controls/context-menu/type';

import { i18n } from '@/translations';

import { useCollectorFormStore } from '@/services/asset-inventory/stores/collector-form-store';

const collectorFormStore = useCollectorFormStore();
const collectorFormState = collectorFormStore.state;

const props = defineProps<{
    getVersionsOnPluginIdChange?: boolean;
}>();

const emit = defineEmits<{(event: 'update-valid', value: boolean): void;
}>();

const state = reactive({
    pluginId: computed<string|undefined>(() => collectorFormState.pluginId),
    versionItems: computed<MenuItem[]>(() => collectorFormState.versions.map((value, index) => {
        if (index === 0) return { type: 'item', label: `${value} (latest)`, name: value };
        return { type: 'item', label: value, name: value };
    })),
    versionInvalidText: computed<TranslateResult>(() => {
        const value = collectorFormState.version;
        if (!value?.length) {
            return i18n.t('INVENTORY.COLLECTOR.CREATE.VERSION_INVALID_REQUIRED');
        }
        return '';
    }),
    isVersionValid: computed(() => !state.versionInvalidText || collectorFormState.autoUpgrade),
});

const initSelectedVersion = () => {
    if (collectorFormState.originCollector) {
        const originAutoUpgrade = collectorFormState.originCollector?.plugin_info?.upgrade_mode === 'AUTO';
        const originVersion = collectorFormState.originCollector?.plugin_info?.version;
        collectorFormStore.$patch((_state) => {
            _state.state.version = originVersion ?? collectorFormState.versions[0] ?? '';
            _state.state.autoUpgrade = originAutoUpgrade ?? true;
        });
    } else {
        collectorFormStore.$patch((_state) => {
            _state.state.version = collectorFormState.versions[0] ?? '';
            _state.state.autoUpgrade = true;
        });
    }
};

/* event */
const handleChangeVersion = (value: string) => {
    collectorFormStore.setVersion(value);
};

const handleClickAutoUpgrade = () => {
    collectorFormStore.setAutoUpgrade(!collectorFormState.autoUpgrade);
    if (collectorFormState.autoUpgrade) {
        collectorFormStore.setVersion(collectorFormState.versions[0] ?? '');
    }
};

watch(() => state.isVersionValid, (value) => {
    emit('update-valid', value);
}, { immediate: true });

// get version list when pluginId changed and init selected version
watch(() => state.pluginId, async (pluginId) => {
    if (!pluginId) return;
    if (props.getVersionsOnPluginIdChange) await collectorFormStore.getVersions(pluginId);
    initSelectedVersion();
}, { immediate: true });
</script>

<style lang="postcss" scoped>
.collector-version-form {
    margin: 1.5rem 0;
    max-width: 728px;

    .label-row {
        @apply flex justify-between;
        width: 100%;
        margin-bottom: 0.25rem;
    }

    .invalid-feedback {
        @apply text-alert;
        font-size: 0.75rem;
        line-height: 0.875rem;
        margin-top: 0.25rem;
    }
}

</style>
