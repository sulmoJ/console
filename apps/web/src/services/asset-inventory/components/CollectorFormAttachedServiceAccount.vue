<script lang="ts" setup>
import { computed, reactive, watch } from 'vue';
import type { TranslateResult } from 'vue-i18n';

import { QueryHelper } from '@cloudforet/core-lib/query';
import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import {
    PFieldGroup, PRadioGroup, PRadio, PSelectDropdown, PFieldTitle, PI,
} from '@cloudforet/mirinae';
import type { MenuItem } from '@cloudforet/mirinae/types/controls/context-menu/type';
import type { AutocompleteHandler } from '@cloudforet/mirinae/types/controls/dropdown/select-dropdown/type';


import { i18n } from '@/translations';

import SelectBox from '@/common/components/select/SelectBox.vue';
import ErrorHandler from '@/common/composables/error/errorHandler';
import { useFormValidator } from '@/common/composables/form-validator';

import { red } from '@/styles/colors';

import type {
    AttachedServiceAccount,
    AttachedServiceAccountType, ServiceAccountFilterOption,
} from '@/services/asset-inventory/stores/collector-form-store';
import {
    useCollectorFormStore,
} from '@/services/asset-inventory/stores/collector-form-store';

interface Props {
    title?: TranslateResult;
    marginOnSpecific?: boolean;
    resetOnCollectorIdChange?: boolean;
}


const emit = defineEmits<{(e: 'update:isAttachedServiceAccountValid', value: boolean): void;
}>();

const props = defineProps<Props>();
const collectorFormStore = useCollectorFormStore();
const collectorFormState = collectorFormStore.state;

const attachedServiceAccountList = computed(() => [
    {
        label: i18n.t('INVENTORY.COLLECTOR.CREATE.ALL'),
        name: 'all',
    },
    {
        label: i18n.t('INVENTORY.COLLECTOR.CREATE.SPECIFIC_SERVICE_ACCOUNT'),
        name: 'specific',
    },
]);

const queryHelper = new QueryHelper();
const state = reactive({
    isAttachedServiceAccountValid: computed<boolean>(() => {
        if (invalidState.selectedAttachedServiceAccount === undefined || collectorFormState.attachedServiceAccountType === 'all') {
            return false;
        }
        return !invalidState.selectedAttachedServiceAccount;
    }),
    handlerParams: computed(() => {
        if (collectorFormState.collectorProvider) {
            queryHelper.addFilter({ k: 'provider', v: collectorFormState.collectorProvider, o: '=' });
        } else if (collectorFormState.provider) {
            queryHelper.addFilter({ k: 'provider', v: collectorFormState.provider, o: '=' });
        } else if (collectorFormState.repositoryPlugin?.provider) {
            queryHelper.addFilter({ k: 'provider', v: collectorFormState.repositoryPlugin.provider, o: '=' });
        }
        return {
            resource_type: 'identity.ServiceAccount',
            options: {
                limit: 10,
                filter: queryHelper.apiQuery.filter,
                parameters: {
                    has_secret: true,
                },
            },
        };
    }),
    includeExcludeOptionList: computed<MenuItem[]>(() => [
        {
            label: i18n.t('INVENTORY.COLLECTOR.CREATE.INCLUDE'),
            name: 'include',
        },
        {
            label: i18n.t('INVENTORY.COLLECTOR.CREATE.EXCLUDE'),
            name: 'exclude',
            icon: 'ic_minus_circle',
            iconColor: red[300],
        },
    ]),
});

const serviceAccountHandler: AutocompleteHandler = async (keyword: string) => {
    try {
        const res = await SpaceConnector.client.addOns.autocomplete.resource({
            ...state.handlerParams, search: keyword,
        });
        return {
            results: res.results.map((d) => ({ label: d.name, name: d.key })),
            totalCount: res.total_count,
        };
    } catch (e) {
        ErrorHandler.handleError(e);
        return {
            results: [],
            totalCount: 0,
        };
    }
};

const {
    forms: {
        selectedAttachedServiceAccount,
    },
    setForm,
    invalidState,
    invalidTexts,
    isAllValid,
} = useFormValidator<{selectedAttachedServiceAccount : AttachedServiceAccount}>({
    selectedAttachedServiceAccount: collectorFormState.attachedServiceAccount ?? [],
}, {
    selectedAttachedServiceAccount(value: string[]|null) {
        if (collectorFormState.attachedServiceAccountType !== 'all' && value && value.length) {
            return true;
        }
        if (collectorFormState.attachedServiceAccountType !== 'all') {
            return i18n.t('INVENTORY.COLLECTOR.CREATE.REQUIRED_FIELD');
        }
        return true;
    },
});

const handleChangeAttachedServiceAccountType = (selectedValue: AttachedServiceAccountType) => {
    collectorFormStore.$patch((_state) => {
        _state.state.attachedServiceAccountType = selectedValue;
        _state.state.attachedServiceAccount = [];
    });
};

const handleSelectAttachedServiceAccount = (selectedValue: AttachedServiceAccount) => {
    setForm('selectedAttachedServiceAccount', selectedValue);
    collectorFormStore.$patch((_state) => {
        _state.state.attachedServiceAccount = selectedValue;
    });
};

