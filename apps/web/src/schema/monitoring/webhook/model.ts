import type { Tags } from '@/api-clients/_common/schema/model';
import type { WebhookPluginInfo, WebhookState } from '@/schema/monitoring/webhook/type';

type WebhookRequestsType = {
    total: number;
    error: number;
};
export interface WebhookModel {
    webhook_id: string;
    name: string;
    state: WebhookState;
    access_key: string;
    webhook_url: string;
    capability: Record<string, any>;
    plugin_info: WebhookPluginInfo;
    tags: Tags;
    project_id: string;
    workspace_id: string;
    domain_id: string;
    created_at: string;
    requests: WebhookRequestsType
}
