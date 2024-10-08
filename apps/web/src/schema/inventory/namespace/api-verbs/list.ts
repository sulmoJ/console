import type { Query } from '@cloudforet/core-lib/space-connector/type';

import type { NamespaceCategory, NamespaceGroup } from '@/schema/inventory/namespace/type';


export interface NamespaceListParameters {
    query?: Query;
    namespace_id?: string;
    category?: NamespaceCategory;
    resource_type?: string;
    group?: NamespaceGroup;
    provider?: string;
    workspace_id?: string;
}
