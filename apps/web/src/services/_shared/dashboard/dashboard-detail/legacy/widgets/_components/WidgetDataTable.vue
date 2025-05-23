<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import {
    computed,
    defineProps, reactive, ref, watch,
} from 'vue';

import { throttle } from 'lodash';

import {
    PI, PDataLoader, PTooltip, PStatus, PEmpty, PPopover, PTextPagination,
} from '@cloudforet/mirinae';
import { numberFormatter, getValueByPath } from '@cloudforet/utils';

import { CURRENCY } from '@/store/display/constant';
import type { Currency } from '@/store/display/type';

import { currencyMoneyFormatter } from '@/lib/helper/currency-helper';
import { usageUnitFormatter } from '@/lib/helper/usage-formatter';

import { useProxyValue } from '@/common/composables/proxy-state';
import { useTextOverflowState } from '@/common/composables/text-overflow-state';

import { gray } from '@/styles/colors';
import { MASSIVE_CHART_COLORS, DISABLED_LEGEND_COLOR } from '@/styles/colorsets';

import type {
    Field, WidgetTableData,
} from '@/services/_shared/dashboard/dashboard-detail/legacy/widgets/_types/widget-data-table-type';
import type { Legend } from '@/services/_shared/dashboard/dashboard-detail/legacy/widgets/_types/widget-type';
import type { AllReferenceTypeInfo } from '@/services/_shared/dashboard/dashboard-detail/stores/all-reference-type-info-store';

type TableSize = 'sm' | 'md';

interface Props {
    loading: boolean;
    fields: Field[];
    items?: WidgetTableData[];
    thisPage?: number;
    showLegend?: boolean;
    showLegendIndex?: boolean;
    legends?: Legend[];
    currency?: Currency;
    disablePagination?: boolean;
    widgetKey?: string;
    size?: TableSize;
    showNextPage?: boolean;
    allReferenceTypeInfo?: AllReferenceTypeInfo;
    colorSet?: string[];
    disableToggle?: boolean;
    disableEllipsis?: boolean;
    disableRowClick?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    fields: () => [],
    items: () => [],
    thisPage: 1,
    legends: () => [],
    currency: CURRENCY.USD,
    widgetKey: '',
    size: 'sm',
    allReferenceTypeInfo: () => ({}) as AllReferenceTypeInfo,
    colorSet: () => [],
    disableEllipsis: false,
});
const emit = defineEmits<{(e: string, value: any): void}>();
const state = reactive({
    proxyThisPage: useProxyValue('thisPage', props, emit),
    disabledLegends: {} as Record<number, boolean>,
    tableOverflowXScroll: computed<boolean>(() => {
        if (props.fields.length > 10) return true;
        return false;
    }),
    tableOverflowXScrollWidth: computed<string|undefined>(() => {
        if (!state.tableOverflowXScroll) return undefined;
        return `${props.fields.length * 10}rem`;
    }),
});

const labelRef = ref<HTMLElement[]|null>(null);

