import type { WidgetThemeOption, WidgetThemeAssignedList } from '@/services/_shared/dashboard/dashboard-detail/constants/widget-container-config';
import { WIDGET_THEMES } from '@/services/_shared/dashboard/dashboard-detail/legacy/widgets/_types/widget-type';

const WIDGET_THEME_LEN = WIDGET_THEMES.length;

// function for circular array
const circular = (n: number): number => (n % WIDGET_THEME_LEN + WIDGET_THEME_LEN) % WIDGET_THEME_LEN;

export const widgetThemeAssigner = (widgetThemeOptionList: Array<WidgetThemeOption>): WidgetThemeAssignedList => {
    let themeIndex = 0;
    const widgetThemeAssignedList: WidgetThemeAssignedList = [];

    widgetThemeOptionList.forEach((option: WidgetThemeOption) => {
        if (option?.inherit && typeof option?.inherit_count === 'number') {
            widgetThemeAssignedList.push(WIDGET_THEMES[circular(themeIndex)]);
            themeIndex += option.inherit_count;
        }
        if (option?.inherit && typeof option?.inherit_count === 'undefined') {
            widgetThemeAssignedList.push(WIDGET_THEMES[circular(themeIndex)]);
            themeIndex += 5;
        }
        if (!option?.inherit) {
            widgetThemeAssignedList.push(undefined);
        }
    });

    return widgetThemeAssignedList;
};
