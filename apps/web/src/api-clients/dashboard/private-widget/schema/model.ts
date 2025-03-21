import type { Tags } from '@/api-clients/_common/schema/model';

import type { WidgetFieldValue } from '@/common/modules/widgets/_widget-field-value-manager/type';
import type { WidgetSize } from '@/common/modules/widgets/types/widget-display-type';
import type { WidgetFieldName } from '@/common/modules/widgets/types/widget-field-type';
import type { WidgetFieldValues } from '@/common/modules/widgets/types/widget-field-value-type';
import type { WidgetType, WidgetState } from '@/common/modules/widgets/types/widget-model';


export interface PrivateWidgetModel {
    dashboard_id: string;
    user_id: string;
    widget_id: string;
    size: WidgetSize;
    data_table_id: string;
    widget_type: WidgetType;
    options: Record<WidgetFieldName, WidgetFieldValue<WidgetFieldValues>>;
    tags: Tags;
    workspace_id?: string;
    domain_id?: string;
    created_at: string;
    updated_at: string;
    state: WidgetState;
}
