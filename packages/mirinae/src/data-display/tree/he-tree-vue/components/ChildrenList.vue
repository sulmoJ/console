<template>
    <div class="tree-children"
         :class="{'tree-root': rootNode === parent}"
    >
        <div v-for="(node, index) in nodes"
             :key="index"
             class="tree-branch"
             :class="{'he-tree--hidden': node.$hidden}"
             :data-tree-node-path="getTreeNodePath(index).join(',')"
        >
            <div class="tree-node-back"
                 :class="{selected: getSelectedState(index)}"
                 :style="indentStyle"
            >
                <div class="tree-node">
                    <slot v-bind="{node, index, path: getTreeNodePath(index)}">
                        {{ node.text ? node.text : node.data }}
                    </slot>
                </div>
            </div>
            <transition v-if="(node.children && node.children.length) > 0">
                <children-list v-if="!node.$folded"
                               :nodes="node.children"
                               :indent="indent"
                               :parent="node"
                               :parent-path="getTreeNodePath(index)"
                               :root-node="rootNode"
                               :rtl="rtl"
                               :selected-paths="selectedPaths"
                >
                    <template #default="scope">
                        <slot v-bind="scope" />
                    </template>
                </children-list>
            </transition>
        </div>
    </div>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import {
    computed,
    defineComponent, reactive, toRefs,
} from 'vue';

export default defineComponent({
    name: 'ChildrenList',
    props: {
        rtl: {
            type: Boolean,
            default: false,
        },
        parentPath: {
            type: Array as PropType<number[]>,
            default: () => [],
        },
        indent: {
            type: Number,
            default: 16,
        },
        nodes: {
            type: Array as PropType<any[]>,
            default: () => [],
        },
        parent: {
            type: Object,
            default: () => ({}),
        },
        rootNode: {
            type: Object,
            default: () => ({}),
        },
        selectedPaths: {
            type: Array as PropType<number[][]>,
            default: () => [],
        },
    },
    setup(props) {
        const state = reactive({
            indentStyle: computed(() => ({
                [!props.rtl ? 'paddingLeft' : 'paddingRight']: `${props.parentPath.length * props.indent}px`,
            })),
        });
        const getTreeNodePath = (index: number) => [...props.parentPath, index];
        const getSelectedState = (index: number): boolean => {
            const path = JSON.stringify(getTreeNodePath(index));
            return props.selectedPaths.some((p) => JSON.stringify(p) === path);
        };
        return {
            ...toRefs(state),
            getTreeNodePath,
            getSelectedState,
        };
    },
});
</script>
