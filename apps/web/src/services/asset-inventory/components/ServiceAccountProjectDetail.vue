<template>
    <div class="service-account-project-detail">
        <p-link v-if="!!projectName"
                :action-icon="ACTION_ICON.INTERNAL_LINK"
                new-tab
                :to="getProperRouteLocation(projectLink)"
        >
            {{ projectName }}
        </p-link>
        <span v-if="!projectName && serviceAccountType === ACCOUNT_TYPE.TRUSTED">N/A</span>
        <div v-if="!projectName && serviceAccountType === ACCOUNT_TYPE.GENERAL">
            <span>-- <span class="required-span">{{ $t('INVENTORY.SERVICE_ACCOUNT.DETAIL.REQUIRED') }}</span></span>
            <p-tooltip position="bottom"
                       class="project-required-tooltip"
                       :contents="$t('INVENTORY.SERVICE_ACCOUNT.DETAIL.PROJECT_REQUIRED_HELP_TEXT')"
            >
                <p-i name="ic_question-mark-circle-filled"
                     width="1rem"
                     height="1rem"
                />
            </p-tooltip>
        </div>
    </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { computed, reactive, toRefs } from 'vue';

import {
    PLink, PI, PTooltip,
} from '@cloudforet/mirinae';
import { ACTION_ICON } from '@cloudforet/mirinae/src/navigation/link/type';

import { SpaceRouter } from '@/router';
import { ACCOUNT_TYPE } from '@/schema/identity/service-account/constant';
import type { AccountType } from '@/schema/identity/service-account/type';

import { useAllReferenceStore } from '@/store/reference/all-reference-store';

import { referenceRouter } from '@/lib/reference/referenceRouter';

import { useProperRouteLocation } from '@/common/composables/proper-route-location';


export default {
    name: 'ServiceAccountProjectDetail',
    components: {
        PLink,
        PI,
        PTooltip,
    },
    props: {
        projectId: {
            type: String,
            default: undefined,
        },
        serviceAccountType: {
            type: String as PropType<AccountType>,
            default: 'GENERAL',
        },
    },
    setup(props) {
        const { getProperRouteLocation } = useProperRouteLocation();

        const allReferenceStore = useAllReferenceStore();
        const storeState = reactive({
            projects: computed(() => allReferenceStore.getters.project),
        });
        const state = reactive({
            projectName: computed(() => {
                if (props.projectId) return storeState.projects[props.projectId]?.label ?? '';
                return '';
            }),
            projectLink: computed(() => {
                if (props.projectId) {
                    return SpaceRouter.router.resolve(referenceRouter(props.projectId, {
                        resource_type: 'identity.Project',
                    })).resolved;
                }
                return undefined;
            }),
        });

        return {
            ...toRefs(state),
            ACCOUNT_TYPE,
            ACTION_ICON,
            getProperRouteLocation,
        };
    },
};
</script>

<style lang="postcss" scoped>
.service-account-project-detail {
    font-size: 0.875rem;
    .required-span {
        @apply text-red-500 mx-1;
    }
}
</style>

<style lang="postcss">
/* custom design-system component - p-tooltip */
.p-tooltip {
    .tooltip-inner {
        white-space: pre-line;
    }
}
</style>