/* util */
const getLegendIconColor = (index: number): string => {
    const legend = props.legends[index];
    if (legend?.disabled || state.disabledLegends[index]) return DISABLED_LEGEND_COLOR;
    if (legend?.color) return legend.color;
    if (props.colorSet) return props.colorSet[index];
    return MASSIVE_CHART_COLORS[index];
};
const getLegendTextColor = (index) => {
    const legend = props.legends[index];
    if (legend?.disabled || state.disabledLegends[index]) return DISABLED_LEGEND_COLOR;
    return null;
};
const getHeadSlotProps = (field, colIndex) => ({
    field, index: colIndex, colIndex,
});
const textFormatter = (value:string|number, textOptions: Field['textOptions'], cellData: any) => {
    if (typeof value !== 'number') {
        if (!value) return '--';
        if (textOptions?.type === 'reference') {
            if (!value) return 'Unknown';
            const referenceMap = props.allReferenceTypeInfo[textOptions.referenceType]?.referenceMap;
            if (textOptions.referenceType === 'region') return referenceMap?.[value]?.name ?? value;
            return referenceMap?.[value]?.label ?? referenceMap?.[value]?.name ?? value;
        }
        return value;
    }
    if (textOptions?.type === 'cost') {
        return currencyMoneyFormatter(value, { currency: props.currency });
    } if (textOptions?.type === 'number') {
        return numberFormatter(value);
    } if (textOptions?.type === 'percent') {
        return `${value.toFixed(1)}%`;
    }
    if (textOptions?.type === 'usage') {
        let unit = textOptions?.unit;
        const unitPath = textOptions?.unitPath;
        if (!unit && unitPath) unit = getValueByPath(cellData, unitPath);
        return usageUnitFormatter(value, { unit });
    }
    return value;
};
const getValue = (item:string|number|object, field: Field):string|number => {
    let valueKey = field.name;
    if (valueKey === null || valueKey === undefined) {
        valueKey = 'Unknown';
    }
    if (typeof item === 'object') {
        return textFormatter(getValueByPath(item, valueKey), field.textOptions, item) ?? '';
    }
    return textFormatter(item, field.textOptions, item) ?? '';
};
const getHandler = (option: Field['icon']|Field['link']|Field['rapidIncrease'], item): string|boolean|undefined => {
    if (typeof option === 'string' || typeof option === 'boolean') {
        return option;
    }
    if (option) return option(item);
    return undefined;
};
const getColSlotProps = (item, field, colIndex, rowIndex) => ({
    item, index: rowIndex, field, value: getValue(item, field), colIndex, rowIndex,
});


const { getTextOverflowState } = useTextOverflowState({ targetRef: labelRef, targetClass: 'common-text-box' });
const isEllipsisActive = (rowIndex: number, colIndex: number): boolean => {
    if (props.fields[colIndex].detailOptions?.type === 'popover') return false;
    const tdIndex = props.fields.length * rowIndex + colIndex;
    return getTextOverflowState(tdIndex);
};

const tableRef = ref<null|HTMLElement>(null);
const tableWidth = ref<number>(0);
useResizeObserver(tableRef, throttle((entries) => {
    const entry = entries[0];
    const { width } = entry.contentRect;
    tableWidth.value = width;
}, 500));

const getTooltipContents = (item: any, field: Field): string => {
    const value = getValue(item, field);
    if (typeof value === 'number') return value.toString();
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return value;
};

/* event */
const handleClickLegend = (index: number) => {
    state.disabledLegends = { ...state.disabledLegends, [index]: !state.disabledLegends[index] };
    emit('toggle-legend', index);
};
const handleClickRow = (rowData) => {
    emit('click-row', rowData);
};
watch(() => props.legends, () => {
    state.disabledLegends = {};
});
</script>

