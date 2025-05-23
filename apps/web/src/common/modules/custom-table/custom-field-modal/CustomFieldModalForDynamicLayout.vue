<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import draggable from 'vuedraggable';

import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import {
    PButton, PButtonModal, PCheckbox, PDataLoader, PSearch,
} from '@cloudforet/mirinae';
import type { DynamicField } from '@cloudforet/mirinae/types/data-display/dynamic/dynamic-field/type/field-schema';

import type { UserType } from '@/api-clients/identity/user/schema/type';
import { i18n } from '@/translations';

import { useAppContextStore } from '@/store/app-context/app-context-store';
import { useUserStore } from '@/store/user/user-store';

import { showSuccessMessage } from '@/lib/helper/notice-alert-helper';

import ErrorHandler from '@/common/composables/error/errorHandler';
import { useProxyValue } from '@/common/composables/proxy-state';
import { TAGS_OPTIONS, TAGS_PREFIX } from '@/common/modules/custom-table/custom-field-modal/config';
import ColumnItemForDynamicLayout from '@/common/modules/custom-table/custom-field-modal/modules/ColumnItemForDynamicLayout.vue';

import { convertAgentModeOptions } from '@/services/service-account/helpers/agent-mode-helper';
import { getServiceAccountTableSchema, updateCustomTableSchema } from '@/services/service-account/helpers/dynamic-ui-schema-generator';
import type {
    GetSchemaParams,
    ResourceType,
} from '@/services/service-account/helpers/dynamic-ui-schema-generator/type';

const SelectCloudServiceTagColumns = () => import('@/common/modules/custom-table/custom-field-modal/modules/SelectCloudServiceTagColumns.vue');
const SelectTagColumns = () => import('@/common/modules/custom-table/custom-field-modal/modules/SelectTagColumns.vue');

interface Props {
    visible?: boolean;
    resourceType?: ResourceType;
    options?: {
        provider?: string;
        cloudServiceGroup?: string;
        cloudServiceType?: string;
        include_workspace_info?: boolean;
    };
    isServerPage?: boolean;
}

type SelectedColumnMap = Record<string, DynamicField>;

/**
 * @description Merge two field lists. Duplicate check is performed based on key, and the field list given as the first parameter takes precedence.
 * @param fieldsA
 * @param fieldsB
 */
const mergeFields = (fieldsA: DynamicField[], fieldsB: DynamicField[]): DynamicField[] => {
    const allColumns: any[] = [...fieldsA];
    fieldsB.forEach((d) => {
        const isExist = fieldsA.some((c) => c.key === d.key);
        if (!isExist) allColumns.push(d);
    });
    return allColumns;
};

const props = withDefaults(defineProps<Props>(), {
    visible: false,
    resourceType: undefined,
    options: () => ({}),
    isServerPage: false,
});

const emit = defineEmits<{(e: 'complete'): void;
    (e: 'update:selected-tag-keys', tagKeys: string[]): void;
}>();


const appContextStore = useAppContextStore();
const appContextGetters = appContextStore.getters;
const userStore = useUserStore();

let schema: any = {};

const storeState = reactive({
    userId: computed<string|undefined>(() => userStore.state.userId),
    userType: computed<UserType|undefined>(() => userStore.state.userType),
});
const state = reactive({
    proxyVisible: useProxyValue('visible', props, emit),
    search: '',
    isAllSelected: computed(() => state.selectedColumns.length === state.allColumns.length),
    loading: true,
    availableColumns: [] as DynamicField[], // all default fields including optional fields.
    currentColumns: [] as DynamicField[], // if custom fields exist, it will be custom fields. if custom fields don't exist, it will be default fields excluding optional fields.
    allColumns: [] as DynamicField[], // fields merged with availableColumns and currentColumns
    selectedColumnMap: {} as SelectedColumnMap,
    selectedColumns: computed<DynamicField[]>({
        get: () => state.allColumns.filter((d) => !!state.selectedColumnMap[d.key]),
        set: (val: DynamicField[]) => {
            const selectedMap: SelectedColumnMap = {};
            const tagColumns: DynamicField[] = [];
            val.forEach((d) => {
                selectedMap[d.key] = d;
                if (d.key.startsWith(TAGS_PREFIX)) tagColumns.push(d);
            });

            state.allColumns = mergeFields(state.allColumns, tagColumns)
                .filter((d) => (d.key.startsWith(TAGS_PREFIX) ? !!selectedMap[d.key] : true));
            state.selectedColumnMap = selectedMap;
        },
    }),
    selectedAllColumnKeys: computed<string[]>(() => state.selectedColumns.map((d) => d.key)),
    selectedNonTagKeys: computed<string[]>(() => state.selectedAllColumnKeys.filter((key) => !key.startsWith(TAGS_PREFIX))),
    selectedTagKeys: computed<string[]>(() => state.selectedAllColumnKeys.filter((key) => key.startsWith(TAGS_PREFIX))),
    recommendedSequenceMap: computed<Record<string, number>>(() => {
        const orderMap: Record<string, number> = {};
        state.availableColumns.forEach((d, i) => {
            orderMap[d.key] = i;
        });
        return orderMap;
    }),
    isValid: computed(() => state.loading || state.selectedColumns.length > 0),
    isResourceTypeCloudService: computed(() => props.resourceType === 'inventory.CloudService'),
    isServiceAccountTable: computed(() => ['identity.ServiceAccount', 'identity.TrustedAccount'].includes(props.resourceType ?? '')),
});

