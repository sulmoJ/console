<script lang="ts" setup>
import {
    computed, reactive, watch,
} from 'vue';

import {
    PSelectDropdown, PFieldGroup, PTextInput, PSelectButton, PTooltip, PI,
} from '@cloudforet/mirinae';
import type { MenuItem } from '@cloudforet/mirinae/types/inputs/context-menu/type';

import { i18n } from '@/translations';

import { useProxyValue } from '@/common/composables/proxy-state';
import { useGranularityMenuItem } from '@/common/modules/widgets/_composables/use-granularity-menu-items';
import { getInitialSelectedMenuItem } from '@/common/modules/widgets/_helpers/widget-field-helper';
import { sortWidgetTableFields } from '@/common/modules/widgets/_helpers/widget-helper';
import type { WidgetFieldComponentEmit, WidgetFieldComponentProps, TableDataFieldOptions } from '@/common/modules/widgets/types/widget-field-type';
import type { TableDataFieldValue } from '@/common/modules/widgets/types/widget-field-value-type';

const DEFAULT_COUNT = 5;
const DEFAULT_FIELD_TYPE = 'staticField';
const props = withDefaults(defineProps<WidgetFieldComponentProps<TableDataFieldOptions, TableDataFieldValue>>(), {
});
const emit = defineEmits<WidgetFieldComponentEmit<TableDataFieldValue>>();

const { labelsMenuItem } = useGranularityMenuItem(props, 'tableDataField');
const MIN_LABELS_INFO_COUNT = 1;
const DEFAULT_INDEX = 1;
const state = reactive({
    isInitiated: false,
    proxyValue: useProxyValue('value', props, emit),
    fieldTypeMenuItems: computed<MenuItem[]>(() => [
        {
            name: 'dynamicField',
            label: i18n.t('DASHBOARDS.WIDGET.OVERLAY.STEP_2.DYNAMIC_FIELD'),
        },
        {
            name: 'staticField',
            label: i18n.t('DASHBOARDS.WIDGET.OVERLAY.STEP_2.STATIC_FIELD'),
        },
    ]),
    selectedFieldType: DEFAULT_FIELD_TYPE,
    selectedItem: undefined as undefined | MenuItem[] | string,
    selectedCriteria: undefined as undefined | MenuItem[] | string,
    multiSelectable: computed(() => state.selectedFieldType === 'staticField'),
    menuItems: computed<MenuItem[]>(() => {
        if (!props.dataTable) return [];
        return state.selectedFieldType === 'dynamicField' ? labelsMenuItem.value : state.dataInfoMenuItems;
    }),
    dataInfoMenuItems: computed<MenuItem[]>(() => sortWidgetTableFields(Object.keys(props.dataTable?.data_info ?? {})).map((d) => ({
        name: d,
        label: d,
    }))),
    isValid: computed<boolean>(() => {
        if (state.proxyValue?.count === undefined) return false;
        if (state.menuItems.length === 0) return false;
        if (Array.isArray(state.selectedItem)) {
            return !!state.selectedItem.length;
        }
        return !!state.selectedItem;
    }),
    dataFieldInvalid: computed(() => {
        if (state.menuItems.length === 0) return true;
        if (Array.isArray(state.selectedItem)) {
            return !state.selectedItem.length;
        }
        return !state.selectedItem;
    }),
    max: computed(() => props.widgetFieldSchema?.options?.max),
    isMaxValid: computed<boolean>(() => (state.max ? (state.proxyValue?.count <= state.max) && !!state.proxyValue?.count : true)),
    tooltipDesc: computed(() => i18n.t('COMMON.WIDGETS.MAX_ITEMS_DESC', {
        fieldName: state.fieldName,
        max: state.max,
    })),
});