<template>
    <div class="widget-data-table">
        <p-data-loader class="table-container"
                       :loading="props.loading"
                       :data="props.items"
                       :loader-backdrop-opacity="1"
                       disable-empty-case
        >
            <template #default="{isEmpty}">
                <table ref="tableRef"
                       :class="{
                           'ellipsis-table': !props.disableEllipsis,
                           'table-overflow-x-scroll': state.tableOverflowXScroll
                       }"
                       :style="{
                           width: state.tableOverflowXScrollWidth,
                       }"
                >
                    <thead>
                        <tr>
                            <th v-for="(field, fieldColIndex) in props.fields"
                                :key="`th-${props.widgetKey}-${fieldColIndex}`"
                                :style="{
                                    minWidth: field.width || undefined,
                                    width: field.width || undefined,
                                }"
                            >
                                <slot :name="`th-${field.name}`"
                                      v-bind="getHeadSlotProps(field, fieldColIndex)"
                                >
                                    <span class="th-contents"
                                          :class="{
                                              [field?.textAlign || 'left']: true,
                                              'has-icon': field.tooltipText,
                                          }"
                                    >
                                        <span class="th-text">
                                            <slot :name="`th-${field.name}-text`"
                                                  v-bind="getHeadSlotProps(field, fieldColIndex)"
                                            >
                                                {{ field.label ? field.label : field.name }}
                                                <span v-if="field.textOptions?.type === 'usage' && field.textOptions?.unit"
                                                      class="usage-unit"
                                                >
                                                    ({{ field.textOptions.unit }})
                                                </span>
                                            </slot>
                                            <template v-if="field.tooltipText">
                                                <p-tooltip :contents="field.tooltipText">
                                                    <p-i name="ic_question-mark-circle-filled"
                                                         width="0.875rem"
                                                         height="0.875rem"
                                                         :color="gray[300]"
                                                         class="tooltip-icon"
                                                    />
                                                </p-tooltip>
                                            </template>
                                        </span>
                                    </span>
                                </slot>
                            </th>
                        </tr>
                    </thead>
                    <tbody ref="tbodyRef">
                        <p-empty v-if="isEmpty"
                                 class="no-data-wrapper"
                                 :colspan="props.fields.length"
                        >
                            {{ $t('DASHBOARDS.WIDGET.NO_DATA') }}
                        </p-empty>
                        <slot v-else
                              name="body"
                              :items="props.items"
                              v-bind="{fields: props.fields}"
                        >
                            <tr v-for="(item, rowIndex) in props.items"
                                :key="`tr-${props.widgetKey}-${rowIndex}`"
                                :data-index="rowIndex"
                                :class="{'cursor-pointer': !props.disableRowClick}"
                                @click="handleClickRow({rowIndex, item})"
                            >
                                <td v-for="(field, colIndex) in props.fields"
                                    :key="`td-${props.widgetKey}-${rowIndex}-${colIndex}-${tableWidth}`"
                                    :class="{
                                        'has-width': !!field.width,
                                        [field?.textAlign || 'left']: true,
                                        [props.size]: true,
                                        'link-item': field?.link,
                                        'detail-item': field?.detailOptions?.enabled,
                                    }"
                                >
                                    <slot :name="`col-${field.name}`"
                                          v-bind="getColSlotProps(item, field, colIndex, rowIndex)"
                                    >
                                        <p-tooltip position="bottom"
                                                   :contents="isEllipsisActive(rowIndex, colIndex) ? getTooltipContents(item, field) : ''"
                                        >
                                            <div class="detail-item-wrapper">
                                                <span ref="labelRef"
                                                      class="td-contents"
                                                >
                                                    <template v-if="colIndex === 0 && props.showLegend">
                                                        <p-status v-if="props.showLegend"
                                                                  class="toggle-button"
                                                                  :class="{ 'disable-toggle': disableToggle }"
                                                                  :text="props.showLegendIndex ? ((rowIndex) + 1)?.toString() : ''"
                                                                  :icon-color="getLegendIconColor(rowIndex)"
                                                                  :text-color="getLegendTextColor(rowIndex)"
                                                                  @click.stop="handleClickLegend(rowIndex)"
                                                        />
                                                    </template>
                                                    <template v-if="field?.icon">
                                                        <p-i :name="getHandler(field.icon, item)"
                                                             width="1rem"
                                                             height="1rem"
                                                             class="icon"
                                                        />
                                                    </template>

                                                    <slot :name="`col-${field.name}-text`"
                                                          v-bind="getColSlotProps(item, field, colIndex, rowIndex)"
                                                    >
                                                        <router-link v-if="getHandler(field.link, item)"
                                                                     :to="getHandler(field.link, item)"
                                                                     class="link"
                                                                     :class="{'ellipsis-box': !props.disableEllipsis }"
                                                        >
                                                            {{ getValue(item, field) }}
                                                        </router-link>
                                                        <div v-else-if="getHandler(field.rapidIncrease, item)"
                                                             class="rapid-increase"
                                                        ><span>{{ getValue(item, field) }}</span> <p-i name="ic_arrow-up-bold-alt"
                                                                                                       width="1rem"
                                                                                                       height="1rem"
                                                        />
                                                        </div>
                                                        <span v-else
                                                              class="common-text-box"
                                                              :class="{'ellipsis-box': !props.disableEllipsis }"
                                                        >{{ getValue(item, field) }}</span>
                                                    </slot>
                                                </span>
                                                <template v-if="field?.detailOptions?.enabled">
                                                    <p-popover position="bottom">
                                                        <span class="detail">{{ $t('DASHBOARDS.WIDGET.DETAILS') }}</span>
                                                        <template #content>
                                                            <div class="popover-content">
                                                                <slot :name="`detail-${field.name}`"
                                                                      v-bind="getColSlotProps(item, field, colIndex, rowIndex)"
                                                                />
                                                            </div>
                                                        </template>
                                                    </p-popover>
                                                </template>
                                            </div>
                                        </p-tooltip>
                                    </slot>
                                </td>
                            </tr>
                        </slot>
                    </tbody>
                    <tfoot>
                        <slot name="foot" />
                    </tfoot>
                </table>
            </template>
        </p-data-loader>
        <div v-if="!props.disablePagination"
             class="table-pagination-wrapper"
        >
            <p-text-pagination :this-page.sync="state.proxyThisPage"
                               :has-next-page="props.showNextPage"
            />
        </div>
    </div>
