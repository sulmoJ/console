<script lang="ts" setup>
import { onUnmounted } from 'vue';

import { ApiQueryHelper } from '@cloudforet/core-lib/space-connector/helper';
import { PHorizontalLayout } from '@cloudforet/mirinae';

import { usePageEditableStatus } from '@/common/composables/page-editable-status';

import UserGroupChannelCreateModal from '@/services/iam/components/UserGroupChannelCreateModal.vue';
import UserGroupChannelDeleteDoubleCheckModal
    from '@/services/iam/components/UserGroupChannelDeleteDoubleCheckModal.vue';
import UserGroupChannelSetModal from '@/services/iam/components/UserGroupChannelSetModal.vue';
import UserGroupDeleteDoubleCheckModal from '@/services/iam/components/UserGroupDeleteDoubleCheckModal.vue';
import UserGroupManagementAddUsersModal from '@/services/iam/components/UserGroupManagementAddUsersModal.vue';
import UserGroupManagementEditModal from '@/services/iam/components/UserGroupManagementEditModal.vue';
import UserGroupManagementHeader from '@/services/iam/components/UserGroupManagementHeader.vue';
import UserGroupManagementTab from '@/services/iam/components/UserGroupManagementTab.vue';
import UserGroupManagementTable from '@/services/iam/components/UserGroupManagementTable.vue';
import UserPerGroupRemoveDoubleCheckModal from '@/services/iam/components/UserPerGroupRemoveDoubleCheckModal.vue';
import { useUserGroupPageStore } from '@/services/iam/store/user-group-page-store';

const userGroupPageStore = useUserGroupPageStore();
const userGroupPageState = userGroupPageStore.state;

const { hasReadWriteAccess } = usePageEditableStatus();

const userGroupListApiQueryHelper = new ApiQueryHelper()
    .setSort('name', true);

/* API */
const refreshUserGroupList = async () => {
    userGroupPageState.loading = true;
    userGroupListApiQueryHelper
        .setPageStart(userGroupPageState.pageStart).setPageLimit(userGroupPageState.pageLimit)
        .setFilters(userGroupPageState.searchFilters);
    try {
        await userGroupPageStore.listUserGroups({ query: userGroupListApiQueryHelper.data });
    } finally {
        userGroupPageState.loading = false;
    }
};

onUnmounted(() => {
    userGroupPageStore.reset();
});
</script>

<template>
    <section class="user-group-page">
        <user-group-management-header :has-read-write-access="hasReadWriteAccess" />
        <p-horizontal-layout class="user-group-toolbox-layout">
            <template #container="{height}">
                <user-group-management-table :table-height="height"
                                             :has-read-write-access="hasReadWriteAccess"
                />
            </template>
        </p-horizontal-layout>
        <user-group-management-tab :has-read-write-access="hasReadWriteAccess" />
        <user-group-management-edit-modal v-if="hasReadWriteAccess"
                                          @confirm="refreshUserGroupList"
        />
        <user-group-management-add-users-modal v-if="hasReadWriteAccess"
                                               @confirm="refreshUserGroupList"
        />
        <user-group-delete-double-check-modal v-if="hasReadWriteAccess"
                                              @confirm="refreshUserGroupList"
        />
        <user-per-group-remove-double-check-modal v-if="hasReadWriteAccess"
                                                  @confirm="refreshUserGroupList"
        />
        <user-group-channel-create-modal v-if="hasReadWriteAccess" />
        <user-group-channel-set-modal v-if="hasReadWriteAccess"
                                      @confirm="refreshUserGroupList"
        />
        <user-group-channel-delete-double-check-modal @confirm="refreshUserGroupList" />
    </section>
</template>

<style scoped lang="postcss">
.user-group-page {
    @apply mx-0;
    max-width: 100%;
}

:deep(.user-group-toolbox-layout) {
    .horizontal-contents {
        overflow: unset;
    }
}
</style>
