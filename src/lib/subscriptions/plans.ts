
import type { SubscriptionPlan } from "@/generated/prisma/enums";

export type PlanLimits = {
  maxProjects: number | null;
  maxMembers: number | null;
  maxTasks: number | null;
};

export const SUBSCRIPTION_LIMITS: Record<
  SubscriptionPlan,
  PlanLimits
> = {
  FREE: {
    maxProjects: 2,
    maxMembers: 3,
    maxTasks: 20,
  },

  PRO: {
    maxProjects: 10,
    maxMembers: 15,
    maxTasks: 200,
  },

  BUSINESS: {
    maxProjects: null,
    maxMembers: null,
    maxTasks: null,
  },
};

export function getPlanLimits(
  plan: SubscriptionPlan
): PlanLimits {
  return SUBSCRIPTION_LIMITS[plan];
}
