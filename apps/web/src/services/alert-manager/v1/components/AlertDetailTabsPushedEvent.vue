<script setup lang="ts">
import {
    computed, reactive,
} from 'vue';


import { QueryHelper } from '@cloudforet/core-lib/query';
import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import { ApiQueryHelper } from '@cloudforet/core-lib/space-connector/helper';
import {
    PButton, PButtonModal, PI, PCodeEditor, PToolbox, PEmpty,
} from '@cloudforet/mirinae';

import type { ListResponse } from '@/api-clients/_common/schema/api-verbs/list';
import type { EventListParameters } from '@/schema/monitoring/event/api-verbs/list';
import type { EventModel } from '@/schema/monitoring/event/model';

import { useUserStore } from '@/store/user/user-store';

import { copyAnyData } from '@/lib/helper/copy-helper';

import AlertDetailTabsPushedEventVerticalTimeline
    from '@/services/alert-manager/v1/components/AlertDetailTabsPushedEventVerticalTimeline.vue';



const PAGE_SIZE = 10;

const props = defineProps<{
    id: string;
}>();
const eventListApiQueryHelper = new ApiQueryHelper()
    .setSort('created_at', true)
    .setPage(1, 10);
let eventListApiQuery = eventListApiQueryHelper.data;

const userStore = useUserStore();
const state = reactive({
    itemList: [] as EventModel[],
    timezone: computed(() => userStore.state.timezone),
    totalCount: 0,
    thisPage: 1,
    pageLimit: 10,
    selectedItem: {} as any,
    modalVisible: false,
    isAlertVisible: false,
});

const searchQueryHelper = new QueryHelper();

const listEvent = async () => {
    eventListApiQueryHelper.setFilters([...searchQueryHelper.filters]);
    if (props.id) eventListApiQueryHelper.addFilter({ k: 'alert_id', v: props.id, o: '=' });
    eventListApiQuery = eventListApiQueryHelper.data;
    const { results, total_count } = await SpaceConnector.clientV2.monitoring.event.list<EventListParameters, ListResponse<EventModel>>({ query: eventListApiQuery });
    state.itemList = results ?? [];
    state.totalCount = total_count ?? 0;
};

const onChange = async (options: any = {}) => {
    if (options.searchText !== undefined) {
        eventListApiQueryHelper.setPageStart(1);
        eventListApiQueryHelper.setPageLimit(10);
        searchQueryHelper.setFilters([{ v: options.searchText }]);
    }
    await listEvent();
};

const onClickMore = async () => {
    state.thisPage += 1;
    state.pageLimit = state.thisPage * PAGE_SIZE;
    eventListApiQueryHelper.setPageLimit(state.pageLimit);
    await listEvent();
};

const onOpenModal = (item) => {
    state.modalVisible = true;
    state.selectedItem = item;
};

const onClickConfirm = () => {
    state.modalVisible = false;
};

const onCopyClick = () => {
    state.isAlertVisible = true;
    setTimeout(() => { state.isAlertVisible = false; }, 500);
    copyAnyData(state.selectedItem.raw_data);
};

(async () => {
    await listEvent();
})();

</script>

<template>
    <section class="event-list-wrapper">
        <p-toolbox
            search-type="plain"
            :total-count="state.totalCount"
            :page-size-changeable="false"
            :pagination-visible="false"
            class="mb-4"
            @change="onChange"
            @refresh="onChange()"
        />
        <template v-if="state.itemList.length > 0">
            <div v-for="(item, idx) in state.itemList"
                 :key="item.event_id"
            >
                <alert-detail-tabs-pushed-event-vertical-timeline
                    :key="item.event_id"
                    :item="item"
                    :timezone="state.timezone"
                    :event-type="item.event_type"
                    :is-last-item="idx === state.itemList.length - 1"
                    class="timeline"
                >
                    <template #timeline-detail>
                        <div class="list-item"
                             @click="onOpenModal(item)"
                        >
                            <div class="list-item-title">
                                <span class="severity">[{{ item.severity }}]</span>
                                <span>{{ item.title }}</span>
                                <p-i name="ic_chevron-right"
                                     width="1rem"
                                     height="1rem"
                                     color="inherit"
                                     class="svg-icon"
                                />
                            </div>
                            <p class="desc">
                                {{ item.description }}
                            </p>
                        </div>
                    </template>
                </alert-detail-tabs-pushed-event-vertical-timeline>
            </div>
        </template>
        <p-empty v-else>
            {{ $t('MONITORING.ALERT.DETAIL.PUSHED_EVENT.NO_EVENT') }}
        </p-empty>
        <p-button v-if="state.itemList.length > 9"
                  style-type="secondary"
                  class="more-button"
                  @click="onClickMore"
        >
            {{ $t('MONITORING.ALERT.DETAIL.PUSHED_EVENT.MORE') }}
        </p-button>
        <p-button-modal
            v-if="state.modalVisible"
            :header-title="$t('MONITORING.ALERT.DETAIL.PUSHED_EVENT.EVENT_DETAILS')"
            size="lg"
            :visible.sync="state.modalVisible"
            @confirm="onClickConfirm"
        >
            <template #body>
                <div class="content-wrapper">
                    <p-code-editor :code="state.selectedItem"
                                   class="code-block"
                                   read-only
                                   folded
                    />
                </div>
            </template>
            <template #footer-extra>
                <div class="footer-extra">
                    <p-button style-type="tertiary"
                              icon-left="ic_copy"
                              @click="onCopyClick"
                    >
                        {{ $t('MONITORING.ALERT.DETAIL.PUSHED_EVENT.COPY_ALL') }}
                    </p-button>
                    <transition name="fade">
                        <div v-if="state.isAlertVisible"
                             ref="alertRef"
                             class="copy-button-alert"
                        >
                            <p-i name="ic_check"
                                 color="white"
                                 width="1rem"
                                 height="1rem"
                            />
                            <span>{{ $t('COMPONENT.COPY_BUTTON.COPIED') }}</span>
                        </div>
                    </transition>
                </div>
            </template>
        </p-button-modal>
    </section>
</template>

<style lang="postcss" scoped>
.event-list-wrapper {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
    padding-bottom: 2.5rem;
}
.list-item {
    &:hover {
        @apply text-blue-600 cursor-pointer underline;
        .desc {
            @apply text-blue-600;
        }
    }
    .list-item-title {
        min-height: 1.315rem;
        .svg-icon {
            margin-bottom: 0.125rem;
        }
    }
    .desc {
        @apply text-gray-500;
        white-space: pre-line;
    }
}
.severity {
    @apply font-bold capitalize;
}
.more-button {
    display: flex;
    width: 100%;
    margin-top: 1.5rem;
}
.content-wrapper {
    max-height: 20.68rem;
}

/* custom design-system component - p-button-modal */
:deep(.p-button-modal) {
    .modal-content {
        .modal-body {
            min-height: 32rem;
        }
    }
}
.code-block {
    min-height: 100%;
}
.copy-button-alert {
    @apply inline-flex text-white rounded-md;
    background-color: rgba(theme('colors.gray.900'), 0.88);
    font-weight: 400;
    font-size: 0.75rem;
    line-height: 1.3;
    width: auto;
    padding: 0.25rem 0.5rem;
    justify-content: center;
    align-items: center;
    margin-left: 1rem;
    &.fade-enter-active, &.fade-leave-active {
        transition: opacity 0.3s;
    }
    &.fade-enter, &.fade-leave-to {
        opacity: 0;
    }
}
</style>