const sortByRecommendation = () => {
    state.allColumns = state.allColumns.sort((a, b) => {
        if (!state.selectedColumnMap[a.key]) return 1;
        if (!state.selectedColumnMap[b.key]) return -1;
        if (state.recommendedSequenceMap[a.key] === undefined) return 1;
        if (state.recommendedSequenceMap[b.key] === undefined) return -1;
        return state.recommendedSequenceMap[a.key] - (state.recommendedSequenceMap[b.key]);
    });
};

const sortByAlphabet = () => {
    state.allColumns = state.allColumns.sort((a, b) => {
        const nameA = a.name.toUpperCase();
        const nameB = b.name.toUpperCase();
        if (!state.selectedColumnMap[a.key]) return 1;
        if (!state.selectedColumnMap[b.key]) return -1;
        if (nameA < nameB) return -1;
        if (nameA > nameB) return 1;
        return 0;
    });
};

const onChangeAllSelect = (val) => {
    if (val) {
        state.selectedColumns = [...state.allColumns];
    } else {
        state.selectedColumns = [];
    }
};

const getColumns = async (includeOptionalFields = false): Promise<DynamicField[]> => {
    try {
        const options: GetSchemaParams['options'] = {
            include_optional_fields: includeOptionalFields,
            isAdminMode: appContextGetters.isAdminMode,
        };
        const {
            provider, cloudServiceGroup, cloudServiceType, include_workspace_info,
        } = props.options;
        if (provider)options.provider = provider;
        if (cloudServiceGroup) options.cloud_service_group = cloudServiceGroup;
        if (cloudServiceType) options.cloud_service_type = cloudServiceType;
        if (include_workspace_info) options.include_workspace_info = include_workspace_info;

        let res;
        if (state.isServiceAccountTable && props.resourceType) {
            res = await getServiceAccountTableSchema({
                userData: {
                    userType: storeState.userType ?? 'USER',
                    userId: storeState.userId ?? '',
                },
                resourceType: props.resourceType,
                options,
            });
            // NOTE: Temporary hard coding for agent mode, before separating or adding more agent.
            if (props.options?.provider === 'kubernetes') res.options = convertAgentModeOptions(res.options ?? {});
        } else {
            res = await SpaceConnector.client.addOns.pageSchema.get({
                resource_type: props.isServerPage ? 'inventory.Server' : props.resourceType,
                schema: 'table',
                options,
            });
        }
        /*
        * NOTE: The storage for schema config is the same for both user and admin modes, making it difficult to distinguish data on the entry level.
        * Therefore, it is segmented as follows:
        * */
        const workspaceIndex = res.options.fields.findIndex((field) => field.name === 'Workspace');
        if (!appContextGetters.isAdminMode && workspaceIndex !== -1) {
            res.options.fields.splice(workspaceIndex, 1);
        }
        schema = res;
        delete schema.options?.search;
        return res.options?.fields || [];
    } catch (e) {
        ErrorHandler.handleError(e);
        schema = {};
        return [];
    }
};

const setColumnsDefault = async () => {
    state.allColumns = state.availableColumns;
    state.selectedColumns = state.availableColumns.filter((d) => !d.options?.is_optional);
    sortByRecommendation();
};

