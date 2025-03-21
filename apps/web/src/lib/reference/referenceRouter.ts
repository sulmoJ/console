/* eslint-disable camelcase */
import type { Location } from 'vue-router';

import { concat } from 'lodash';

import { QueryHelper } from '@cloudforet/core-lib/query';

import type { Reference, ResourceType } from '@/lib/reference/type';

import { ASSET_INVENTORY_ROUTE_V1 } from '@/services/asset-inventory-v1/routes/route-constant';
import { PROJECT_ROUTE } from '@/services/project-v1/routes/route-constant';

interface LinkFormatter {
    (baseUrl: string, data: string, reference: Reference, query: Location['query']): Location;
}

const queryHelper = new QueryHelper();

const serverLinkFormatter: LinkFormatter = (name, data, reference, query) => {
    const location = { name, query };
    let filters: any[] = [];
    if (data) {
        queryHelper.setFilters([{ k: 'server_id', v: data, o: '=' }]);
        filters.push(...queryHelper.rawQueryStrings);
        if (query?.filters) {
            filters = concat(queryHelper.rawQueryStrings, query?.filters);
        }
    }
    location.query = { filters };
    return location;
};

const projectLinkFormatter: LinkFormatter = (name, data, reference, query) => {
    if (data) {
        return {
            name,
            query,
            params: data ? {
                id: data,
                ...(reference.workspace_id ? { workspaceId: reference.workspace_id } : {}),
            } : undefined,
        };
    } return {};
};

const projectGroupLinkFormatter: LinkFormatter = (name, data) => {
    const location = {
        name,
        params: {
            projectGroupId: data,
        },
    };
    return location;
};

const collectorLinkFormatter: LinkFormatter = (name, data, reference, query) => {
    const location = { name, query };
    let filters: any[] = [];
    if (data) {
        queryHelper.setFilters([{ k: 'collector_id', v: data, o: '=' }]);
        filters.push(...queryHelper.rawQueryStrings);
        if (query?.filters) {
            filters = concat(queryHelper.rawQueryStrings, query?.filters);
        }
    }
    location.query = { filters };
    return location;
};

const serviceAccountLinkFormatter: LinkFormatter = (name, data, reference, query) => {
    const location = {
        name,
        query,
        params: { serviceAccountId: data },
    };
    return location;
};

const cloudServiceLinkFormatter: LinkFormatter = (name, data, reference, query) => {
    const location = {
        name,
        query,
        params: {
            searchKey: reference.reference_key || 'reference.resource_id',
            id: data,
        },
    };
    return location;
};

const cloudServiceTypeLinkFormatter: LinkFormatter = (name, data, reference, query) => {
    const location = {
        name,
        query,
        params: { id: data },
    };
    return location;
};

type RouterMap = Record<ResourceType, { name: string; formatter: LinkFormatter}>;

const routerMap: RouterMap = {
    'inventory.Server':
        {
            name: ASSET_INVENTORY_ROUTE_V1.SERVER._NAME,
            formatter: serverLinkFormatter,
        },
    'identity.Project':
        {
            name: PROJECT_ROUTE.DETAIL.TAB.SUMMARY._NAME,
            formatter: projectLinkFormatter,
        },
    'identity.ProjectGroup':
        {
            name: PROJECT_ROUTE._NAME,
            formatter: projectGroupLinkFormatter,
        },
    'inventory.Collector':
        {
            name: ASSET_INVENTORY_ROUTE_V1.COLLECTOR._NAME,
            formatter: collectorLinkFormatter,
        },
    'identity.ServiceAccount':
        {
            name: ASSET_INVENTORY_ROUTE_V1.SERVICE_ACCOUNT.DETAIL._NAME,
            formatter: serviceAccountLinkFormatter,
        },
    'identity.TrustedAccount':
        {
            name: ASSET_INVENTORY_ROUTE_V1.SERVICE_ACCOUNT.DETAIL._NAME,
            formatter: serviceAccountLinkFormatter,
        },
    'inventory.CloudService':
        {
            name: ASSET_INVENTORY_ROUTE_V1.CLOUD_SERVICE.SEARCH._NAME,
            formatter: cloudServiceLinkFormatter,
        },
    'inventory.CloudServiceType':
        {
            name: ASSET_INVENTORY_ROUTE_V1.CLOUD_SERVICE.TYPE_SEARCH._NAME,
            formatter: cloudServiceTypeLinkFormatter,
        },
};

export const referenceRouter = (data: string, reference: Reference, query?: Location['query']): Location => {
    if (routerMap[reference.resource_type]) {
        const { name, formatter } = routerMap[reference.resource_type];
        const location = formatter(name, data, reference, query);
        if (reference.workspace_id) {
            location.params = {
                ...location.params,
                workspaceId: reference.workspace_id,
            };
        }
        return location;
    }
    console.error(`[referenceRouter]: ${reference.resource_type} is not supported`);
    return {};
};

export default referenceRouter;
