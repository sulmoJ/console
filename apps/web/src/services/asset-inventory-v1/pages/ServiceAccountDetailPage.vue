<script setup lang="ts">
import {
    computed, onMounted, reactive, watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router/composables';

import { render } from 'ejs';
import { clone } from 'lodash';

import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import {
    PLink, PButton, PIconButton, PHeading, PLazyImg, PHeadingLayout,
} from '@cloudforet/mirinae';
import { ACTION_ICON } from '@cloudforet/mirinae/src/navigation/link/type';


import { ROLE_TYPE } from '@/schema/identity/role/constant';
import type { ServiceAccountGetParameters } from '@/schema/identity/service-account/api-verbs/get';
import { ACCOUNT_TYPE } from '@/schema/identity/service-account/constant';
import type { ServiceAccountModel } from '@/schema/identity/service-account/model';
import type { TrustedAccountGetParameters } from '@/schema/identity/trusted-account/api-verbs/get';
import type { TrustedAccountModel } from '@/schema/identity/trusted-account/model';

import { useAppContextStore } from '@/store/app-context/app-context-store';
import { useAllReferenceStore } from '@/store/reference/all-reference-store';
import type { ProjectReferenceMap } from '@/store/reference/project-reference-store';
import type { ProviderReferenceMap } from '@/store/reference/provider-reference-store';
import { useUserStore } from '@/store/user/user-store';

import type { PageAccessMap } from '@/lib/access-control/config';
import type { MenuId } from '@/lib/menu/config';
import { MENU_ID } from '@/lib/menu/config';

import ErrorHandler from '@/common/composables/error/errorHandler';
import { useProperRouteLocation } from '@/common/composables/proper-route-location';

import ServiceAccountAttachedGeneralAccounts
    from '@/services/asset-inventory-v1/components/ServiceAccountAttachedGeneralAccounts.vue';
import ServiceAccountAutoSync from '@/services/asset-inventory-v1/components/ServiceAccountAutoSync.vue';
import ServiceAccountBaseInformation
    from '@/services/asset-inventory-v1/components/ServiceAccountBaseInformation.vue';
import ServiceAccountCluster from '@/services/asset-inventory-v1/components/ServiceAccountCluster.vue';
import ServiceAccountCredentials
    from '@/services/asset-inventory-v1/components/ServiceAccountCredentials.vue';
import ServiceAccountDeleteModal
    from '@/services/asset-inventory-v1/components/ServiceAccountDeleteModal.vue';
import ServiceAccountEditModal from '@/services/asset-inventory-v1/components/ServiceAccountEditModal.vue';
import { ASSET_INVENTORY_ROUTE_V1 } from '@/services/asset-inventory-v1/routes/route-constant';
import { useServiceAccountPageStore } from '@/services/asset-inventory-v1/stores/service-account-page-store';
import { useServiceAccountSchemaStore } from '@/services/asset-inventory-v1/stores/service-account-schema-store';
import { COST_EXPLORER_ROUTE } from '@/services/cost-explorer/routes/route-constant';

const router = useRouter();

const props = defineProps<{
    serviceAccountId?: string;
}>();

const serviceAccountSchemaStore = useServiceAccountSchemaStore();
const serviceAccountPageStore = useServiceAccountPageStore();
const allReferenceStore = useAllReferenceStore();
const appContextStore = useAppContextStore();
const userStore = useUserStore();
const { getProperRouteLocation } = useProperRouteLocation();

const route = useRoute();

const storeState = reactive({
    providers: computed<ProviderReferenceMap>(() => allReferenceStore.getters.provider),
    project: computed<ProjectReferenceMap>(() => allReferenceStore.getters.project),
    providerExternalLink: computed(() => (state.serviceAccountType === ACCOUNT_TYPE.TRUSTED
        ? serviceAccountSchemaStore.getters.trustedAccountSchema?.options?.external_link
        : serviceAccountSchemaStore.getters.generalAccountSchema?.options?.external_link)),
    isAdminMode: computed(() => appContextStore.getters.isAdminMode),
    isWorkspaceMember: computed(() => userStore.state.currentRoleInfo?.roleType === ROLE_TYPE.WORKSPACE_MEMBER),
    pageAccessPermissionMap: computed<PageAccessMap>(() => userStore.getters.pageAccessPermissionMap),
});
const state = reactive({
    loading: true,
    selectedMenuId: computed(() => {
        const reversedMatched = clone(route.matched).reverse();
        const closestRoute = reversedMatched.find((d) => d.meta?.menuId !== undefined);
        const targetMenuId: MenuId = closestRoute?.meta?.menuId || MENU_ID.WORKSPACE_HOME;
        if (route.name === COST_EXPLORER_ROUTE.LANDING._NAME) {
            return '';
        }
        return targetMenuId;
    }),
    hasReadWriteAccess: computed<boolean|undefined>(() => storeState.pageAccessPermissionMap[state.selectedMenuId]?.write),
    originServiceAccountItem: computed(() => serviceAccountPageStore.state.originServiceAccountItem),
    serviceAccountType: computed(() => serviceAccountPageStore.state.serviceAccountType),
    isTrustedAccount: computed(() => state.serviceAccountType === ACCOUNT_TYPE.TRUSTED),
    attachedGeneralAccounts: [] as ServiceAccountModel[],
    providerId: computed(() => state.originServiceAccountItem?.provider),
    provider: computed(() => {
        if (!state.loading) {
            return storeState.providers[state.providerId] || undefined;
        }
        return undefined;
    }),
    providerKey: computed(() => state.provider?.key),
    providerIcon: computed(() => state.provider?.icon),
    isKubernetesAgentMode: computed(() => state.providerKey === 'kubernetes'),
    consoleLink: computed(() => {
        try {
            if (storeState.providerExternalLink) return render(storeState.providerExternalLink, state.originServiceAccountItem);
        } catch (e) {
            console.warn('Failed to render external link. Please check the accountID value.');
            return '';
        }
        return '';
    }),
    deleteModalVisible: false,
    editModalVisible: false,
    isManagedTrustedAccount: computed(() => state.originServiceAccountItem.workspace_id === '*'),
    isEditable: computed<boolean>(() => state.hasReadWriteAccess && (!state.isManagedTrustedAccount || storeState.isAdminMode)),
});

/* Api */
const getAccount = async (serviceAccountId: string) => {
    state.loading = true;
    try {
        let item;
        if (state.isTrustedAccount) {
            item = await SpaceConnector.clientV2.identity.trustedAccount.get<TrustedAccountGetParameters, TrustedAccountModel>({
                trusted_account_id: serviceAccountId,
            });
        } else {
            item = await SpaceConnector.clientV2.identity.serviceAccount.get<ServiceAccountGetParameters, ServiceAccountModel>({
                service_account_id: serviceAccountId,
            });
        }
        serviceAccountPageStore.$patch((_state) => {
            _state.state.originServiceAccountItem = item;
        });
    } catch (e) {
        ErrorHandler.handleError(e);
        serviceAccountPageStore.$patch((_state) => {
            _state.state.originServiceAccountItem = {};
        });
    } finally {
        state.loading = false;
    }
};

/* Event */
const handleOpenDeleteModal = () => {
    state.deleteModalVisible = true;
};

const handleClickEditButton = () => {
    state.editModalVisible = true;
};
const handleRefresh = () => {
    if (props.serviceAccountId) getAccount(props.serviceAccountId);
};
const handleClickBackbutton = () => {
    router.push(getProperRouteLocation({
        name: ASSET_INVENTORY_ROUTE_V1.SERVICE_ACCOUNT._NAME, query: { provider: state.providerKey },
    }));
};

onMounted(async () => {
    if (storeState.isWorkspaceMember) return;
    await serviceAccountPageStore.fetchCostReportConfig();
});

watch(() => state.providerId, async (provider) => {
    serviceAccountPageStore.setProvider(provider ?? '');
    await serviceAccountSchemaStore.setProviderSchema(provider ?? '');
});
/* Watcher */
watch(() => props.serviceAccountId, async (serviceAccountId) => {
    if (serviceAccountId) {
        const serviceAccountType = (serviceAccountId?.startsWith('ta') ? ACCOUNT_TYPE.TRUSTED : ACCOUNT_TYPE.GENERAL);
        serviceAccountPageStore.$patch((_state) => {
            _state.state.serviceAccountType = serviceAccountType;
        });
        await getAccount(serviceAccountId);
    }
}, { immediate: true });

</script>

<template>
    <div class="service-account-detail-page">
        <p-heading-layout class="mb-6">
            <template #heading>
                <p-heading :title="state.originServiceAccountItem.name"
                           show-back-button
                           class="page-title"
                           @click-back-button="handleClickBackbutton"
                >
                    <template #title-left-extra>
                        <p-lazy-img :src="state.providerIcon"
                                    :loading="state.loading"
                                    error-icon="ic_cloud-filled"
                        />
                    </template>
                    <template v-if="state.isEditable"
                              #title-right-extra
                    >
                        <div class="title-right-wrapper">
                            <p-icon-button name="ic_edit-text"
                                           class="w-full delete-button"
                                           @click="handleClickEditButton"
                            />
                            <p-icon-button name="ic_delete"
                                           class="w-full delete-button"
                                           @click="handleOpenDeleteModal"
                            />
                        </div>
                    </template>
                </p-heading>
            </template>
            <template v-if="state.isEditable && state.consoleLink"
                      #extra
            >
                <p-button style-type="tertiary"
                          class="link-button"
                >
                    <p-link :href="state.consoleLink"
                            :action-icon="ACTION_ICON.EXTERNAL_LINK"
                    >
                        {{ $t('INVENTORY.SERVICE_ACCOUNT.DETAIL.CONNECT_TO_CONSOLE') }}
                    </p-link>
                </p-button>
            </template>
        </p-heading-layout>
        <div class="content-wrapper">
            <service-account-base-information :service-account-loading="state.loading"
                                              :service-account-id="props.serviceAccountId"
                                              :editable="state.isEditable"
                                              @refresh="handleRefresh"
            />
            <service-account-attached-general-accounts v-if="state.isTrustedAccount && props.serviceAccountId"
                                                       :service-account-id="props.serviceAccountId"
                                                       :attached-general-accounts.sync="state.attachedGeneralAccounts"
                                                       :has-read-write-access="state.hasReadWriteAccess"
            />
            <service-account-cluster v-if="state.isKubernetesAgentMode"
                                     :service-account-id="props.serviceAccountId"
            />
            <service-account-credentials v-else
                                         :service-account-loading="state.loading"
                                         :service-account-id="props.serviceAccountId"
                                         :editable="state.isEditable"
                                         @refresh="handleRefresh"
            />
            <service-account-auto-sync v-if="state.isTrustedAccount && serviceAccountPageStore.getters.isMainProvider"
                                       :editable="state.isEditable"
                                       @refresh="handleRefresh"
            />
            <!--            TODO: To be implemented after further discussion-->
            <!--            <service-account-usage-overview v-if="!state.isTrustedAccount"-->
            <!--                                            :service-account-loading="state.loading"-->
            <!--                                            :service-account-id="props.serviceAccountId"-->
            <!--            />-->
        </div>
        <service-account-delete-modal :visible.sync="state.deleteModalVisible"
                                      :service-account-type="state.serviceAccountType"
                                      :service-account-data="state.originServiceAccountItem"
                                      :attached-general-accounts="state.attachedGeneralAccounts"
                                      :is-agent-mode="state.isKubernetesAgentMode"
        />
        <service-account-edit-modal v-if="state.originServiceAccountItem?.name"
                                    :key="state.originServiceAccountItem?.name"
                                    :visible.sync="state.editModalVisible"
                                    :is-trusted-account="state.isTrustedAccount"
                                    :service-account="state.originServiceAccountItem"
        />
    </div>
</template>

<style lang="postcss" scoped>
.service-account-detail-page {
    .page-title {
        .title-right-wrapper {
            display: inline-flex;
        }
        .link-button {
            /* custom design-system component - p-link */
            :deep(.p-link) {
                .text:hover {
                    text-decoration: none;
                }
            }
        }
    }
    .content-wrapper {
        @apply grid-cols-12;
        display: grid;
        gap: 1rem;
        .service-account-account-type {
            @apply col-span-6;
            .badge-wrapper {
                padding: 0 1rem 2.5rem 1rem;
            }
        }
        .service-account-project {
            @apply col-span-6;
        }
        .service-account-attached-general-accounts {
            @apply col-span-12;
        }
        .service-account-base-information {
            @apply col-span-12;
        }
        .service-account-connect-cluster {
            @apply col-span-12;
        }
        .service-account-credentials {
            @apply col-span-12;
        }
        .service-account-usage-overview {
            @apply col-span-12;
        }
    }

    @screen mobile {
        .content-wrapper {
            .service-account-account-type {
                @apply col-span-12;
            }
            .service-account-project {
                @apply col-span-12;
            }
        }
    }
}
</style>