</template>

<style lang="postcss" scoped>
.widget-data-table {
    display: flex;
    flex-direction: column;
    .p-data-loader {
        flex-grow: 1;
        flex-shrink: 0;

        .full & {
            min-height: 8rem;
        }
    }
    .table-container {
        @apply overflow-auto w-full;
    }
    table {
        @apply min-w-full;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
        &.ellipsis-table {
            @apply w-full;
        }
        &.table-overflow-x-scroll {
            overflow-x: auto;
        }
    }
    thead {
        tr {
            position: sticky;
            top: 0;
            z-index: 1;
        }
    }
    th {
        @apply border-t border-b-2 border-gray-200 text-gray-600;
        line-height: 1.25rem;
        font-size: 0.75rem;
        font-weight: 700;
        letter-spacing: 0;
        white-space: nowrap;

        .th-contents {
            @apply flex justify-between;
            padding: 0.25rem 0 0.25rem 1rem;
            line-height: 2;
            .th-text {
                @apply inline-block items-center gap-1;
                width: 100%;
                white-space: pre-line;
                word-break: break-all;
                text-align: right;
                line-height: 1.25;
                .usage-unit {
                    margin-left: 0.25rem;
                }
            }
            &.right {
                justify-content: flex-end;
                padding-right: 1rem;
            }
        }
        .tooltip-icon {
            @apply float-right my-px;
        }

        &.fix-width {
            @apply min-w-19;
        }
        &:first-child {
            .th-contents {
                .th-text {
                    text-align: left;
                }
            }
        }
        &:last-child {
            .th-contents:not(.has-icon) {
                padding-right: 1rem;
            }
        }
        &.all-select {
            @apply py-1 pl-4;
            width: 2.5rem;
            min-width: 2.5rem;
            max-width: 2.5rem;
        }
    }
    tbody {
        .no-data-wrapper {
            position: absolute;
            width: 100%;
            height: calc(100% - 2rem);
            max-height: 12.875rem;
        }
        tr {
            &:nth-child(odd) {
                @apply bg-gray-100;
            }
            &:hover {
                background-color: rgba(theme('colors.gray.200'), 0.7);
            }
        }
    }
    td {
        @apply px-4 z-0 align-middle min-w-28 text-sm;

        &:hover {
            @apply bg-gray-200;
        }

        .detail-item-wrapper {
            @apply flex justify-between items-center;

            .td-contents {
                @apply inline-flex gap-2;
                width: 100%;

                .toggle-button {
                    cursor: pointer;
                    margin-right: -0.25rem;
                    &.disable-toggle {
                        cursor: default;
                    }
                }

                .rapid-increase {
                    @apply text-red-500 inline-flex justify-center gap-1;
                }

                .link {
                    @apply text-blue-600 underline;
                    cursor: pointer;
                }
            }

            .detail {
                @apply text-blue-700;
                cursor: pointer;
            }
        }
        &.has-width {
            word-break: break-word;
        }
        &.right {
            @apply text-right;
            .td-contents {
                @apply justify-end;
            }
        }
        &.detail-item:hover {
            @apply bg-blue-100;
            .detail {
                @apply underline;
            }
        }

        &.sm {
            height: 1.75rem;
        }
        &.md {
            height: 2.125rem;
        }

        i, span, div, input, textarea, article, main, ul, li {
            vertical-align: baseline;
        }
    }

    .table-pagination-wrapper {
        flex-shrink: 0;
        text-align: center;
    }

    .ellipsis-box {
        @apply truncate;
        width: 100%;
    }
}
</style>
