import type { Tags } from '@/schema/_common/model';
import type { ServiceChannelDataType, ServiceChannelScheduleInfoType } from '@/schema/alert-manager/service-channel/type';

export interface ServiceChannelUpdateParameters {
    channel_id: string;
    name?: string;
    data?: ServiceChannelDataType;
    schedule?: ServiceChannelScheduleInfoType;
    tags?: Tags;
}
