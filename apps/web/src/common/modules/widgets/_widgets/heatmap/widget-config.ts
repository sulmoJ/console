import type { WidgetConfig } from '@/common/modules/widgets/types/widget-config-type';


const heatmap: WidgetConfig = {
    widgetName: 'heatmap',
    meta: {
        title: 'Heatmap',
        sizes: ['md', 'full'],
        defaultValidationConfig: {
            defaultMaxCount: 1,
        },
    },
    requiredFieldsSchema: {
        granularity: {},
        dateRange: {},
        xAxis: {
            options: {
                dataTarget: 'labels_info',
                defaultMaxCount: 10,
                max: 10,
            },
        },
        dataField: {
            options: {
                multiSelectable: true,
                allSelected: true,
            },
        },
        colorSchema: {},
    },
    optionalFieldsSchema: {
        legend: {
            options: {
                default: true,
            },
        },
        dateFormat: {
            options: {
                default: 'MMM DD, YYYY',
            },
        },
        displayAnnotation: {},
    },
};


export default heatmap;
