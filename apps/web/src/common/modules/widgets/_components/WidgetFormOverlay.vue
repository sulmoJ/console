<script lang="ts" setup>
import {
    computed, onMounted, reactive, watch,
} from 'vue';
import type { TranslateResult } from 'vue-i18n';

import { SpaceConnector } from '@cloudforet/core-lib/space-connector';
import {
    PButton, PButtonModal, POverlayLayout, PTextButton,
} from '@cloudforet/mirinae';


import type { PrivateWidgetDeleteParameters } from '@/schema/dashboard/private-widget/api-verbs/delete';
import type { PrivateWidgetUpdateParameters } from '@/schema/dashboard/private-widget/api-verbs/update';
import type { PublicWidgetDeleteParameters } from '@/schema/dashboard/public-widget/api-verbs/delete';
import type { PublicWidgetUpdateParameters } from '@/schema/dashboard/public-widget/api-verbs/update';
import { i18n } from '@/translations';

import ErrorHandler from '@/common/composables/error/errorHandler';
import WidgetFormOverlayStep1 from '@/common/modules/widgets/_components/WidgetFormOverlayStep1.vue';
import WidgetFormOverlayStep2 from '@/common/modules/widgets/_components/WidgetFormOverlayStep2.vue';
import { useWidgetGenerateStore } from '@/common/modules/widgets/_store/widget-generate-store';

import { useDashboardDetailInfoStore } from '@/services/dashboards/stores/dashboard-detail-info-store';


const dashboardDetailStore = useDashboardDetailInfoStore();
const dashboardDetailState = dashboardDetailStore.state;
const widgetGenerateStore = useWidgetGenerateStore();
const widgetGenerateGetters = widgetGenerateStore.getters;
const widgetGenerateState = widgetGenerateStore.state;
const state = reactive({
    sidebarTitle: computed(() => {
        if (widgetGenerateState.overlayType === 'EXPAND') return undefined;
        let _title = i18n.t('COMMON.WIDGETS.ADD_WIDGET');
        if (widgetGenerateState.overlayType === 'EDIT') {
            _title = i18n.t('COMMON.WIDGETS.EDIT_WIDGET');
        }
        let _subTitle = i18n.t('COMMON.WIDGETS.SET_DATA_SOURCE');
        if (widgetGenerateState.overlayStep === 2) {
            _subTitle = i18n.t('COMMON.WIDGETS.SET_CHART_OPTIONS');
        }
        return `${_title} - ${_subTitle}`;
    }),
    buttonText: computed<TranslateResult>(() => {
        if (widgetGenerateState.overlayStep === 1) return i18n.t('COMMON.WIDGETS.CONFIGURE_WIDGET');
        return i18n.t('COMMON.WIDGETS.DONE');
    }),
    isAllValid: computed<boolean>(() => {
        if (widgetGenerateState.overlayStep === 1) return !!widgetGenerateState.selectedDataTableId;
        if (widgetGenerateState.overlayStep === 2) {
            return widgetGenerateGetters.isAllWidgetFormValid;
        }
        return false;
    }),
    warningModalVisible: false,
    warningModalTitle: computed(() => {
        if (widgetGenerateState.widget?.state === 'CREATING') return i18n.t('COMMON.WIDGETS.FORM.CREATING_WIDGET_WARNING_MODAL_TITLE');
        if (widgetGenerateState.widget?.state === 'INACTIVE' || state.isWidgetOptionsChanged) return i18n.t('COMMON.WIDGETS.FORM.INACTIVE_WIDGET_WARNING_MODAL_TITLE');
        return '';
    }),
    warningModalDescription: computed(() => {
        if (widgetGenerateState.widget?.state === 'CREATING') return i18n.t('COMMON.WIDGETS.FORM.CREATING_WIDGET_WARNING_MODAL_DESC');
        if (widgetGenerateState.widget?.state === 'INACTIVE' || state.isWidgetOptionsChanged) return i18n.t('COMMON.WIDGETS.FORM.INACTIVE_WIDGET_WARNING_MODAL_DESC');
        return '';
    }),
    isWidgetOptionsChanged: false,
    guideLink: computed(() => {
        const locale = i18n.locale;
        if (locale === 'en') return 'https://cloudforet.io/docs/guides/dashboards';
        return `https://cloudforet.io/${i18n.locale}/docs/guides/dashboards`;
    }),
});

/* Api */
const deleteWidget = async (widgetId: string) => {
    if (!widgetId) return;
    const isPrivate = dashboardDetailState.dashboardId?.startsWith('private');
    const fetcher = isPrivate
        ? SpaceConnector.clientV2.dashboard.privateWidget.delete<PrivateWidgetDeleteParameters>
        : SpaceConnector.clientV2.dashboard.publicWidget.delete<PublicWidgetDeleteParameters>;
    try {
        await fetcher({
            widget_id: widgetId,
        });
    } catch (e) {
        ErrorHandler.handleError(e);
    }
};

