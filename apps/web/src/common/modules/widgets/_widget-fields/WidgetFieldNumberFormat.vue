<script setup lang="ts">
import {
    computed, reactive, watch,
} from 'vue';

import {
    PButtonModal, PFieldGroup, PSelectDropdown, PTextInput, PButton, PLink,
} from '@cloudforet/mirinae';
import { ACTION_ICON } from '@cloudforet/mirinae/src/inputs/link/type';
import type { SelectDropdownMenuItem } from '@cloudforet/mirinae/types/inputs/dropdown/select-dropdown/type';
import { customNumberFormatter } from '@cloudforet/utils';

import { i18n } from '@/translations';

import { useProxyValue } from '@/common/composables/proxy-state';
import { NUMBER_FORMAT } from '@/common/modules/widgets/_constants/widget-field-constant';
import type {
    WidgetFieldComponentProps,
    WidgetFieldComponentEmit, NumberFormatOptions,
} from '@/common/modules/widgets/types/widget-field-type';
import type { NumberFormatValue, NumberFormat } from '@/common/modules/widgets/types/widget-field-value-type';


const SAMPLE_NUMBER = 7564613647;
const SAMPLE_FORMAT_LIST = [
    { format: '#,##0', sample: 1234 },
    { format: '#,##0.00', sample: 1234.56 },
    { format: '#,##0%', sample: 1.23 },
    { format: '#,##0.00%', sample: 1.2345 },
    { format: '#,##0,"천"', sample: 1234000 },
    { format: '#,##0,,"백만"', sample: 1234000000 },
];
const emit = defineEmits<WidgetFieldComponentEmit<NumberFormatValue>>();
const props = defineProps<WidgetFieldComponentProps<NumberFormatOptions, NumberFormatValue>>();
const state = reactive({
    isInitiated: false,
    proxyValue: useProxyValue<NumberFormatValue|undefined>('value', props, emit),
    dataFieldList: computed<string[]>(() => Object.keys(props.dataTable?.data_info ?? {}) ?? []),
    menuItems: computed<SelectDropdownMenuItem[]>(() => [
        {
            name: NUMBER_FORMAT.AUTO,
            label: i18n.t('COMMON.WIDGETS.NUMBER_FORMAT.AUTO'),
        },
        // NOTE: temporary remove short number
        // {
        //     name: NUMBER_FORMAT.SHORT_NUMBER,
        //     label: i18n.t('COMMON.WIDGETS.NUMBER_FORMAT.SHORT_NUMBER'),
        // },
        {
            name: NUMBER_FORMAT.FULL_NUMBER,
            label: i18n.t('COMMON.WIDGETS.NUMBER_FORMAT.FULL_NUMBER'),
        },
        {
            name: NUMBER_FORMAT.CUSTOM,
            label: i18n.t('COMMON.WIDGETS.NUMBER_FORMAT.CUSTOM_NUMBER_FORMAT'),
        },
    ]),
    // custom
    isFormatValid: computed<boolean>(() => {
        if (!state.customNumberFormat) return false;
        try {
            customNumberFormatter(state.customNumberFormat, SAMPLE_NUMBER);
            return true;
        } catch (e) {
            return false;
        }
    }),
    customModalVisible: false as boolean,
    customTargetDataField: '' as string,
    customNumberFormat: '#,##0' as string,
    numberFormatHelpLink: computed<string>(() => ''), // TODO: add link
});

/* Util */
const getDropdownButtonText = (label: string, dataField: string): string => {
    const _customNumberFormat = state.proxyValue?.[dataField]?.customNumberFormat;
    if (_customNumberFormat) {
        return `${label} (${_customNumberFormat})`;
    }
    return label;
};
const getFormattedNumber = (val: string) => {
    try {
        return customNumberFormatter(val, SAMPLE_NUMBER);
    } catch (e) {
        return '--';
    }
};

/* Event */
const handleSelectMenuItem = (dataField: string, selected: NumberFormat) => {
    if (selected === NUMBER_FORMAT.CUSTOM) {
        state.customTargetDataField = dataField;
        state.customModalVisible = true;
        if (state.proxyValue?.[dataField]?.format === NUMBER_FORMAT.CUSTOM) {
            state.customNumberFormat = state.proxyValue?.[dataField]?.customNumberFormat ?? '#,##0';
        }
        return;
    }
    state.proxyValue = {
        ...state.proxyValue,
        [dataField]: {
            format: selected,
            customNumberFormat: undefined,
        },
    };
};
const handleCancelCustomModal = () => {
    state.customModalVisible = false;
};
const handleConfirmCustomModal = () => {
    state.proxyValue = {
        ...state.proxyValue,
        [state.customTargetDataField]: {
            format: NUMBER_FORMAT.CUSTOM,
            customNumberFormat: state.customNumberFormat,
        },
    };
    state.customModalVisible = false;
};
const handleClickSampleFormat = (format: string) => {
    state.customNumberFormat = format;
};

/* Watcher */
watch(() => state.proxyValue, () => {
    emit('update:is-valid', true);
}, { immediate: true });
watch(() => state.dataFieldList, (dataFieldList) => {
    if (!dataFieldList.length) return;
    const _proxyValue: NumberFormatValue = {};
    dataFieldList.forEach((d) => {
        _proxyValue[d] = {
            format: state.proxyValue?.[d]?.format ?? props.widgetConfig?.optionalFieldsSchema.numberFormat?.options?.default ?? NUMBER_FORMAT.AUTO,
            customNumberFormat: state.proxyValue?.[d]?.customNumberFormat ?? undefined,
        };
    });
    state.proxyValue = _proxyValue;
}, { immediate: true });
watch(() => state.customModalVisible, (modalVisible) => {
    if (!modalVisible) state.customNumberFormat = '#,##0';
});
</script>

