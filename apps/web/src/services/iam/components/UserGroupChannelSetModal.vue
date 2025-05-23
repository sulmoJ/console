<script lang="ts" setup>
import {
    computed, reactive, ref, watch,
} from 'vue';

import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import { PButtonModal, PButton, PLazyImg } from '@cloudforet/mirinae';

import type { NotificationProtocolModel } from '@/schema/alert-manager/notification-protocol/model';
import type { UserGroupChannelCreateParameters } from '@/schema/alert-manager/user-group-channel/api-verbs/create';
import type { UserGroupChannelUpdateParameters } from '@/schema/alert-manager/user-group-channel/api-verbs/update';
import type { UserGroupChannelModel } from '@/schema/alert-manager/user-group-channel/model';
import type {
    UserGroupChannelScheduleInfoType,
} from '@/schema/alert-manager/user-group-channel/type';
import { i18n } from '@/translations';

import { assetUrlConverter } from '@/lib/helper/asset-helper';
import { showSuccessMessage } from '@/lib/helper/notice-alert-helper';

import ErrorHandler from '@/common/composables/error/errorHandler';

import UserGroupChannelScheduleSetForm from '@/services/iam/components/UserGroupChannelScheduleSetForm.vue';
import UserGroupChannelSetInputForm from '@/services/iam/components/UserGroupChannelSetInputForm.vue';
import { USER_GROUP_MODAL_TYPE } from '@/services/iam/constants/user-group-constant';
import { useNotificationChannelCreateFormStore } from '@/services/iam/store/notification-channel-create-form-store';
import { useUserGroupPageStore } from '@/services/iam/store/user-group-page-store';

const userGroupPageStore = useUserGroupPageStore();
const userGroupPageState = userGroupPageStore.state;
const userGroupPageGetters = userGroupPageStore.getters;

const notificationChannelCreateFormStore = useNotificationChannelCreateFormStore();
const notificationChannelCreateFormState = notificationChannelCreateFormStore.state;

const emit = defineEmits<{(e: 'confirm'): void; }>();

interface ChannelSetModalState {
  loading: boolean;
  channelName: string;
  selectedProtocolData?: NotificationProtocolModel | undefined,
  scheduleInfo: UserGroupChannelScheduleInfoType;
}

const isCreateAble = ref<boolean>(false);
const isSchemaValid = ref<boolean>(false);

const storeState = reactive({
    protocolIcon: computed<string>(() => notificationChannelCreateFormState.selectedProtocol.icon),
    protocolName: computed<string>(() => notificationChannelCreateFormState.selectedProtocol.name),
    protocolId: computed<string>(() => notificationChannelCreateFormState.selectedProtocol.protocol_id),
});

const state = reactive<ChannelSetModalState>({
    loading: false,
    channelName: '',
    selectedProtocolData: {},
    scheduleInfo: notificationChannelCreateFormState.scheduleInfo,
});

/* Component */
const handleChannelName = (value: string) => {
    state.channelName = value;
};

const handleSchemaValid = (value: boolean) => {
    if (userGroupPageState.modal.title === i18n.t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.TITLE')) {
        isSchemaValid.value = value;
    } else {
        isSchemaValid.value = true;
    }
};

