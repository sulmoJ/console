<template>
    <div class="collector-page-3">
        <div class="input-form">
            <attached-service-account-form v-if="!isAdminMode"
                                           class="attached-service-account-form"
                                           @update:isAttachedServiceAccountValid="handleChangeIsAttachedServiceAccountValid"
            />
            <collector-form-options show-title-on-empty-schema
                                    @update:isValid="handleChangeIsSchemaFormValid"
            />
        </div>
        <div class="step-footer">
            <p-text-button icon-left="ic_chevron-left"
                           style-type="highlight"
                           class="step-left-text-button"
                           @click="handleClickOtherPluginButton"
            >
                {{ $t('INVENTORY.COLLECTOR.CREATE.SELECT_OTHER_PLUGIN') }}
            </p-text-button>
            <div class="right-area">
                <p-button style-type="transparent"
                          size="lg"
                          @click="handleClickPrevButton"
                >
                    {{ $t('INVENTORY.COLLECTOR.CREATE.PREVIOUS') }}
                </p-button>
                <p-button :disabled="!state.isAllFormValid"
                          style-type="substitutive"
                          icon-right="ic_arrow-right"
                          size="lg"
                          @click="handleClickNextButton"
                >
                    {{ $t('INVENTORY.COLLECTOR.CREATE.CONTINUE') }}
                </p-button>
            </div>
        </div>
        <delete-modal :header-title="$t('INVENTORY.COLLECTOR.CREATE.PREV_MODAL_TITLE')"
                      :visible.sync="state.deleteModalVisible"
                      :contents="$t('INVENTORY.COLLECTOR.CREATE.PREV_MODAL_CONTENT')"
                      @confirm="handleClose"
        />
    </div>
</template>

<script lang="ts" setup>
import { computed, reactive } from 'vue';

import {
    PButton, PTextButton,
} from '@cloudforet/mirinae';

import { useAppContextStore } from '@/store/app-context/app-context-store';

import DeleteModal from '@/common/components/modals/DeleteModal.vue';

import AttachedServiceAccountForm
    from '@/services/asset-inventory-v1/components/CollectorFormAttachedServiceAccount.vue';
import CollectorFormOptions from '@/services/asset-inventory-v1/components/CollectorFormOptions.vue';
import { useCollectorFormStore } from '@/services/asset-inventory-v1/stores/collector-form-store';


const emit = defineEmits([
    'update:currentStep',
]);

const collectorFormStore = useCollectorFormStore();
const collectorFormState = collectorFormStore.state;
const appContextStore = useAppContextStore();
const isAdminMode = computed(() => appContextStore.getters.isAdminMode);


const state = reactive({
    loading: true,
    isAdminMode: computed<boolean>(() => appContextStore.getters.isAdminMode),
    pluginId: computed<string|undefined>(() => collectorFormState.repositoryPlugin?.plugin_id),
    deleteModalVisible: false,
    isAttachedServiceAccountValid: isAdminMode.value,
    isSchemaFormValid: false,
    isAllFormValid: computed<boolean>(() => state.isAttachedServiceAccountValid && state.isSchemaFormValid),
});

/* event */


const handleChangeIsAttachedServiceAccountValid = (isValid: boolean) => {
    state.isAttachedServiceAccountValid = isValid;
};

const handleChangeIsSchemaFormValid = (isValid: boolean) => {
    state.isSchemaFormValid = isValid;
};

const handleClickOtherPluginButton = () => {
    state.deleteModalVisible = true;
};
const handleClickNextButton = () => {
    emit('update:currentStep', 4);
};
const handleClickPrevButton = () => {
    emit('update:currentStep', 2);
};

const handleClose = () => {
    emit('update:currentStep', 1);
};


</script>
<style lang="postcss" scoped>
.collector-page-3 {
    min-width: 40rem;

    .input-form {
        .attached-service-account-form {
            margin-bottom: 2rem;
        }
    }

    .step-footer {
        @apply flex justify-between items-center;
        margin-top: 2rem;

        .right-area {
            @apply flex items-center;
        }
    }
}

@screen mobile {
    .collector-page-3 {
        min-width: unset;
        max-width: 100vw;

        .input-form {
            min-height: unset;
        }

        .step-footer {
            @apply flex justify-between items-center;
            margin-top: 2rem;

            .step-left-text-button {
                display: none;
            }

            .right-area {
                @apply flex justify-between;
                width: 100%;
            }
        }
    }
}
</style>
