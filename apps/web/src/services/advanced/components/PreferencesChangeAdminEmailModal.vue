<script setup lang="ts">
import { reactive, watch } from 'vue';

import {
    PButton, PButtonModal, PFieldGroup, PTextInput,
} from '@cloudforet/mirinae';

import { i18n } from '@/translations';

import { useDomainConfigStore } from '@/store/config/domain-config-store';

import { showSuccessMessage } from '@/lib/helper/notice-alert-helper';
import { emailValidator } from '@/lib/helper/user-validation-helper';

import ErrorHandler from '@/common/composables/error/errorHandler';
import { useFormValidator } from '@/common/composables/form-validator';
import { useProxyValue } from '@/common/composables/proxy-state';


interface Props {
    visible?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
    visible: false,
});
const emit = defineEmits<{(e: 'update:visible', value: boolean): void;
    (e: 'confirm'): void;
}>();

const domainConfigStore = useDomainConfigStore();
const state = reactive({
    proxyVisible: useProxyValue('visible', props, emit),
    loading: false,
    isCodeSent: false,
});
const {
    forms: { adminEmail, verificationCode },
    invalidState,
    invalidTexts,
    setForm, isAllValid,
    initForm,
} = useFormValidator({
    adminEmail: '',
    verificationCode: '',
}, {
    adminEmail(value: string) { return !emailValidator(value) ? '' : i18n.t('IAM.DOMAIN_SETTINGS.EMAIL_INVALID'); },
    verificationCode(value: string) { return value.trim() ? '' : i18n.t('IAM.DOMAIN_SETTINGS.VERIFICATION_CODE_INVALID'); },
});

const handleClickSendCode = () => {
    // HACK: send verification code to admin email
    state.isCodeSent = true;
};
const confirm = async () => {
    try {
        await domainConfigStore.updatePreferences({
            admin_email: adminEmail.value,
        });
        showSuccessMessage(i18n.t('IAM.DOMAIN_SETTINGS.ALT_S_UPDATE_ADMIN_EMAIL'), '');
    } catch (e) {
        ErrorHandler.handleRequestError(e, i18n.t('IAM.DOMAIN_SETTINGS.ALT_E_UPDATE_ADMIN_EMAIL'));
    }
};

watch(() => props.visible, (value) => {
    if (value) initForm();
});
</script>

<template>
    <p-button-modal :header-title="$t('IAM.DOMAIN_SETTINGS.CHANGE_ADMIN_EMAIL')"
                    centered
                    size="sm"
                    fade
                    backdrop
                    :visible.sync="state.proxyVisible"
                    :disabled="state.loading || !isAllValid"
                    @confirm="confirm"
    >
        <template #body>
            <p-field-group :label="$t('IAM.DOMAIN_SETTINGS.ADMIN_EMAIL')"
                           :invalid-text="invalidTexts.adminEmail"
                           :invalid="invalidState.adminEmail"
                           required
            >
                <template #default="{invalid}">
                    <div class="field-content">
                        <p-text-input :value="adminEmail"
                                      class="block w-full"
                                      :invalid="invalid"
                                      placeholder="existing@email.com"
                                      @update:value="setForm('adminEmail', $event)"
                        />
                        <p-button class="ml-2"
                                  :disabled="!adminEmail || invalid || state.isCodeSent"
                                  @click="handleClickSendCode"
                        >
                            {{ $t('IAM.DOMAIN_SETTINGS.SEND_CODE') }}
                        </p-button>
                    </div>
                </template>
            </p-field-group>
            <p-field-group :label="$t('IAM.DOMAIN_SETTINGS.VERIFICATION_CODE')"
                           :invalid-text="invalidTexts.verificationCode"
                           :invalid="invalidState.verificationCode"
                           required
            >
                <template #default="{invalid}">
                    <p-text-input :value="verificationCode"
                                  class="block w-full"
                                  :invalid="invalid"
                                  :disabled="!state.isCodeSent"
                                  @update:value="setForm('verificationCode', $event)"
                    />
                </template>
            </p-field-group>
        </template>
    </p-button-modal>
</template>

<style lang="postcss" scoped>
.field-content {
    display: flex;
    align-items: center;
}
</style>
