import type { Query } from '@cloudforet/core-lib/space-connector/type';

import type { AuthType, UserState } from '@/schema/identity/user/type';


export interface UserListParameters {
    query?: Query;
    user_id?: string;
    name?: string;
    state?: UserState;
    email?: string;
    auth_type?: AuthType;
    workspace_id?: string;
    // TODO: will be removed after the backend is ready
    domain_id: string;
}