/* Event */
const handleClickContinue = async () => {
    if (widgetGenerateState.overlayStep === 1) {
        if (widgetGenerateState.widget?.data_table_id !== widgetGenerateState.selectedDataTableId) {
            const _updateParams: PublicWidgetUpdateParameters|PrivateWidgetUpdateParameters = {
                widget_id: widgetGenerateState.widgetId,
                data_table_id: widgetGenerateState.selectedDataTableId,
            };
            if (widgetGenerateState.widget?.state === 'ACTIVE') {
                _updateParams.state = 'INACTIVE';
            }
            if (widgetGenerateState.widget?.options?.widgetHeader) {
                _updateParams.options = {
                    widgetHeader: widgetGenerateState.widget?.options?.widgetHeader,
                };
            }
            await widgetGenerateStore.updateWidget(_updateParams);
        }
        widgetGenerateStore.setOverlayStep(2);
        return;
    }
    if (widgetGenerateState.widget?.state === 'CREATING' || widgetGenerateState.widget?.state === 'INACTIVE' || state.isWidgetOptionsChanged) {
        state.warningModalVisible = true;
        return;
    }
    widgetGenerateStore.setShowOverlay(false);
};
const handleCloseOverlay = (value: boolean) => {
    if (!value && (widgetGenerateState.widget?.state === 'CREATING' || widgetGenerateState.widget?.state === 'INACTIVE' || state.isWidgetOptionsChanged)) {
        state.warningModalVisible = true;
        return;
    }
    widgetGenerateStore.setShowOverlay(value);
};
const handleCloseWarningModal = () => {
    state.warningModalVisible = false;
};
const handleConfirmWarningModal = async () => {
    state.warningModalVisible = false;
    if (widgetGenerateState.widget?.state === 'CREATING') await deleteWidget(widgetGenerateState.widgetId);
    widgetGenerateStore.reset();
    widgetGenerateStore.setShowOverlay(false);
};
const handleWatchOptionsChanged = (isChanged: boolean) => {
    state.isWidgetOptionsChanged = isChanged;
};
const handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Escape' && widgetGenerateState.overlayType === 'EXPAND') {
        widgetGenerateStore.setShowOverlay(false);
    }
};
const handleClickGuideLink = () => { window.open(state.guideLink, '_blank'); };


/* Watcher */
watch(() => widgetGenerateState.showOverlay, async (val) => {
    if (!val && widgetGenerateState.widget?.state !== 'CREATING') {
        widgetGenerateStore.setLatestWidgetId(widgetGenerateState.widgetId);
        widgetGenerateStore.reset();
    } else if (val && widgetGenerateState.overlayType !== 'ADD') {
        await widgetGenerateStore.listDataTable();
    }
});

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
});
</script>

<template>
    <div>
        <p-overlay-layout :visible="widgetGenerateState.showOverlay"
                          :style-type="widgetGenerateState.overlayType === 'EXPAND' ? 'secondary' : 'primary'"
                          size="full"
                          :title="state.sidebarTitle"
                          :hide-header="widgetGenerateState.overlayType === 'EXPAND'"
                          @close="handleCloseOverlay"
        >
            <template #title-right-extra>
                <div v-if="widgetGenerateState.overlayType !== 'EDIT'"
                     class="guide-button-wrapper"
                >
                    <p-text-button style-type="highlight"
                                   icon-right="ic_external-link"
                                   @click="handleClickGuideLink"
                    >
                        {{ $t('COMMON.WIDGETS.DATA_TABLE.GUIDE_LINK_TEXT') }}
                    </p-text-button>
                </div>
            </template>
            <widget-form-overlay-step1 v-if="widgetGenerateState.overlayStep === 1" />
            <widget-form-overlay-step2 v-if="widgetGenerateState.overlayStep === 2"
                                       @watch-options-changed="handleWatchOptionsChanged"
            />
            <template v-if="widgetGenerateState.overlayType !== 'EXPAND'"
                      #footer
            >
                <div class="footer-wrapper">
                    <portal-target name="apply-button" />
                    <p-button :style-type="widgetGenerateState.overlayStep === 1 ? 'substitutive' : 'primary'"
                              :icon-right="widgetGenerateState.overlayStep === 1 ? 'ic_arrow-right' : undefined"
                              :disabled="!state.isAllValid"
                              @click="handleClickContinue"
                    >
                        {{ state.buttonText }}
                    </p-button>
                </div>
            </template>
        </p-overlay-layout>
        <p-button-modal :header-title="state.warningModalTitle"
                        :visible.sync="state.warningModalVisible"
                        size="sm"
                        :fade="true"
                        :backdrop="true"
                        theme-color="alert"
                        @confirm="handleConfirmWarningModal"
                        @cancel="handleCloseWarningModal"
        >
            <template #body>
                <p>{{ state.warningModalDescription }}</p>
            </template>
        </p-button-modal>
    </div>
</template>

<style lang="scss" scoped>
.footer-wrapper {
    @apply border-t border-gray-200;
    display: flex;
    align-items: center;
    justify-content: right;
    gap: 0.5rem;
    padding-right: 1.5rem;
}
.guide-button-wrapper {
    padding-left: 0.5rem;
}
</style>
