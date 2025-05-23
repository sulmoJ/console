<template>
    <div class="generate-id-format">
        <p-button style-type="tertiary"
                  class="generate-button"
                  :disabled="disabled"
                  @click="handleClickGenerate"
        >
            {{ $t('COMPONENT.JSON_SCHEMA_FORM.GENERATE') }}
        </p-button>
        <p-text-input :value="value"
                      :invalid="invalid"
                      :style="{ width: fullWidth ? '100%' : undefined }"
                      @update:value="handleUpdateValue"
        >
            <template #right-edge>
                <p-copy-button :value="value" />
            </template>
        </p-text-input>
    </div>
</template>

<script lang="ts">
import {
    defineComponent,
} from 'vue';

import { v4 as uuidV4 } from 'uuid';

import PButton from '@/controls/buttons/button/PButton.vue';
import PCopyButton from '@/controls/buttons/copy-button/PCopyButton.vue';
import PTextInput from '@/controls/input/text-input/PTextInput.vue';

export default defineComponent({
    name: 'GenerateIdFormat',
    components: {
        PTextInput,
        PCopyButton,
        PButton,
    },
    props: {
        value: {
            type: String,
            default: undefined,
        },
        disabled: {
            type: Boolean,
            default: false,
        },
        invalid: {
            type: Boolean,
            default: false,
        },
        fullWidth: {
            type: Boolean,
            default: false,
        },
    },
    setup(props, { emit }) {
        const handleClickGenerate = () => {
            emit('update:value', uuidV4());
        };

        const handleClickDelete = () => {
            emit('update:value', '');
        };

        const handleUpdateValue = (value?: string) => {
            emit('update:value', value?.trim());
        };

        return {
            handleClickGenerate,
            handleClickDelete,
            handleUpdateValue,
        };
    },
});
</script>

<style lang="postcss">
.generate-id-format {
    display: flex;
    align-items: center;
    max-width: 100%;
    overflow: hidden;
    > .generate-button {
        margin-right: 0.5rem;
        flex-shrink: 0;
    }
    > .p-text-input > .input-container {
        .p-copy-button {
            display: inline-flex;
            margin-left: 0.25rem;
        }
    }
}
</style>