const handleConfirm = async () => {
    try {
        state.loading = true;
        if (userGroupPageState.modal.title === i18n.t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.TITLE')) {
            await fetchCreateUserGroupChannel({
                protocol_id: notificationChannelCreateFormState.selectedProtocol.protocol_id,
                name: state.channelName,
                schedule: notificationChannelCreateFormState.scheduleInfo,
                data: {
                    ...notificationChannelCreateFormState.protocolSchemaForm,
                },
                tags: {},
                user_group_id: userGroupPageGetters.selectedUserGroups[0].user_group_id,
            });
            emit('confirm');
            showSuccessMessage('', i18n.t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.SUCCESS_MESSAGE'));
        } else if (userGroupPageState.modal.title === i18n.t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.UPDATE_TITLE')) {
            await fetchUpdateUserGroupChannel({
                channel_id: userGroupPageGetters.selectedUserGroupChannel[0].channel_id,
                name: state.channelName,
                data: {},
                schedule: notificationChannelCreateFormState.scheduleInfo,
            });
            emit('confirm');
            showSuccessMessage('', i18n.t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.UPDATE_SUCCESS_MESSAGE'));
        }
    } finally {
        state.loading = false;
        notificationChannelCreateFormStore.initState();
        userGroupPageState.modal = {
            type: '',
            title: '',
            themeColor: 'primary',
        };
    }
};

const handleCancel = () => {
    if (userGroupPageState.modal.title === i18n.t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.TITLE')) {
        userGroupPageState.modal = {
            type: USER_GROUP_MODAL_TYPE.CREATE_NOTIFICATIONS_FIRST,
            title: i18n.t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.TITLE'),
            themeColor: 'primary1',
        };
        notificationChannelCreateFormStore.initState();
    } else {
        handleClose();
    }
};

const handleClose = () => {
    notificationChannelCreateFormStore.initState();
    userGroupPageState.modal = {
        type: '',
        title: '',
        themeColor: 'primary',
    };
};

/* API */
const fetchCreateUserGroupChannel = async (params: UserGroupChannelCreateParameters) => {
    try {
        return await SpaceConnector.clientV2.alertManager.userGroupChannel.create<UserGroupChannelCreateParameters, UserGroupChannelModel>(params);
    } catch (e) {
        ErrorHandler.handleError(e, true);
        return {};
    }
};

const fetchUpdateUserGroupChannel = async (params: UserGroupChannelUpdateParameters) => {
    try {
        return await SpaceConnector.clientV2.alertManager.userGroupChannel.update<UserGroupChannelUpdateParameters, UserGroupChannelModel>(params);
    } catch (e) {
        ErrorHandler.handleError(e, true);
        return {};
    }
};

/* Watcher */
watch([() => notificationChannelCreateFormState, isSchemaValid], (nv_channel_state, nv_is_schema_valid) => {
    // isCreateAble.value = !!nv_channel_state.channelName;
    isCreateAble.value = !!(nv_channel_state && nv_is_schema_valid);
}, { immediate: true, deep: true });
</script>

<template>
    <div>
        <p-button-modal size="md"
                        :visible="userGroupPageState.modal.type === USER_GROUP_MODAL_TYPE.CREATE_NOTIFICATIONS_SECOND"
                        :header-title="userGroupPageState.modal.title"
                        :theme-color="userGroupPageState.modal.themeColor"
                        :disabled="!isSchemaValid"
                        @confirm="handleConfirm"
                        @cancel="handleCancel"
                        @close="handleClose"
        >
            <template #body>
                <div v-if="userGroupPageState.modal.title === i18n.t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.TITLE')"
                     class="flex flex-col gap-1 mb-8"
                >
                    <p class="text-xs">
                        <span>Step 2</span>
                        <span class="text-gray-500">/2</span>
                    </p>
                    <span class="text-gray-700 leading-4 text-sm">{{ $t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.DESC.INFO') }}</span>
                </div>
                <div class="flex items-center gap-4 mb-8">
                    <p-lazy-img :src="assetUrlConverter(storeState.protocolIcon)"
                                width="4rem"
                                height="4rem"
                                error-icon="ic_notification-protocol_envelope"
                    />
                    <div class="flex flex-col gap-0.5">
                        <span class="text-lg font-medium">{{ storeState.protocolName }}</span>
                    </div>
                </div>
                <user-group-channel-set-input-form @update-channel-name="handleChannelName"
                                                   @update-valid="handleSchemaValid"
                />
                <user-group-channel-schedule-set-form />
            </template>
            <template v-if="userGroupPageState.modal.title === i18n.t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.TITLE')"
                      #close-button
            >
                <p-button icon-left="ic_arrow-left"
                          style-type="transparent"
                >
                    <span class="text-base">{{ $t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.GO_BACK') }}</span>
                </p-button>
            </template>
            <template #confirm-button>
                <span v-if="userGroupPageState.modal.title === i18n.t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.UPDATE_TITLE')">{{ $t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.UPDATE') }}</span>
                <span v-else>{{ $t('IAM.USER_GROUP.MODAL.CREATE_CHANNEL.CREATE') }}</span>
            </template>
        </p-button-modal>
    </div>
</template>