<template>
    <div class="widget-field-number-format">
        <p-field-group :label="$t('COMMON.WIDGETS.NUMBER_FORMAT.NUMBER_FORMAT')"
                       required
        >
            <template v-if="state.dataFieldList.length > 1">
                <div class="multi-data-field-wrapper">
                    <p-field-group v-for="dataField in state.dataFieldList"
                                   :key="`number-format-data-field-${dataField}`"
                                   :label="dataField"
                                   style-type="secondary"
                                   required
                    >
                        <p-select-dropdown class="w-full"
                                           use-fixed-menu-style
                                           reset-selection-on-menu-close
                                           :menu="state.menuItems"
                                           :selected="state.proxyValue?.[dataField]?.format"
                                           @select="handleSelectMenuItem(dataField, $event)"
                        >
                            <template #dropdown-button="item">
                                <span>{{ getDropdownButtonText(item.label, dataField) }}</span>
                            </template>
                        </p-select-dropdown>
                    </p-field-group>
                </div>
            </template>
            <template v-else>
                <p-select-dropdown v-for="dataField in state.dataFieldList"
                                   :key="`number-format-data-field-${dataField}`"
                                   class="w-full"
                                   use-fixed-menu-style
                                   reset-selection-on-menu-close
                                   :menu="state.menuItems"
                                   :selected="state.proxyValue?.[dataField]?.format"
                                   @select="handleSelectMenuItem(dataField, $event)"
                >
                    <template #dropdown-button="item">
                        <span>{{ getDropdownButtonText(item.label, dataField) }}</span>
                    </template>
                </p-select-dropdown>
            </template>
        </p-field-group>
        <p-button-modal hide-footer-confirm-button
                        :visible="state.customModalVisible"
                        :header-title="$t('COMMON.WIDGETS.NUMBER_FORMAT.CUSTOM_NUMBER_FORMAT')"
                        size="sm"
                        class="number-format-custom-modal"
                        @cancel="handleCancelCustomModal"
        >
            <template #body>
                <div class="top-part">
                    <div class="input-wrapper">
                        <p-field-group :invalid-text="$t('COMMON.WIDGETS.NUMBER_FORMAT.INVALID_NUMBER_FORMAT')"
                                       :invalid="!state.isFormatValid"
                        >
                            <template #default="{invalid}">
                                <p-text-input v-model="state.customNumberFormat"
                                              type="text"
                                              placeholder="#,##0"
                                              :invalid="invalid"
                                />
                            </template>
                        </p-field-group>
                        <p-button style-type="substitutive"
                                  :disabled="!state.isFormatValid"
                                  @click="handleConfirmCustomModal"
                        >
                            {{ $t('COMMON.WIDGETS.NUMBER_FORMAT.CONFIRM') }}
                        </p-button>
                    </div>
                    <div class="helper-wrapper">
                        <p class="sample-text">
                            {{ $t('COMMON.WIDGETS.NUMBER_FORMAT.SAMPLE') }}: {{ getFormattedNumber(state.customNumberFormat) }}
                        </p>
                        <p-link :href="state.numberFormatHelpLink"
                                :action-icon="ACTION_ICON.EXTERNAL_LINK"
                                highlight
                        >
                            {{ $t('COMMON.WIDGETS.NUMBER_FORMAT.HELP') }}
                        </p-link>
                    </div>
                </div>
                <div class="bottom-part">
                    <div v-for="sampleFormat in SAMPLE_FORMAT_LIST"
                         :key="`sample-format-${sampleFormat.format}`"
                         class="sample-row"
                         @click="handleClickSampleFormat(sampleFormat.format)"
                    >
                        <span class="format-text">{{ sampleFormat.format }}</span>
                        <span class="formatted-value">{{ customNumberFormatter(sampleFormat.format, sampleFormat.sample) }}</span>
                    </div>
                </div>
            </template>
        </p-button-modal>
    </div>
</template>

<style lang="postcss" scoped>
.multi-data-field-wrapper {
    @apply flex flex-col gap-2;
}
.number-format-custom-modal {
    .top-part {
        @apply bg-gray-100 rounded;
        padding: 0.75rem;
        .input-wrapper {
            display: flex;
            justify-content: space-between;
            gap: 0.5rem;
            .p-field-group {
                width: 100%;
            }
        }
        .helper-wrapper {
            @apply text-label-md text-gray-600;
            display: flex;
            justify-content: space-between;
            padding-top: 0.5rem;
        }
    }
    .bottom-part {
        @apply border border-gray-150 rounded;
        padding: 0.5rem;
        margin-top: 0.75rem;
        .sample-row {
            @apply cursor-pointer;
            display: flex;
            justify-content: space-between;
            padding: 0.5rem;
            .format-text {
                @apply text-label-md;
            }
            .formatted-value {
                @apply text-label-sm text-gray-500;
            }
        }
    }
}

/* custom design-system component - p-field-group */
:deep(.p-field-group) {
    margin-bottom: 0;
}
</style>
