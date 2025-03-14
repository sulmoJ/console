<script setup lang="ts">
import { reactive, ref } from 'vue';

import { onClickOutside } from '@vueuse/core';
import { useRouter } from 'vue-router/composables';

import PContextMenu from '@/controls/context-menu/PContextMenu.vue';
import type { MenuItem } from '@/controls/context-menu/type';
import PI from '@/foundation/icons/PI.vue';
import { useContextMenuController } from '@/hooks';

interface Props {
    menu?: MenuItem[];
}

const props = withDefaults(defineProps<Props>(), {
    menu: undefined,
});

const router = useRouter();

const emit = defineEmits<{(e: 'click'): void,
    (e: 'click-menu', value: MenuItem): void,
}>();

const containerRef = ref<HTMLElement | null>(null);
const contextMenuRef = ref<HTMLElement | null>(null);
const targetRef = ref<HTMLElement | null>(null);

const state = reactive({
    isVisibleMenu: false,
    selectedMenu: [],
});

const {
    visibleMenu: visibleContextMenu,
    showContextMenu,
    hideContextMenu,
} = useContextMenuController({
    useFixedStyle: true,
    targetRef,
    contextMenuRef,
    menu: props.menu,
});

const handleClickItem = () => {
    emit('click');
    if (props.menu) {
        if (visibleContextMenu.value) hideContextMenu();
        else showContextMenu();
    }
};
const handleSelectMenu = (value) => {
    emit('click-menu', value);
    if (value?.to) {
        router.push(value?.to);
    }
};

onClickOutside(containerRef, hideContextMenu);
</script>

<template>
    <span ref="containerRef"
          class="breadcrumb-ellipsis-wrapper"
    >
        <span class="breadcrumb-ellipsis">
            <span ref="targetRef"
                  class="ellipsis"
                  @click="handleClickItem"
            >...</span>
            <p-i name="ic_chevron-right-thin"
                 width="1rem"
                 height="1rem"
                 class="arrow-icon"
                 color="inherit white"
            />
        </span>
        <p-context-menu v-if="visibleContextMenu"
                        ref="contextMenuRef"
                        :visible-menu="visibleContextMenu"
                        :menu="props.menu"
                        :selected="state.selectedMenu"
                        @select="handleSelectMenu"
        />
    </span>
</template>

<style scoped lang="postcss">
.breadcrumb-ellipsis-wrapper {
    @apply relative flex flex-col items-center;
    .breadcrumb-ellipsis {
        @apply flex items-center;
        gap: 0.375rem;
        margin-right: 0.375rem;
        word-break: break-all;
        .ellipsis {
            @apply text-label-md text-gray-700 cursor-pointer relative;

            &:hover {
                @apply text-gray-900 underline;
            }
        }
        .arrow-icon {
            @apply text-gray-500;
        }
    }
}
</style>
