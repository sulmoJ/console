<template>
    <div class="collector-options-form">
        <p-field-title class="additional-options-label"
                       size="lg"
                       :label="$t('INVENTORY.COLLECTOR.ADDITIONAL_OPTIONS')"
        />
        <p-data-loader class="collector-options-form-contents"
                       :loading="state.loading"
                       :data="state.schema"
                       loader-backdrop-color="0"
        >
            <p-json-schema-form :schema="state.schema"
                                :form-data="collectorFormState.options"
                                :language="state.language"
                                use-fixed-menu-style
                                reset-on-schema-change
                                uniform-width
                                @change="handleUpdateSchemaForm"
            />
            <template #no-data>
                <div v-if="state.isLoadFailed"
                     class="error-box"
                >
                    <div class="error-message">
                        <p-i width="1.25rem"
                             height="1.25rem"
                             name="ic_error-filled"
                             :color="red[400]"
                        /><span>{{ $t('INVENTORY.COLLECTOR.CREATE.FORM_LOAD_FAILED') }}</span>
                    </div>
                    <p-button style-type="tertiary"
                              icon-left="ic_refresh"
                              @click="handleClickReloadButton"
                    >
                        {{ $t('INVENTORY.COLLECTOR.CREATE.RELOAD') }}
                    </p-button>
                </div>
                <div v-else
                     class="no-data-box"
                >
                    {{ $t('INVENTORY.COLLECTOR.NO_OPTIONS') }}
                </div>
            </template>
            <template #loader>
                <div class="loading-box">
                    <div class="loading-spinner">
                        <p-spinner size="xl" />
                    </div>
                    <div class="loading-description">
                        <p>{{ $t('INVENTORY.COLLECTOR.CREATE.LOADING_DESC1') }}</p>
                        <p>{{ $t('INVENTORY.COLLECTOR.CREATE.LOADING_DESC2') }}</p>
                    </div>
                </div>
            </template>
        </p-data-loader>
    </div>
</template>

<script lang="ts" setup>
import {
    defineProps, computed, reactive, watch,
} from 'vue';

import { isEmpty } from 'lodash';

import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import {
    PJsonSchemaForm, PButton, PI, PDataLoader, PFieldTitle, PSpinner,
} from '@cloudforet/mirinae';
import type { JsonSchema } from '@cloudforet/mirinae/types/controls/forms/json-schema-form/type';

import type {
    GetPluginMetadataParameters,
    GetPluginMetadataResponse,
} from '@/schema/plugin/plugin/api-verbs/get-plugin-metadata';

import { useUserStore } from '@/store/user/user-store';

import ErrorHandler from '@/common/composables/error/errorHandler';

import { red } from '@/styles/colors';

import {
    useCollectorFormStore,
} from '@/services/asset-inventory/stores/collector-form-store';


const collectorFormStore = useCollectorFormStore();
const collectorFormState = collectorFormStore.state;
const userStore = useUserStore();

const props = defineProps<{
    hasMetadata?: boolean; // MEMO: if true, use metadata(state.schema) of collectorFormState.originCollector. And if false, call api for get metadata(state.schema).
    showTitleOnEmptySchema?: boolean;
    resetOnCollectorIdChange?: boolean;
}>();
const emit = defineEmits<{(e: 'update:isValid', isValid: boolean): void;}>();

const state = reactive({
    isSchemaEmpty: computed<boolean>(() => isEmpty(state.schema) && !state.isLoadFailed),
    loading: false,
    isLoadFailed: false,
    pluginId: computed<string|undefined>(() => collectorFormState.repositoryPlugin?.plugin_id),
    schema: null as null|JsonSchema|object,
    language: computed<string|undefined>(() => userStore.state.language),
});

const fetchGetPluginMetadata = (provider: string|undefined): Promise<GetPluginMetadataResponse> => {
    const options = provider ? {
        provider,
    } : {};
    return SpaceConnector.clientV2.plugin.plugin.getPluginMetadata<GetPluginMetadataParameters, GetPluginMetadataResponse>({
        plugin_id: state.pluginId,
        version: collectorFormState.version,
        options,
    });
};

const getPluginMetadata = async (provider: string|undefined) => {
    try {
        state.loading = true;
        state.isLoadFailed = false;
        if (!props.hasMetadata) {
            const res = await fetchGetPluginMetadata(provider);
            state.schema = res.metadata?.options_schema ?? {};
            if (state.isSchemaEmpty) {
                emit('update:isValid', true);
            }
        } else {
            state.schema = collectorFormState.originCollector?.plugin_info?.metadata?.options_schema ?? {};
        }
    } catch (e) {
        ErrorHandler.handleError(e);
        state.schema = {};
        state.isLoadFailed = true;
        emit('update:isValid', false);
    } finally {
        state.loading = false;
    }
};

const handleUpdateSchemaForm = (isValid:boolean, value) => {
    if (state.isSchemaEmpty && !state.loading) {
        emit('update:isValid', true);
    } else {
        emit('update:isValid', isValid);
    }
    collectorFormStore.setOptions(value);
};

const handleClickReloadButton = () => {
    getPluginMetadata(collectorFormState.provider);
};


watch(() => collectorFormState.collectorId, async (collectorId) => {
    if (props.resetOnCollectorIdChange && !collectorId) return;
    collectorFormStore.resetAttachedServiceAccount();
    await getPluginMetadata(collectorFormState.provider);
}, { immediate: true });

watch(() => collectorFormState.provider, async (provider) => {
    // CAUTION: Do not change the order of the following two lines. The form data(options) must be reset after the schema has been updated.
    await getPluginMetadata(provider);
    collectorFormStore.resetOptions();
});

</script>

<style lang="postcss" scoped>

.collector-options-form {
    .additional-options-label {
        margin-bottom: 0.5rem;
    }

    .collector-options-form-contents {
        min-height: 7rem;

        @apply border rounded-xl border-gray-200;
        padding: 1rem;

        .error-box {
            @apply flex flex-col items-center justify-center w-full;

            .error-message {
                @apply flex items-center gap-2 mb-4 font-bold text-label-md text-gray-700;
            }
        }

        .no-data-box {
            @apply flex justify-center items-center;
            height: 7rem;
        }

        .loading-box {
            .loading-spinner {
                @apply flex flex-col justify-center items-center w-full;
                margin-bottom: 1rem;
            }

            .loading-description {
                @apply text-paragraph-md text-gray-500;
                text-align: center;
            }
        }
    }
}
</style>

