<template>
    <div class="sign-in-right-container">
        <console-logo v-if="isMobileSize"
                      :position-fixed="false"
                      class="logo"
        />
        <div class="form-wrapper">
            <div class="headline-wrapper">
                <p class="title">
                    {{ $t('COMMON.SIGN_IN.SIGN_IN') }}
                </p>
                <div v-if="showErrorMessage"
                     class="error-msg-box"
                >
                    <span class="error-msg">{{ errorMessage }}</span>
                    <p-i name="ic_close"
                         width="1.5rem"
                         height="1.5rem"
                         class="cursor-pointer"
                         color="inherit"
                         @click="hideErrorMessage"
                    />
                </div>
            </div>

            <slot name="input" />
        </div>
    </div>
</template>

<script lang="ts">
import { useWindowSize } from '@vueuse/core/index';
import {
    computed, reactive, toRefs,
} from 'vue';
import { useRoute, useRouter } from 'vue-router/composables';

import {
    PI, screens,
} from '@cloudforet/mirinae';

import { i18n } from '@/translations';

import { useDisplayStore } from '@/store/display/display-store';
import { useDomainStore } from '@/store/domain/domain-store';

import ConsoleLogo from '@/services/auth/components/ConsoleLogo.vue';


export default {
    name: 'SignInRightContainer',
    components: {
        ConsoleLogo,
        PI,
    },
    props: {
        showErrorMessage: {
            type: Boolean,
            default: false,
        },
    },
    setup() {
        const router = useRouter();
        const route = useRoute();

        const domainStore = useDomainStore();
        const displayStore = useDisplayStore();
        const { width } = useWindowSize();
        const state = reactive({
            symbolImage: computed<string|undefined>(() => domainStore.getters.domainSymbolImage),
            isMobileSize: computed<boolean>(() => width.value < screens.mobile.max),
            errorMessage: computed<string>(() => {
                const signInBlockMessage = i18n.t('COMMON.SIGN_IN.SIGN_IN_BLOCK_MESSAGE');
                const basicMessage = i18n.t('COMMON.SIGN_IN.ALT_E_SIGN_IN');
                const signInAPIErrorMessage = displayStore.state.signInFailedMessage;
                if (signInAPIErrorMessage.includes('Login is blocked')) {
                    return signInBlockMessage;
                }
                return basicMessage;
            }),
        });

        /* event */
        const hideErrorMessage = () => {
            if (route.query.error) router.replace({ query: { error: null } });
            displayStore.setIsSignInFailed(false);
        };

        return {
            ...toRefs(state),
            hideErrorMessage,
        };
    },
};
</script>

<style lang="postcss" scoped>
.sign-in-right-container {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow-y: auto;
    align-items: center;
    padding: 2.5rem;

    .logo {
        display: inline-flex;
        margin-left: -2rem;
    }

    .form-wrapper {
        @apply border border-gray-200 rounded-lg;
        position: relative;
        align-self: center;
        background-color: white;
        width: 28.5rem;
        margin: auto;
        padding: 2rem;

        .headline-wrapper {
            @apply relative;
            margin-bottom: 0.5rem;
            .logo-character {
                max-width: 6rem;
                width: 25%;
                margin-bottom: calc((15rem / 3) / 2 - 0.5rem);
                margin-left: auto;
                margin-right: auto;
            }
            .title {
                @apply text-display-md text-gray-900 font-bold;
                margin-bottom: 1.5rem;
            }
            .error-msg-box {
                @apply absolute bg-red-100 text-red-500 rounded;
                display: flex;
                justify-content: space-between;
                right: 0;
                top: -0.5rem;
                left: 0;
                min-height: 2.25rem;
                padding: 0.5rem;

                .error-msg {
                    font-size: 0.875rem;
                    line-height: 140%;
                }

                @media screen and (width < 478px) {
                    position: absolute;
                    height: 3.5rem;
                    z-index: 1;
                    margin-top: -4rem;
                }
            }
        }
    }

    @screen mobile {
        padding: 2rem 1.5rem;

        .form-wrapper {
            width: 100%;
            margin-top: 1.75rem;
            padding: 2rem 1rem;
        }
    }
}
</style>
