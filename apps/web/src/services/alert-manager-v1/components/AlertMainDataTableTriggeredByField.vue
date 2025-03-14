<script setup lang="ts">
import {
    computed, reactive,
} from 'vue';
import type { Location } from 'vue-router';

import { QueryHelper } from '@cloudforet/core-lib/query';
import { PLink } from '@cloudforet/mirinae';
import { ACTION_ICON } from '@cloudforet/mirinae/src/navigation/link/type';



import type { ReferenceItem } from '@/store/reference/type';

import { useProperRouteLocation } from '@/common/composables/proper-route-location';

import { PROJECT_ROUTE } from '@/services/project-v1/routes/route-constant';

const props = defineProps<{
    value?: string;
    projectId?: string;
    disableLink?: boolean;
    webhookReference?: ReferenceItem;
    userReference?: ReferenceItem;
}>();

const queryHelper = new QueryHelper();
const { getProperRouteLocation } = useProperRouteLocation();

const state = reactive({
    webhookLabel: computed<string|undefined>(() => props.webhookReference?.label),
    userLabel: computed<string|undefined>(() => props.userReference?.label),
    label: computed(() => state.webhookLabel || state.userLabel || props.value),
    link: computed<Location|undefined>(() => {
        if (props.disableLink) return undefined;
        if (props.webhookReference) {
            return {
                name: PROJECT_ROUTE.DETAIL.TAB.ALERT._NAME,
                params: {
                    id: props.projectId ?? '',
                },
                query: {
                    tab: 'webhook',
                    filters: queryHelper.setFilters([{ k: 'webhook_id', v: props.value ?? '', o: '=' }]).rawQueryStrings,
                },
            };
        } if (props.userReference) {
            return {
                name: PROJECT_ROUTE.DETAIL.TAB.SUMMARY._NAME,
                params: {
                    id: props.projectId ?? '',
                },
                query: {
                    filters: queryHelper.setFilters([{ v: props.value ?? '' }]).rawQueryStrings,
                },
            };
        }
        return undefined;
    }),
});
</script>

<template>
    <span>
        <p-link v-if="state.link"
                :action-icon="ACTION_ICON.INTERNAL_LINK"
                new-tab
                :to="getProperRouteLocation(state.link)"
        >
            {{ state.label }}
        </p-link>
        <template v-else>
            {{ state.label }}
        </template>
    </span>
</template>
