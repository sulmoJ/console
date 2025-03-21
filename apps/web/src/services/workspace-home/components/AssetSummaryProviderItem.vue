<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useRouter } from 'vue-router/composables';

import { isEmpty } from 'lodash';

import { PLazyImg, PTextButton } from '@cloudforet/mirinae';
import { byteFormatter, numberFormatter } from '@cloudforet/utils';

import { useUserStore } from '@/store/user/user-store';

import type { PageAccessMap } from '@/lib/access-control/config';
import { assetUrlConverter } from '@/lib/helper/asset-helper';
import { MENU_ID } from '@/lib/menu/config';

import { ASSET_INVENTORY_ROUTE_V1 } from '@/services/asset-inventory-v1/routes/route-constant';
import type { ProviderResourceDataItem } from '@/services/workspace-home/types/workspace-home-type';

interface Props {
    item?: ProviderResourceDataItem;
}

const MANAGED_TARGET_TYPE = {
    SERVER: 'server',
    DATABASE: 'database',
    STORAGE: 'storage',
} as const;

const props = withDefaults(defineProps<Props>(), {
    item: undefined,
});

const router = useRouter();

const userStore = useUserStore();
const storeState = reactive({
    pageAccessPermissionMap: computed<PageAccessMap>(() => userStore.getters.pageAccessPermissionMap),
});
const state = reactive({
    accessLink: computed<boolean>(() => !isEmpty(storeState.pageAccessPermissionMap[MENU_ID.METRIC_EXPLORER])),
});
const handleClickButton = (type: string) => {
    if (!state.accessLink) return;
    if (!props.item) return;
    let target = '';
    if (type === MANAGED_TARGET_TYPE.STORAGE) target = `metric-managed-${type}-size`;
    else target = `metric-managed-${type}-count`;

    router.push({
        name: ASSET_INVENTORY_ROUTE_V1.METRIC_EXPLORER.DETAIL._NAME,
        params: { metricId: target, groupBy: props.item.key },
    });
};
</script>

<template>
    <div class="asset-summary-provider-item">
        <div class="title-wrapper">
            <p-lazy-img
                v-if="props.item.icon"
                :src="assetUrlConverter(props.item.icon)"
                width="1.25rem"
                height="1.25rem"
                class="icon"
            />
            <span>{{ props.item.name }}</span>
        </div>
        <div class="data-wrapper">
            <p-text-button class="data-row"
                           :class="{ 'no-access': !state.accessLink }"
                           size="sm"
                           :readonly="!state.accessLink"
                           @click="handleClickButton(MANAGED_TARGET_TYPE.SERVER)"
            >
                <span class="label">{{ $t('HOME.ASSET_SUMMARY_SERVER') }}</span>
                <span>{{ numberFormatter(props.item.server) || 0 }}</span>
            </p-text-button>
            <p-text-button class="data-row"
                           :class="{ 'no-access': !state.accessLink }"
                           size="sm"
                           :readonly="!state.accessLink"
                           @click="handleClickButton(MANAGED_TARGET_TYPE.DATABASE)"
            >
                <span class="label">{{ $t('HOME.ASSET_SUMMARY_DATABASE') }}</span>
                <span>{{ numberFormatter(props.item.database) || 0 }}</span>
            </p-text-button>
            <p-text-button class="data-row"
                           :class="{ 'no-access': !state.accessLink }"
                           size="sm"
                           :readonly="!state.accessLink"
                           @click="handleClickButton(MANAGED_TARGET_TYPE.STORAGE)"
            >
                <span class="label">{{ $t('HOME.ASSET_SUMMARY_STORAGE') }}</span>
                <span>{{ byteFormatter(props.item.storage) || 0 }}</span>
            </p-text-button>
        </div>
    </div>
</template>

<style scoped lang="postcss">
.asset-summary-provider-item {
    @apply flex flex-col bg-gray-100 border-l-4 border-gray-200 cursor-default;
    min-width: 11.5rem;
    width: 11.5rem;
    height: 7.875rem;
    padding-top: 1rem;
    padding-bottom: 0.75rem;
    gap: 0.75rem;
    border-radius: 0.375rem;
    .title-wrapper {
        @apply flex text-label-md;
        gap: 0.375rem;
        padding-right: 1rem;
        padding-left: 1rem;
    }
    .data-wrapper {
        @apply flex flex-col;
        .data-row {
            @apply flex justify-between text-label-sm text-gray-700;
            padding: 0.125rem 1rem;
            &:hover {
                @apply bg-gray-150;
                text-decoration: none;
            }
            .label {
                @apply text-paragraph-sm;
            }
        }
    }
}
</style>