/* Event */
const handleUpdateCriteria = (val: string|MenuItem[]) => {
    state.selectedCriteria = val;
    state.proxyValue = {
        ...state.proxyValue,
        criteria: val,
    };
};
const handleChangeDataFieldType = (value: string) => {
    state.selectedFieldType = value;
    if (state.selectedFieldType === 'staticField') {
        state.proxyValue = {
            ...state.proxyValue,
            value: [state.menuItems[0]?.name],
            criteria: undefined,
        };
        state.selectedItem = convertToMenuItem([state.menuItems[0].name]);
        state.selectedCriteria = state.dataInfoMenuItems[0]?.name;
    } else {
        state.proxyValue = {
            ...state.proxyValue,
            value: state.menuItems[0]?.name,
            criteria: state.dataInfoMenuItems[0]?.name,
        };
        state.selectedItem = state.menuItems[0]?.name;
        state.selectedCriteria = state.dataInfoMenuItems[0]?.name;
    }
    state.proxyValue = { ...state.proxyValue, fieldType: value };
};
const handleUpdateValue = (val: string|MenuItem[]) => {
    state.selectedItem = val;
    if (Array.isArray(val)) {
        state.proxyValue = {
            ...state.proxyValue,
            value: val.map((item) => item?.name),
        };
    } else {
        state.proxyValue = {
            ...state.proxyValue,
            value: val,
        };
    }
};
const handleUpdateCount = (val: number) => {
    if (val === state.proxyValue?.count) return;
    state.proxyValue = { ...state.proxyValue, count: val };
};

/* Watcher */
watch(() => state.isValid, (isValid) => {
    emit('update:is-valid', isValid);
});
const convertToMenuItem = (data?: string[]) => data?.map((d) => ({
    name: d,
    label: d,
})) ?? [];

watch(() => labelsMenuItem.value, (value) => {
    if (!(value.find((d) => d.name === state.selectedItem)) && (state.selectedFieldType === 'dynamicField')) {
        state.selectedItem = undefined;
        return;
    }
    if ((labelsMenuItem.value ?? []).length >= 2) {
        state.proxyValue = {
            ...state.proxyValue,
            value: props.value?.value ?? state.menuItems[DEFAULT_INDEX]?.name,
            criteria: state.selectedFieldType === 'dynamicField' ? state.dataInfoMenuItems[0]?.name : undefined,
        };
    }
});

watch(() => state.selectedFieldType, (selectedFieldType) => {
    if (selectedFieldType === 'dynamicField') {
        const labelsInfo = props.dataTable?.labels_info;
        if (!labelsInfo) return;
        if (Object.keys(labelsInfo).length < 2) {
            emit('show-error-modal', MIN_LABELS_INFO_COUNT);
            return;
        }
        state.proxyValue = {
            ...state.proxyValue,
            value: props.value?.value ?? state.menuItems[DEFAULT_INDEX]?.name,
            criteria: state.dataInfoMenuItems[0]?.name,
        };
    }
}, { immediate: true });

const initValue = () => {
    state.selectedFieldType = props.value?.fieldType ?? DEFAULT_FIELD_TYPE;
    state.proxyValue = {
        ...state.proxyValue,
        fieldType: state.selectedFieldType,
        value: props.value?.value,
        criteria: state.proxyValue?.criteria,
        count: props.value?.count ?? DEFAULT_COUNT,
    };
    if (state.selectedFieldType === 'staticField') {
        state.selectedItem = convertToMenuItem(state.proxyValue?.value);
    } else {
        state.selectedItem = state.proxyValue?.value;
        state.selectedCriteria = state.proxyValue?.criteria;
    }
};
watch(() => state.menuItems, (menuItems) => {
    if (!state.isInitiated) {
        initValue();
        state.isInitiated = true;
    }

    if (!menuItems?.length) return;

    let _value: string | string[] | undefined;
    let _criteria: string | undefined;
    if (state.selectedFieldType === 'staticField') {
        _value = getInitialSelectedMenuItem(menuItems, state.proxyValue?.value ?? [], 0);
        state.selectedItem = convertToMenuItem(_value);
    } else {
        _value = getInitialSelectedMenuItem(menuItems, state.proxyValue?.value, 0);
        _criteria = getInitialSelectedMenuItem(state.dataInfoMenuItems, state.proxyValue, 0);
        state.selectedItem = _value;
        state.selectedCriteria = _criteria;
    }
    state.proxyValue = {
        ...state.proxyValue,
        value: _value,
        criteria: _criteria,
    };
}, { immediate: true });
</script>

