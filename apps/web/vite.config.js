import path from 'path';
import process from 'process';

import vuePlugin from '@vitejs/plugin-vue2';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import StylelintPlugin from 'vite-plugin-stylelint';
import VueTypeImports from 'vite-plugin-vue-type-imports';

export default defineConfig(async ({ command, mode }) => {
    process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
    if (command === 'serve') console.log('serve mode');
    else console.log('build mode');

    return {
        optimizeDeps: {
            include: [
                '@cloudforet/mirinae/tailwind.config.cjs',
                'prosemirror-state',
                'prosemirror-transform',
                'prosemirror-model',
                'prosemirror-view',
            ],
        },
        plugins: [
            vuePlugin(),
            VueTypeImports(),
            StylelintPlugin({
                include: ['src/**/*.{css,vue,pcss,scss}'],
                exclude: ['node_modules'],
                lintOnStart: false,
                emitErrorAsWarning: true,
            }),
            ...(process.env.NODE_ENV === 'production' ? [] : [visualizer({
                emitFile: true,
                filename: 'stats.html',
            })]),
            visualizer({
                filename: './dist/report.html',
                open: true,
                brotliSize: true,
                sourcemap: false,
                gzipSize: true,
            }),
        ],
        build: {
            rollupOptions: {
                external: ['@cloudforet/mirinae/css/*'],
                output: {
                    // eslint-disable-next-line consistent-return
                    manualChunks(id) {
                        if (id.includes('node_modules')) {
                            const chunks = id.split('node_modules/')[1].split('/');
                            return chunks[0] === '@' ? `${chunks[0]}/${chunks[1]}` : chunks[0];
                        }
                    },
                },
            },
        },
        server: { port: 8080 },
        preview: { port: 8080 },
        test: {
            globals: true,
            environment: 'jsdom',
            include: ['./src/**/__tests__/**/*.+(ts|js)'],
            coverage: {
                provider: 'istanbul',
            },
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@cloudforet/core-lib': path.resolve(__dirname, '../../packages/core-lib/dist/'),
                '@cloudforet/utils': path.resolve(__dirname, '../../packages/utils/dist/'),
                '@cloudforet/language-pack': path.resolve(__dirname, '../../packages/language-pack/'),
                vue: path.resolve(__dirname, '../../node_modules/vue/dist/vue.js'),
            },
        },
        define: {
            VITE_APP_VER: JSON.stringify(process.env.npm_package_version),
            // Add env variables here
            // Usage references => SignInLeftContainer.vue / env.d.ts
        },
    };
});
