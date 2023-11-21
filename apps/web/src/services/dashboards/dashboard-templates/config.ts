import getRandomId from '@/lib/random-id-generator';

import type { DashboardTemplate } from '@/services/dashboards/config';
import type { DashboardLayoutWidgetInfo } from '@/services/dashboards/widgets/_configs/config';
import { WIDGET_SIZE } from '@/services/dashboards/widgets/_configs/config';

export type DefaultDashboardPreviewTemplate = Pick<DashboardTemplate, 'name'|'version'|'labels'|'description'>;

export const ERROR_CASE_WIDGET_INFO: DashboardLayoutWidgetInfo = {
    widget_key: getRandomId(),
    title: 'Error',
    widget_name: 'widgetError',
    widget_options: {},
    size: WIDGET_SIZE.md,
    version: '1',
    inherit_options: {},
};