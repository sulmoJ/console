/* eslint-disable @typescript-eslint/no-var-requires */
const spaceoneTailwindConfig = require('postcss-config-custom/tailwind.config.cjs');

module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx,vue}",
    ],
    theme: spaceoneTailwindConfig.theme,
    variants: spaceoneTailwindConfig.variants,
    plugins: spaceoneTailwindConfig.plugins,
};
