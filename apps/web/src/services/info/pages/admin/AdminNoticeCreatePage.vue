<script setup lang="ts">
import { onBeforeMount } from 'vue';

import { PHeading } from '@cloudforet/mirinae';

import NoticeForm from '@/services/info/components/NoticeForm.vue';
import { useNoticeDetailStore } from '@/services/info/stores/notice-detail-store';

const noticeDetailStore = useNoticeDetailStore();

onBeforeMount(() => {
    noticeDetailStore.reset();
});
</script>

<template>
    <div class="notice-create-page">
        <p-heading class="mb-6"
                   :title="$t('INFO.NOTICE.FORM.CREATE_NOTICE')"
                   show-back-button
                   @click-back-button="$router.go(-1)"
        />
        <notice-form type="CREATE" />
    </div>
</template>
