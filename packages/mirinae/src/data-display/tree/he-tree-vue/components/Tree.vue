<template>
    <div ref="treeRef"
         class="he-tree"
         :class="{'he-tree--rtl': props.rtl}"
         :data-tree-id="state.treeId"
    >
        <children-list :nodes="state.rootNode.children"
                       :indent="props.indent"
                       :parent="state.rootNode"
                       :parent-path="[]"
                       :root-node="state.rootNode"
                       :rtl="props.rtl"
                       :selected-paths="props.selectedPaths"
        >
            <template #default="scope">
                <slot v-bind="scope" />
            </template>
        </children-list>
    </div>
</template>

<script setup lang="ts">
import {
    reactive, toRefs,
    computed, watch, ref,
    onBeforeMount, toRef,
    defineAsyncComponent,
} from 'vue';

import { useDraggable } from '@/data-display/tree/he-tree-vue/composables/use-draggable';
import { useFold } from '@/data-display/tree/he-tree-vue/composables/use-fold';
import type { Store } from '@/data-display/tree/he-tree-vue/libs/draggable/types';
import {
    TreeData, walkTreeData as _walkTreeData, cloneTreeData as _cloneTreeData, getPureTreeData as _getPureTreeData,
} from '@/data-display/tree/he-tree-vue/tree-data';

const ChildrenList = defineAsyncComponent(() => import('./ChildrenList.vue'));

interface Props {
    value?: any[];
    selectedPaths?: number[];
    // tree draggable options
    indent?: number;
    // draggable helper options
    rtl?: boolean;
    draggable?: boolean;
    droppable?: boolean;
    eachDraggable?: (path: number[], e: Store) => boolean;
    eachDroppable?: (path: number[], e: Store) => boolean;
    ondragstart?: (e: Store) => boolean;
    ondragend?: (e: Store) => boolean;
    unfoldWhenDragover?: boolean;
    unfoldWhenDragoverDelay?: number;
    // fold
    foldingTransitionNames?: string;
    foldingTransition?: boolean;
    foldAllAfterMounted?: boolean;
}
const props = withDefaults(defineProps<Props>(), {
    value: () => [],
    indent: 20,
    rtl: false,
    selectedPaths: () => [],
    // draggable
    draggable: true,
    droppable: true,
    eachDraggable: undefined,
    eachDroppable: undefined,
    ondragstart: undefined,
    ondragend: undefined,
    unfoldWhenDragover: true,
    unfoldWhenDragoverDelay: 30,
    // fold
    foldingTransitionNames: undefined,
    foldingTransition: undefined,
    foldAllAfterMounted: undefined,
});

// HACK: add events from composables
const emit = defineEmits<{(event: 'input', value: any[]): void;
    (event: 'update:value', value: any[]): void;
    (event: 'update:root-node', value: any[]): void;
}>();

const state = reactive({
    rootNode: {} as any,
    treeId: Math.floor(Math.random() * Date.now()),
    proxyValue: [] as any[],
    treeData: computed({
        get() {
            return state.proxyValue;
        },
        set(value) {
            emit('update:value', value);
            emit('input', value);
            state.proxyValue = value;
        },
    }),
});


watch(() => props.value, (value) => {
    state.proxyValue = value;
}, { immediate: true });

const treeRef = ref<HTMLElement|null>(null);

let treeDataHelper: TreeData<any>;

watch(() => state.treeData, (treeData) => {
    treeDataHelper = new TreeData(treeData);
}, { immediate: true });

const iteratePath = (path: number[], opt) => treeDataHelper.iteratePath(path, opt);
const getAllNodesByPath = (path: number[]) => treeDataHelper.getAllNodes(path);
const getNodeByPath = (path: number[]) => treeDataHelper.getNode(path);
const getBranchElByPath = (path: number[]): Element|null => {
    if (treeRef.value) {
        return treeRef.value.querySelector(`[data-tree-node-path='${path.join(',')}']`);
    }
    return null;
};
const getNodeByBranchEl = (branchEl: HTMLElement) => getNodeByPath(draggableMethods.getPathByBranchEl(branchEl));
const getNodeParentByPath = (path: number[]) => treeDataHelper.getNodeParent(path);
const removeNodeByPath = (path: number[]) => treeDataHelper.removeNode(path);
const walkTreeData = (handler, opt) => _walkTreeData(state.treeData, handler, opt);
const cloneTreeData = (opt) => _cloneTreeData(state.treeData, opt);
// return cloned new tree data without property witch starts with `$`
const getPureTreeData = () => _getPureTreeData(state.treeData);

const methods = {
    iteratePath,
    getAllNodesByPath,
    getNodeByPath,
    getBranchElByPath,
    getNodeByBranchEl,
    getNodeParentByPath,
    removeNodeByPath,
    walkTreeData,
    cloneTreeData,
    getPureTreeData,
};

onBeforeMount(() => {
    const updateRootNode = () => {
        state.rootNode.children = state.treeData;
        emit('update:root-node', state.rootNode);
    };
    watch(() => state.rootNode, updateRootNode, { immediate: true });
    watch(() => state.treeData, updateRootNode, { immediate: true });
});

const { methods: foldMethods } = useFold(props, emit, { walkTreeData });

const { treesStore, methods: draggableMethods } = useDraggable(props, emit, {
    treeRef,
    rootNode: toRef(state, 'rootNode'),
    treeData: toRef(state, 'treeData'),
    getAllNodesByPath,
    getNodeByPath,
    getNodeByBranchEl,
    getBranchElByPath,
    iteratePath,
    unfold: foldMethods.unfold,
});



const allMethods = {
    ...methods,
    ...foldMethods,
    ...draggableMethods,
};

defineExpose({
    ...toRefs(state),
    treesStore,
    ...allMethods,
});

</script>
