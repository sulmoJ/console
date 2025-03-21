import type { ResourceGroupType } from '@/api-clients/_common/schema/type';
import type { CostJobStatus } from '@/api-clients/cost-analysis/job/schema/type';


interface SyncedAccount {
    account_id: string;
}
export interface CostJobModel {
    job_id: string;
    status: CostJobStatus;
    options?: Record<string, any>;
    error_code: string;
    error_message: string;
    total_tasks: number;
    remained_tasks: number;
    sycned_accounts: SyncedAccount[];
    data_source_id: string;
    resource_group: Extract<ResourceGroupType, 'DOMAIN'|'WORKSPACE'>;
    workspace_id: string;
    domain_id: string;
    created_at: string;
    updated_at: string;
    finished_at: string;
}
