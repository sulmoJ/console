import type { ConsoleFilterOperator } from '@cloudforet/core-lib/query/type';

import type { ListResponse } from '@/api-clients/_common/schema/api-verbs/list';
import type {
    WIDGET_OPTION_FILTER_KEY_MAP, WIDGET_OPTION_KEYS,
    ASSET_DATA_FIELD_MAP, CHART_TYPE,
    COST_DATA_FIELD_MAP,
    GRANULARITY,
    WIDGET_SIZE,
} from '@/api-clients/dashboard/_constants/widget-constant';
import type { PrivateWidgetCreateParameters } from '@/api-clients/dashboard/private-widget/schema/api-verbs/create';
import type { PrivateWidgetDeleteParameters } from '@/api-clients/dashboard/private-widget/schema/api-verbs/delete';
import type { PrivateWidgetListParameters } from '@/api-clients/dashboard/private-widget/schema/api-verbs/list';
import type { PrivateWidgetLoadParameters } from '@/api-clients/dashboard/private-widget/schema/api-verbs/load';
import type { PrivateWidgetLoadSumParameters } from '@/api-clients/dashboard/private-widget/schema/api-verbs/load-sum';
import type { PrivateWidgetUpdateParameters } from '@/api-clients/dashboard/private-widget/schema/api-verbs/update';
import type { PrivateWidgetModel } from '@/api-clients/dashboard/private-widget/schema/model';
import type { PublicWidgetCreateParameters } from '@/api-clients/dashboard/public-widget/schema/api-verbs/create';
import type { PublicWidgetDeleteParameters } from '@/api-clients/dashboard/public-widget/schema/api-verbs/delete';
import type { PublicWidgetListParameters } from '@/api-clients/dashboard/public-widget/schema/api-verbs/list';
import type { PublicWidgetLoadParameters } from '@/api-clients/dashboard/public-widget/schema/api-verbs/load';
import type { PublicWidgetLoadSumParameters } from '@/api-clients/dashboard/public-widget/schema/api-verbs/load-sum';
import type { PublicWidgetUpdateParameters } from '@/api-clients/dashboard/public-widget/schema/api-verbs/update';
import type { PublicWidgetModel } from '@/api-clients/dashboard/public-widget/schema/model';

import type { VariableModelType } from '@/lib/variable-models';
import type { ManagedVariableModelKey } from '@/lib/variable-models/managed-model-config/base-managed-model-config';

import type { DataInfo, LabelsInfo } from '@/common/modules/widgets/types/widget-model';



export type WidgetModel = PublicWidgetModel | PrivateWidgetModel;
export type WidgetListParams = PublicWidgetListParameters|PrivateWidgetListParameters;
export type WidgetCreateParams = PublicWidgetCreateParameters| PrivateWidgetCreateParameters;
export type WidgetUpdateParams = PublicWidgetUpdateParameters| PrivateWidgetUpdateParameters;
export type WidgetDeleteParams = PublicWidgetDeleteParameters| PrivateWidgetDeleteParameters;
export type WidgetLoadParams = PublicWidgetLoadParameters| PrivateWidgetLoadParameters;
export type WidgetLoadSumParams = PublicWidgetLoadSumParameters| PrivateWidgetLoadSumParameters;

interface WidgetItemOptions {
    type: VariableModelType;
    key: ManagedVariableModelKey;
    dataKey?: string;
}

/*
 * inheritance_mode: how to inherit widget options from dashboard variables.
 *      NONE: no inheritance
 *      KEY_MATCHING: inherit by key matching
 *      SELECTION_TYPE_MATCHING: inherit by selection type matching
 */
export type InheritanceMode = 'NONE'|'KEY_MATCHING'|'SELECTION_TYPE_MATCHING';
export interface WidgetOptionsSchemaProperty {
    key: string; // e.g. cost_data_source
    name?: string; // e.g. Data Source
    selection_type?: 'SINGLE'|'MULTI';
    readonly?: boolean;
    fixed?: boolean;
    inheritance_mode?: InheritanceMode; // default: 'KEY_MATCHING'
    item_options?: WidgetItemOptions[];
    scope?: 'GLOBAL'|'LOCAL'; // default: 'LOCAL'
    hidden?: boolean;
}

export type WidgetFilterKey = keyof typeof WIDGET_OPTION_FILTER_KEY_MAP;
export type WidgetFilterOptionKey = typeof WIDGET_OPTION_FILTER_KEY_MAP[keyof typeof WIDGET_OPTION_FILTER_KEY_MAP];

export type WidgetOptionKey = typeof WIDGET_OPTION_KEYS[number];
export type WidgetOptionsSchema = {
    properties: Record<string, WidgetOptionsSchemaProperty>;
    order: string[];
};

export type WidgetSize = typeof WIDGET_SIZE[keyof typeof WIDGET_SIZE];
export type Granularity = typeof GRANULARITY[keyof typeof GRANULARITY];
export type CostDataField = typeof COST_DATA_FIELD_MAP[keyof typeof COST_DATA_FIELD_MAP]['name'];
export type AssetDataField = typeof ASSET_DATA_FIELD_MAP[keyof typeof ASSET_DATA_FIELD_MAP]['name'];
export type DataField = CostDataField|AssetDataField|string;
type WidgetScope = 'DOMAIN'|'WORKSPACE'|'PROJECT';

export interface BaseConfigInfo {
    config_id: string;
    version?: string;
}
export interface WidgetConfig {
    widget_config_id: string;
    base_configs?: BaseConfigInfo[];
    title?: string;
    labels?: Array<'Cost'|'Asset'|'Budget'|string>;
    description?: {
        translation_id?: string;
        preview_image?: string;
    };
    scopes: WidgetScope[];
    theme?: {
        inherit?: boolean;
        inherit_count?: number;
    };
    sizes: WidgetSize[];
    options: WidgetOptions;
    options_schema?: WidgetOptionsSchema;
}

export type ChartType = typeof CHART_TYPE[keyof typeof CHART_TYPE];
interface LegendOptions {
    enabled?: boolean;
    show_at?: 'table'|'chart';
}

export type DataMapping = Record<string, string|string[]>;

/* widget filters */
export interface WidgetFilter {
    k?: string;
    v: null|string|boolean|number|Array<null|string|boolean|number>;
    o?: ConsoleFilterOperator;
}

export type WidgetFiltersMap = Partial<Record<WidgetFilterKey, WidgetFilter[]>>;

/* widget options */
export interface WidgetOptions { // to be deprecated
    // cost
    cost_data_source?: string;
    cost_data_type?: string;
    cost_data_field?: string;
    cost_secondary_data_field?: string;
    // asset
    cloud_service_query_set?: string;
    asset_data_field?: string;
    asset_secondary_data_field?: string;
    // common
    granularity?: Granularity;
    chart_type?: ChartType;
    legend_options?: LegendOptions;
    pagination_options?: {
        enabled?: boolean;
        page_size?: number;
    };
    data_criteria?: 'history'|'realtime';
    filters?: WidgetFiltersMap;
}


export interface InheritOption {
    enabled?: boolean;
    variable_key?: string;
}
export type InheritOptions = Partial<Record<WidgetOptionKey, {
    enabled?: boolean;
    variable_key?: string;
}>>;

export type WidgetLoadResponse = ListResponse<Record<string, string|number>> & {
    labels_info: LabelsInfo;
    data_info: DataInfo;
    order?: string[];
};

export type DataTableLoadResponse = ListResponse<Record<string, string|number>> & {
    labels_info: LabelsInfo;
    data_info: DataInfo;
    order?: string[];
};