const updatePageSchema = async () => {
    state.loading = true;

    const data = { ...schema };
    if (!data.options) data.options = {};
    data.options.fields = state.selectedColumns;

    const options: any = {};
    const { provider, cloudServiceGroup, cloudServiceType } = props.options;
    if (provider) options.provider = provider;
    if (cloudServiceGroup) options.cloud_service_group = cloudServiceGroup;
    if (cloudServiceType) options.cloud_service_type = cloudServiceType;

    try {
        if (state.isServiceAccountTable && props.resourceType) {
            await updateCustomTableSchema(
                {
                    userType: storeState.userType ?? 'USER',
                    userId: storeState.userId ?? '',
                },
                props.resourceType,
                props.options.provider ?? '',
                data,
            );
        } else {
            await SpaceConnector.client.addOns.pageSchema.update({
                resource_type: props.isServerPage ? 'inventory.Server' : props.resourceType,
                schema: 'table',
                data,
                options,
            });
        }
        showSuccessMessage(i18n.t('COMMON.CUSTOM_FIELD_MODAL.ALT_S_UPDATE_COL'), '');
        emit('complete');
        state.proxyVisible = false;
    } catch (e) {
        ErrorHandler.handleRequestError(e, i18n.t('COMMON.CUSTOM_FIELD_MODAL.ALT_E_UPDATE_COL'));
    } finally {
        state.loading = false;
    }
};


const updateSelectedKeys = (keys: string[]) => {
    state.selectedColumns = keys.map((key) => {
        if (key.startsWith(TAGS_PREFIX)) {
            const name = key.slice(TAGS_PREFIX.length);
            return {
                key,
                name,
                options: {
                    ...TAGS_OPTIONS,
                    ...(!state.isResourceTypeCloudService && { key_depth: 1 }),
                },
            } as DynamicField;
        }
        return state.availableColumns.find((col) => col.key === key) ?? { key, name: key } as DynamicField;
    });
};

const handleUpdateSelectedKeys = (keys: string[]) => {
    updateSelectedKeys(keys);
};

/* Tags */
const clearSelectedTags = () => {
    const tagKeys = state.selectedAllColumnKeys.filter((d) => !d.startsWith(TAGS_PREFIX));
    updateSelectedKeys(tagKeys);
};
const handleUpdatedSelectedTagKeys = (tagKeys: string[]) => {
    updateSelectedKeys(tagKeys.concat(state.selectedNonTagKeys));
};

/* Init */
const initColumns = async () => {
    state.loading = true;
    const [availableColumnRes, currentColumnRes] = await Promise.allSettled([getColumns(true), getColumns(false)]);
    state.availableColumns = availableColumnRes.status === 'fulfilled' ? availableColumnRes.value : [];
    state.currentColumns = currentColumnRes.status === 'fulfilled' ? currentColumnRes.value : [];
    state.allColumns = mergeFields(state.currentColumns, state.availableColumns);
    state.selectedColumns = [...state.currentColumns];
    state.loading = false;
};
watch([() => props.visible, () => props.resourceType], ([visible, resourceType]) => {
    if (visible && resourceType) {
        initColumns();
    }
}, { immediate: true });

</script>

