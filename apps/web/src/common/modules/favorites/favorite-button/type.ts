import type { TranslateResult } from 'vue-i18n';

import type { MenuId } from '@/lib/menu/config';

export const FAVORITE_TYPE = {
    MENU: 'MENU',
    CLOUD_SERVICE: 'CLOUD_SERVICE',
    CLOUD_SERVICE_TYPE: 'CLOUD_SERVICE_TYPE',
    PROJECT: 'PROJECT',
    PROJECT_GROUP: 'PROJECT_GROUP',
    DASHBOARD: 'DASHBOARD',
    COST_ANALYSIS: 'COST_ANALYSIS',
    SECURITY: 'SECURITY',
    METRIC: 'METRIC',
    METRIC_EXAMPLE: 'METRIC_EXAMPLE',
    WORKSPACE: 'WORKSPACE',
    SERVICE: 'SERVICE',
} as const;
export type FavoriteType = typeof FAVORITE_TYPE[keyof typeof FAVORITE_TYPE];

export interface FavoriteOptions {
    type: FavoriteType;
    id?: MenuId | string;
}

export interface FavoriteConfig {
    itemType: FavoriteType;
    workspaceId: string;
    itemId: string;
    updatedAt?: string;
}

export interface FavoriteItem extends FavoriteConfig {
    name?: string;
    label?: TranslateResult;
    icon?: string;
    provider?: string;
    parents?: { name?: string; label?: TranslateResult }[];
    isDeleted?: boolean;
}

export interface FavoriteHasLoaded {
    [FAVORITE_TYPE.MENU]: boolean;
    [FAVORITE_TYPE.CLOUD_SERVICE]: boolean;
    [FAVORITE_TYPE.PROJECT]: boolean;
    [FAVORITE_TYPE.PROJECT_GROUP]: boolean;
    [FAVORITE_TYPE.DASHBOARD]: boolean;
    [FAVORITE_TYPE.COST_ANALYSIS]: boolean;
}

export interface FavoriteState {
    menuItems: FavoriteConfig[]|null;
    projectItems: FavoriteConfig[]|null;
    projectGroupItems: FavoriteConfig[]|null;
    cloudServiceItems: FavoriteConfig[]|null;
    dashboardItems: FavoriteConfig[]|null;
    costAnalysisItems: FavoriteConfig[]|null;
    isLoading: FavoriteHasLoaded;
}

export const FAVORITE_TYPE_TO_STATE_NAME = {
    [FAVORITE_TYPE.MENU]: 'menuItems',
    [FAVORITE_TYPE.PROJECT]: 'projectItems',
    [FAVORITE_TYPE.PROJECT_GROUP]: 'projectGroupItems',
    [FAVORITE_TYPE.CLOUD_SERVICE]: 'cloudServiceItems',
    [FAVORITE_TYPE.DASHBOARD]: 'dashboardItems',
    [FAVORITE_TYPE.COST_ANALYSIS]: 'costAnalysisItems',
};
