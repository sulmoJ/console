<script setup lang="ts">
import { PHeading } from '@cloudforet/mirinae';

import BudgetCreateForm from '@/services/cost-explorer/components/BudgetCreateForm.vue';
</script>

<template>
    <div>
        <p-heading class="mb-6"
                   :title="$t('BILLING.COST_MANAGEMENT.BUDGET.FORM.CREATE_BUDGET')"
                   show-back-button
                   @click-back-button="$router.go(-1)"
        />
        <budget-create-form />
    </div>
</template>