<template>
    <p-button-modal :visible.sync="state.proxyVisible"
                    :header-title="$t('COMMON.CUSTOM_FIELD_MODAL.TITLE')"
                    :loading="state.loading"
                    :disabled="!state.isValid"
                    @confirm="updatePageSchema"
    >
        <template #body>
            <p-data-loader :loading="state.loading"
                           :min-loading-time="500"
            >
                <div class="contents-wrapper">
                    <section class="attribute-column-section">
                        <h3 class="section-title">
                            <template v-if="state.isValid">
                                {{ $t('COMMON.CUSTOM_FIELD_MODAL.ATTRIBUTE_COL') }}
                            </template>
                            <span v-else
                                  class="invalid-text"
                            >{{ $t('COMMON.CUSTOM_FIELD_MODAL.COL_REQUIRED') }}</span>
                            <p-button style-type="secondary"
                                      size="sm"
                                      @click="setColumnsDefault"
                            >
                                {{ $t('COMMON.CUSTOM_FIELD_MODAL.DEFAULT') }}
                            </p-button>
                        </h3>
                        <p-search v-model="state.search"
                                  :placeholder="$t('COMMON.CUSTOM_FIELD_MODAL.SEARCH_ATTRIBUTE_COL')"
                        />
                        <div class="sort-wrapper">
                            <label>{{ $t('COMMON.CUSTOM_FIELD_MODAL.SORT_BY') }}</label>
                            <p-button style-type="tertiary"
                                      size="sm"
                                      @click="sortByRecommendation"
                            >
                                {{ $t('COMMON.CUSTOM_FIELD_MODAL.RECOMMEND_SORT') }}
                            </p-button>
                            <p-button style-type="tertiary"
                                      size="sm"
                                      @click="sortByAlphabet"
                            >
                                {{ $t('COMMON.CUSTOM_FIELD_MODAL.ALPHABETICAL_SORT') }}
                            </p-button>
                        </div>

                        <header>
                            <p-checkbox :selected="state.isAllSelected"
                                        :value="true"
                                        @change="onChangeAllSelect"
                            />
                            <span class="text">{{ $t('COMMON.CUSTOM_FIELD_MODAL.COL_NAME') }}</span>
                        </header>

                        <div class="column-items-wrapper">
                            <draggable v-model="state.allColumns"
                                       draggable=".draggable-item"
                                       ghost-class="ghost"
                            >
                                <column-item-for-dynamic-layout v-for="(column, idx) in state.allColumns"
                                                                :key="`${column.key}-${idx}`"
                                                                :value="state.selectedAllColumnKeys"
                                                                :item="column"
                                                                :search-text="state.search"
                                                                @update:value="handleUpdateSelectedKeys"
                                />
                            </draggable>
                        </div>
                    </section>

                    <section>
                        <h3 class="section-title">
                            {{ $t('COMMON.CUSTOM_FIELD_MODAL.TAG_COL') }}
                            <p-button style-type="secondary"
                                      size="sm"
                                      @click="clearSelectedTags"
                            >
                                {{ $t('COMMON.CUSTOM_FIELD_MODAL.CLEAR_ALL') }}
                            </p-button>
                        </h3>
                        <keep-alive>
                            <select-cloud-service-tag-columns v-if="state.isResourceTypeCloudService"
                                                              :options="options"
                                                              :is-server-page="isServerPage"
                                                              :selected-tag-keys="state.selectedTagKeys"
                                                              @update:selected-tag-keys="handleUpdatedSelectedTagKeys"
                            />
                            <select-tag-columns v-else
                                                :resource-type="resourceType"
                                                :options="options"
                                                :is-server-page="isServerPage"
                                                :selected-tag-keys="state.selectedTagKeys"
                                                @update:selected-tag-keys="handleUpdatedSelectedTagKeys"
                            />
                        </keep-alive>
                    </section>
                </div>
            </p-data-loader>
        </template>
    </p-button-modal>
</template>

<style lang="postcss" scoped>
/* custom design-system component - p-button-modal */
.p-button-modal:deep() {
    .modal-content {
        height: 100vh;
        .modal-body {
            @apply flex;
            .p-data-loader {
                @apply flex-grow;
                max-height: inherit;
            }
        }
    }
}
.contents-wrapper {
    display: flex;
    width: 100%;
    height: 100%;
    max-height: inherit;
    overflow: hidden;
}

section {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-height: inherit;
    overflow: hidden;
    &:first-of-type {
        margin-right: 2rem;
    }
    .section-title {
        @apply text-gray-900;
        display: flex;
        justify-content: space-between;
        font-size: 1.125rem;
        line-height: 155%;
        margin-bottom: 0.875rem;
        .invalid-text {
            @apply text-alert;
        }
        .p-button {
            flex-shrink: 0;
        }
    }
    .sort-wrapper {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.5rem;
        margin-bottom: 0.5rem;
        label {
            @apply text-gray-500;
            flex-grow: 1;
            font-size: 0.75rem;
            line-height: 1.5;
            font-weight: bold;
        }
        .p-button {
            flex-shrink: 0;
            &:first-of-type {
                margin-right: 0.5rem;
            }
        }
    }
}

@screen mobile {
    .contents-wrapper {
        display: block;
        overflow: auto;
        height: 100%;
    }
    section {
        max-height: none;
        &:first-of-type {
            margin-right: 0;
            margin-bottom: 2rem;
        }
    }
}

.attribute-column-section {
    .p-search {
        margin-bottom: 0.531rem;
    }
    header {
        @apply border-t border-b border-gray-900 text-gray-900;
        display: flex;
        align-items: center;
        padding: 0.375rem 0.5rem;
        font-weight: bold;
        line-height: 1.2;
        font-size: 0.875rem;
        .p-checkbox {
            margin-right: 0.25rem;
        }
        .text {
            line-height: 1.5;
        }
    }

    .column-items-wrapper {
        flex-grow: 1;
        overflow: auto;
    }
}

</style>