<template>
    <div class="widget-field-table-data-field">
        <p-field-group :label="$t('DASHBOARDS.WIDGET.OVERLAY.STEP_2.DATA_FIELD')"
                       required
        >
            <div class="data-field-type-select-wrapper">
                <p-select-button v-for="selectItem in state.fieldTypeMenuItems"
                                 :key="`select-button-${selectItem.name}`"
                                 :value="selectItem.name"
                                 style-type="secondary"
                                 :selected="state.selectedFieldType"
                                 @change="handleChangeDataFieldType"
                >
                    {{ selectItem.label }}
                </p-select-button>
            </div>
            <p-field-group v-if="state.selectedFieldType === 'dynamicField'"
                           :label="$t('COMMON.WIDGETS.CRITERIA')"
                           style-type="secondary"
                           required
                           class="criteria-field"
            >
                <p-select-dropdown :menu="state.dataInfoMenuItems"
                                   :selected="state.selectedCriteria"
                                   appearance-type="badge"
                                   @update:selected="handleUpdateCriteria"
                />
            </p-field-group>
            <div class="field-form-wrapper">
                <p-field-group :label="$t('COMMON.WIDGETS.FIELD')"
                               style-type="secondary"
                               required
                               class="w-full"
                >
                    <p-select-dropdown :menu="state.menuItems"
                                       :selected="state.selectedItem"
                                       :multi-selectable="state.multiSelectable"
                                       :show-select-marker="state.multiSelectable"
                                       :invalid="state.dataFieldInvalid"
                                       appearance-type="badge"
                                       @update:selected="handleUpdateValue"
                    />
                </p-field-group>
                <p-field-group :label="$t('COMMON.WIDGETS.MAX_ITEMS')"
                               style-type="secondary"
                               class="max-items"
                               :invalid="!state.isMaxValid"
                               :invalid-text="$t('COMMON.WIDGETS.NUMBER_FIELD_VALIDATION', {max: state.max})"
                               required
                >
                    <p-text-input type="number"
                                  :min="1"
                                  :max="props.widgetFieldSchema?.options?.max"
                                  :invalid="!state.isMaxValid"
                                  :value="state.proxyValue?.count ?? DEFAULT_COUNT"
                                  @update:value="handleUpdateCount"
                    />
                    <template #label-extra>
                        <p-tooltip v-if="state.max"
                                   :contents="state.tooltipDesc"
                                   position="bottom"
                                   class="tooltip"
                        >
                            <p-i width="1rem"
                                 height="1rem"
                                 name="ic_info-circle"
                                 class="icon"
                            />
                        </p-tooltip>
                    </template>
                </p-field-group>
            </div>
        </p-field-group>
    </div>
</template>

<style lang="postcss" scoped>
.data-field-type-select-wrapper {
    display: flex;
    gap: 0.5rem;
    padding-bottom: 0.5rem;
}
.field-form-wrapper {
    display: flex;
    gap: 0.5rem;
    .p-select-dropdown {
        width: 100%;
    }

    /* custom design-system component - p-text-input */
    :deep(.p-text-input) {
        width: 6.5rem;
        .input-container {
            padding-right: 1.5rem;
        }
    }
    .max-items {
        width: 10rem;

        .tooltip {
            position: relative;
            padding-left: 1.25rem;
            .icon {
                position: absolute;
                right: 0;
            }
        }
    }
}

/* custom design-system component - p-field-group */
:deep(.p-field-group) {
    margin-bottom: 0;
}
.criteria-field {
    @apply w-full;
    margin-bottom: 0.5rem;
}
</style>