const handleSelectIncludeExcludeOption = (selectedValue: ServiceAccountFilterOption) => {
    if (!selectedValue) return;
    collectorFormStore.$patch((_state) => {
        _state.state.selectedServiceAccountFilterOption = selectedValue;
    });
};

watch(() => isAllValid.value, (value) => {
    emit('update:isAttachedServiceAccountValid', value);
}, { immediate: true });

watch(() => collectorFormState.collectorId, (collectorId) => {
    if (props.resetOnCollectorIdChange && !collectorId) return;
    collectorFormStore.resetAttachedServiceAccount();
}, { immediate: true });

watch(() => collectorFormState.provider, () => {
    setForm('selectedAttachedServiceAccount', []);
    collectorFormStore.$patch((_state) => {
        _state.state.attachedServiceAccount = [];
    });
});

watch(() => collectorFormState.attachedServiceAccount, (value) => {
    setForm('selectedAttachedServiceAccount', value);
});

</script>

<template>
    <div class="attached-service-account-form">
        <p-field-group :invalid="invalidState.selectedAttachedServiceAccount"
                       :invalid-text="invalidTexts.selectedAttachedServiceAccount"
                       :valid="state.isAttachedServiceAccountValid"
                       :required="true"
                       :class="{'margin-on-specific': props.marginOnSpecific && collectorFormState.attachedServiceAccountType === 'specific'}"
        >
            <p-field-title :label="props.title || $t('INVENTORY.COLLECTOR.CREATE.ATTACHED_SERVICE_ACCOUNT')"
                           size="lg"
                           class="mb-2"
            />
            <!-- NOTE: screen desktop size-->
            <div class="contents-container">
                <p-radio-group class="attached-service-account-radio-group">
                    <p-radio v-for="(item) in attachedServiceAccountList"
                             :key="`${item.name}`"
                             :value="item.name"
                             :selected="collectorFormState.attachedServiceAccountType"
                             @change="handleChangeAttachedServiceAccountType"
                    >
                        {{ item.label }}
                    </p-radio>
                </p-radio-group>
                <!-- NOTE: screen mobile size-->
                <p-select-dropdown class="attached-service-account-dropdown"
                                   :selected="collectorFormState.attachedServiceAccountType"
                                   :menu="attachedServiceAccountList"
                                   @update:selected="handleChangeAttachedServiceAccountType"
                />
                <div v-if="collectorFormState.attachedServiceAccountType !== 'all'">
                    <p-field-title class="specific-service-account-dropdown-label"
                                   :label="$t('INVENTORY.COLLECTOR.CREATE.SPECIFIC_SERVICE_ACCOUNT')"
                    />
                    <p-select-dropdown class="specific-service-account-dropdown"
                                       :selected="selectedAttachedServiceAccount"
                                       multi-selectable
                                       show-select-marker
                                       :handler="serviceAccountHandler"
                                       appearance-type="stack"
                                       :reset-selected-on-unmounted="false"
                                       is-filterable
                                       show-delete-all-button
                                       use-fixed-menu-style
                                       @update:selected="handleSelectAttachedServiceAccount"
                    >
                        <template #dropdown-left-area>
                            <p-i v-if="collectorFormState.selectedServiceAccountFilterOption === 'exclude'"
                                 name="ic_minus_circle"
                                 class="ml-2"
                                 width="1.25rem"
                                 heigth="1.25rem"
                                 :color="red[300]"
                            />
                        </template>
                        <template #context-menu-header>
                            <div class="include-exclude-selector">
                                <select-box v-for="item in state.includeExcludeOptionList"
                                            :key="item.name"
                                            :selected="collectorFormState.selectedServiceAccountFilterOption"
                                            :value="item.name"
                                            :icon="item.icon"
                                            :icon-color="item.iconColor"
                                            :multi-selectable="true"
                                            @change="handleSelectIncludeExcludeOption"
                                >
                                    {{ item.label }}
                                </select-box>
                            </div>
                        </template>
                    </p-select-dropdown>
                </div>
            </div>
        </p-field-group>
    </div>
</template>

<style lang="postcss" scoped>
.attached-service-account-form {
    .margin-on-specific {
        margin-bottom: 15rem;
    }

    .contents-container {
        @apply border rounded-xl border-gray-200 p-4;

        .attached-service-account-radio-group {
            display: block;
        }
        .attached-service-account-dropdown {
            width: 100%;
            display: none;
        }

        .specific-service-account-dropdown {
            margin-top: 0.5rem;
            width: 100%;

            .include-exclude-selector {
                @apply flex;
                padding: 0.75rem 0.5rem;
                border-radius: 0.25rem;
                overflow: hidden;
            }
        }

        .specific-service-account-dropdown-label {
            display: none;
        }
    }
}

@screen mobile {
    .attached-service-account-form {
        .attached-service-account-radio-group {
            display: none;
        }

        .attached-service-account-dropdown {
            display: block;
        }

        .specific-service-account-dropdown {
            margin-top: 0.3125rem;
            width: 100%;
        }
        .specific-service-account-dropdown-label {
            display: block;
            margin-top: 1rem;
        }

        .contents-container {

            .specific-service-account-dropdown {
                margin-top: 0.5rem;
                width: 100%;

                .include-exclude-selector {
                    @apply flex flex-col;
                    margin: 0.75rem 0.5rem;
                    border-radius: 0.25rem;
                    overflow: hidden;
                }
            }
        }
    }
}
</style>

