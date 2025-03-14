<template>
    <p-tag v-if="periodText"
           class="period"
           :deletable="!readOnly"
           @delete="handleDeletePeriod"
    >
        <span class="text">UTC</span>
        {{ periodText }}
    </p-tag>
</template>

<script lang="ts">
import {
    computed, defineComponent,
    reactive, toRefs,
} from 'vue';

import dayjs from 'dayjs';

import { PTag } from '@cloudforet/mirinae';

import type { Period } from '@/services/asset-inventory-v1/types/type';


interface Props {
    period?: Period;
    readOnly?: boolean;
}

export default defineComponent<Props>({
    name: 'CloudServicePeriodFilter',
    components: {
        PTag,
    },
    props: {
        readOnly: {
            type: Boolean,
            default: false,
        },
        period: {
            type: Object,
            default: () => ({}),
        },
    },
    setup(props, { emit }) {
        const state = reactive({
            periodText: computed<string>(() => {
                if (props.period?.start) {
                    const start = dayjs.utc(props.period.start);
                    const end = dayjs.utc(props.period.end);
                    if (start.isSame(end)) return dayjs.utc(props.period.start).format('MMM D, YYYY');
                    return `${start.format('MMM D, YYYY')} ~ ${end.format('MMM D, YYYY')}`;
                }
                return '';
            }),
        });

        const handleDeletePeriod = () => {
            emit('delete-period');
        };

        return {
            ...toRefs(state),
            handleDeletePeriod,
        };
    },
});
</script>

<style lang="postcss" scoped>
.period {
    font-size: 0.875rem;
    line-height: 1.5;
    .text {
        @apply text-gray-500 mr-2;
    }
}
</style>
