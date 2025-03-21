import type { Tags } from '@/api-clients/_common/schema/model';
import type { RoleBindingModel } from '@/schema/identity/role-binding/model';
import type { RoleType } from '@/schema/identity/role/type';
import type { UserGroupPerUserModel } from '@/schema/identity/user/model';
import type { AuthType, UserState } from '@/schema/identity/user/type';

export interface WorkspaceUserModel {
    user_id: string;
    name: string;
    state: UserState;
    email: string;
    auth_type: AuthType;
    role_type: RoleType;
    language: string;
    timezone: string;
    api_key_count: number;
    tags: Tags;
    role_binding_info: RoleBindingModel;
    domain_id: string;
    created_at: string;
    last_accessed_at: string;
    user_group: UserGroupPerUserModel[];
}

export interface SummaryWorkspaceUserModel {
    user_id: string,
    name: string,
    state: UserState,
}
