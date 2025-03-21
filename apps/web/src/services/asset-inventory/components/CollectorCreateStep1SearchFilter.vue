<template>
    <div class="left-area">
        <div v-if="state.isLaptopView"
             class="radio-container"
        >
            <div class="provider">
                <p-field-title class="title">
                    Provider
                </p-field-title>
                <p-radio-group direction="vertical">
                    <p-radio v-for="provider in state.providerList"
                             :key="provider.name"
                             :selected="state.selectedProvider"
                             :value="provider.name"
                             class="provider-item"
                             @change="handleChangeProvider"
                    >
                        <div class="content-menu-item">
                            <p-lazy-img v-if="provider.name !== 'all'"
                                        width="1.25rem"
                                        height="1.25rem"
                                        error-icon="ic_cloud-filled"
                                        :src="provider.img"
                                        class="mr-1"
                            />{{ provider.label }}
                        </div>
                    </p-radio>
                </p-radio-group>
            </div>
            <div class="repository">
                <p-field-title class="title">
                    Repository
                </p-field-title>
                <p-radio-group direction="vertical">
                    <p-radio v-for="repo in state.repositoryList"
                             :key="repo.name"
                             v-model="state.selectedRepository"
                             :value="repo.name"
                             class="repository-item"
                    >
                        <div class="content-menu-item"
                             :style="{color: repo.color}"
                        >
                            <p-i v-if="repo.icon"
                                 :name="repo.icon"
                                 :color="repo.color"
                                 width="1.25rem"
                                 height="1.25rem"
                                 class="mr-1"
                            />{{ repo.label }}
                        </div>
                    </p-radio>
                </p-radio-group>
            </div>
        </div>
        <div v-else
             class="dropdown-container"
        >
            <div class="provider">
                <p-select-dropdown :selected="state.selectedProvider"
                                   :menu="state.providerList"
                                   class="select-dropdown"
                                   is-fixed-width
                                   @update:selected="handleChangeProvider"
                >
                    <template #dropdown-button="item">
                        <span v-if="item"
                              class="content-menu-placeholder"
                        >
                            <p-lazy-img v-if="item.name !== 'all'"
                                        width="1rem"
                                        height="1rem"
                                        error-icon="ic_cloud-filled"
                                        :src="item.img"
                                        class="mr-1"
                            /><span>{{ item.label }}</span>
                        </span>
                    </template>
                    <template #menu-item--format="{ item }">
                        <div class="content-menu-item">
                            <p-lazy-img v-if="item.name !== 'all'"
                                        width="1rem"
                                        height="1rem"
                                        error-icon="ic_cloud-filled"
                                        :src="item.img"
                                        class="mr-1"
                            /><span>{{ item.label }}</span>
                        </div>
                    </template>
                </p-select-dropdown>
            </div>
            <div class="repository">
                <p-select-dropdown :selected.sync="state.selectedRepository"
                                   :menu="state.repositoryList"
                                   is-fixed-width
                                   class="select-dropdown"
                >
                    <template #dropdown-button="item">
                        <div class="content-menu-placeholder">
                            <span>{{ item.label }}</span>
                        </div>
                    </template>
                    <template #menu-item--format="{ item }">
                        <div class="content-menu-item">
                            <span>{{ item.label }}</span>
                        </div>
                    </template>
                </p-select-dropdown>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useWindowSize } from '@vueuse/core';
import { computed, reactive, watch } from 'vue';

import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import {
    PFieldTitle, PRadioGroup, PRadio, PLazyImg, PSelectDropdown, PI, screens,
} from '@cloudforet/mirinae';
import type { MenuItem } from '@cloudforet/mirinae/types/controls/context-menu/type';


import type { ListResponse } from '@/api-clients/_common/schema/api-verbs/list';
import type { RepositoryListParameters } from '@/schema/repository/repository/api-verbs/list';
import type { RepositoryModel } from '@/schema/repository/repository/model';

import { useAllReferenceStore } from '@/store/reference/all-reference-store';
import type { ProviderReferenceMap } from '@/store/reference/provider-reference-store';

import ErrorHandler from '@/common/composables/error/errorHandler';

import { repositoryColorMap, repositoryIconMap } from '@/services/asset-inventory/constants/collector-constant';
import {
    useCollectorFormStore,
} from '@/services/asset-inventory/stores/collector-form-store';



const collectorFormStore = useCollectorFormStore();
const collectorFormState = collectorFormStore.state;
const allReferenceStore = useAllReferenceStore();

const emit = defineEmits<{(e:'selectRepository', repository: string):void}>();
const { width } = useWindowSize();

const state = reactive({
    providers: computed<ProviderReferenceMap>(() => allReferenceStore.getters.provider),
    providerList: computed(() => [
        { name: 'all', label: 'All Providers', img: undefined },
        ...Object.keys(state.providers).map((k) => ({
            label: state.providers[k].name,
            name: k,
            img: state.providers[k]?.icon,
        })),
        { name: 'etc', label: 'ETC', img: undefined },
    ]),
    selectedProvider: computed(() => collectorFormState.provider ?? 'all'),
    repositories: [],
    repositoryList: computed<MenuItem[]>(() => ([
        {
            name: 'all', label: 'All Repository', icon: null, color: null,
        },
        ...state.repositories.map((repo: RepositoryModel) => ({
            label: repo.name,
            name: repo.repository_id,
            icon: repositoryIconMap[repo.repository_type],
            color: repositoryColorMap[repo.repository_type],
            iconColor: repositoryColorMap[repo.repository_type],
        })),
    ])),
    selectedRepository: 'all',
    isLaptopView: computed<boolean>(() => width.value > screens.tablet.max),
});

const getRepositories = async () => {
    try {
        const res = await SpaceConnector.clientV2.repository.repository.list<RepositoryListParameters, ListResponse<RepositoryModel>>();
        state.repositories = res.results;
    } catch (e) {
        ErrorHandler.handleError(e);
        state.repositories = [];
    }
};

const handleChangeProvider = (provider) => {
    const providerValue = provider === 'all' ? null : provider;
    collectorFormStore.setProvider(providerValue);
};

watch(() => state.selectedRepository, (repository) => {
    emit('selectRepository', repository);
});

(async () => {
    await getRepositories();
})();

</script>

<style lang="postcss" scoped>
.left-area {
    width: 14.125rem;
    .content-menu-item {
        @apply inline-flex items-center text-label-md;
        margin-left: 0.25rem;
    }

    .content-menu-placeholder {
        @apply inline-flex items-center;
        line-height: 1.5;
        margin-left: 0.25rem;
        width: 100%;

        span {
            @apply truncate;
        }
    }

    .select-dropdown {
        width: 100%;
    }

    .provider {
        @apply flex flex-col;
        gap: 0.75rem;
        margin-bottom: 1.625rem;
    }

    .repository {
        @apply flex flex-col;
        gap: 0.75rem;
    }
    .radio-container {
        height: calc(100vh - 17rem);
        overflow-y: auto;
    }

    .dropdown-container {
        width: 100%;
    }
}

@screen tablet {
    flex-direction: column;

    .left-area {
        width: 100%;
        .dropdown-container {
            display: flex;
            gap: 1rem;
        }
    }
}

@screen mobile {
    .left-area {
        .dropdown-container {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
            width: 100%;
        }
    }
}
</style>

