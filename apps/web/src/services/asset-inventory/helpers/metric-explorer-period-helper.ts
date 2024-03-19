import dayjs from 'dayjs';

import { GRANULARITY } from '@/services/asset-inventory/constants/metric-explorer-constant';
import type { Granularity, Period, RelativePeriod } from '@/services/asset-inventory/types/metric-explorer-type';


export const getRefinedPeriod = (granularity: Granularity, relativePeriod: RelativePeriod): Period => {
    const today = dayjs.utc();
    const includeToday = relativePeriod?.include_today;
    const dateFormat = granularity === GRANULARITY.DAILY ? 'YYYY-MM-DD' : 'YYYY-MM';
    if (granularity === GRANULARITY.MONTHLY) {
        if (relativePeriod?.unit === 'year') {
            if (includeToday) {
                return {
                    start: today.subtract(relativePeriod.value, relativePeriod.unit).startOf('year').format(dateFormat),
                    end: today.startOf('month').format(dateFormat),
                };
            }
            return {
                start: today.subtract(relativePeriod.value, relativePeriod.unit).startOf('year').format(dateFormat),
                end: today.subtract(relativePeriod.value, relativePeriod.unit).endOf('year').format(dateFormat),
            };
        }
        return {
            start: today.subtract(relativePeriod.value, relativePeriod.unit).format(dateFormat),
            end: today.subtract(relativePeriod.include_today ? 0 : 1, 'month').format(dateFormat),
        };
    }
    if (includeToday) {
        return {
            start: today.subtract(relativePeriod.value, 'month').startOf('month').format(dateFormat),
            end: today.format(dateFormat),
        };
    }
    return {
        start: today.subtract(relativePeriod.value, relativePeriod.unit).startOf('month').format(dateFormat),
        end: today.subtract(relativePeriod.value, relativePeriod.unit).endOf('month').format(dateFormat),
    };
};

export const getInitialPeriodByGranularity = (granularity?: Granularity): [Period, RelativePeriod|undefined] => {
    if (granularity === GRANULARITY.DAILY) {
        const thisMonthRelativePeriod: RelativePeriod = { unit: 'month', value: 0, include_today: true };
        return [getRefinedPeriod(granularity, thisMonthRelativePeriod), thisMonthRelativePeriod];
    } if (granularity === GRANULARITY.MONTHLY) {
        const last6MonthsRelativePeriod: RelativePeriod = { unit: 'month', value: 5, include_today: true };
        return [getRefinedPeriod(granularity, last6MonthsRelativePeriod), last6MonthsRelativePeriod];
    }
    return [{}, undefined];
};