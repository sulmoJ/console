import type { Tags } from '@/api-clients/_common/schema/model';
import type { AuthType } from '@/schema/identity/user/type';


export interface UserCreateParameters {
    user_id: string;
    password?: string;
    name?: string;
    email?: string;
    auth_type: AuthType;
    language?: string;
    timezone?: string;
    tags?: Tags;
    reset_password?: boolean;
}
