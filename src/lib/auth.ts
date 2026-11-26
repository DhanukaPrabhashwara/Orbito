
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { randomUUID } from "node:crypto";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  emailAndPassword: {
    enabled: true,
  },

  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
  ],

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await prisma.$transaction(async (tx) => {
            // Avoid creating another workspace if one already exists.
            const existingMembership = await tx.membership.findFirst({
              where: {
                userId: user.id,
              },
            });

            if (existingMembership) {
              return;
            }

            // Generate a URL-friendly, unique workspace slug.
            const slugBase =
              user.name
                .toLowerCase()
                .trim()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "") || "workspace";

            const slug = `${slugBase}-${randomUUID().slice(0, 8)}`;

            // Create the user's default workspace.
            const organization = await tx.organization.create({
              data: {
                name: `${user.name}'s Workspace`,
                slug,
              },
            });

            // Assign the workspace creator the OWNER role.
            await tx.membership.create({
              data: {
                userId: user.id,
                organizationId: organization.id,
                role: "OWNER",
              },
            });
            // Assign the FREE subscription to the new workspace.
            await tx.organizationSubscription.create({
              data: {
                organizationId: organization.id,
                plan: "FREE",
                status: "ACTIVE",
              },
            });
          });
        },
      },
    },
  },
});
