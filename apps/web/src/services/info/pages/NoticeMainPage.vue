<template>
    <div class="notice-page">
        <p-heading class="mb-6"
                   :title="$t('INFO.NOTICE.MAIN.NOTICE_TITLE')"
        />
        <notice-list />
    </div>
</template>

<script setup lang="ts">

import {
    PHeading,
} from '@cloudforet/mirinae';

import NoticeList from '@/services/info/components/NoticeList.vue';

</script>
