import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PRODUCTION_USERS,
  PRODUCTION_DASHBOARD_BUTTONS,
  seedProductionDatabase,
  SeedProdClient,
} from "../prisma/seed-prod";
import { verifyPassword } from "../lib/auth/password";

describe("Production Seed Script (User & DashboardButton Only)", () => {
  it("should define exactly 2 admin users and 18 canonical dashboard buttons", () => {
    assert.equal(PRODUCTION_USERS.length, 2);
    assert.equal(PRODUCTION_USERS[0].email, "rmj@robertjohnson.com");
    assert.equal(PRODUCTION_USERS[1].email, "ahbideeny@gmail.com");
    assert.ok(PRODUCTION_USERS.every((u) => u.role === "admin"));

    assert.equal(PRODUCTION_DASHBOARD_BUTTONS.length, 18);
    const services = PRODUCTION_DASHBOARD_BUTTONS.filter(
      (b) => b.category === "Products & Services"
    );
    const imperatives = PRODUCTION_DASHBOARD_BUTTONS.filter(
      (b) => b.category === "Research Imperatives"
    );
    assert.equal(services.length, 9);
    assert.equal(imperatives.length, 9);
  });

  it("should upsert all users and dashboard buttons without calling deleteMany or touching other tables", async () => {
    const upsertedUsers: Array<{
      where: { email: string };
      update: { name: string; passwordHash: string; role: string };
      create: { email: string; name: string; passwordHash: string; role: string };
    }> = [];
    const upsertedButtons: Array<{
      where: { id: string };
      update: unknown;
      create: unknown;
    }> = [];

    const mockClient: SeedProdClient = {
      user: {
        upsert: async (args) => {
          upsertedUsers.push(args);
          return args.create;
        },
      },
      dashboardButton: {
        upsert: async (args) => {
          upsertedButtons.push(args);
          return args.create;
        },
      },
    };

    const result = await seedProductionDatabase(mockClient, "CustomAdminPass99!");

    assert.equal(result.usersSeeded, 2);
    assert.equal(result.buttonsSeeded, 18);
    assert.equal(upsertedUsers.length, 2);
    assert.equal(upsertedButtons.length, 18);

    for (const u of upsertedUsers) {
      const validCreate = await verifyPassword(
        "CustomAdminPass99!",
        u.create.passwordHash
      );
      const validUpdate = await verifyPassword(
        "CustomAdminPass99!",
        u.update.passwordHash
      );
      assert.equal(validCreate, true);
      assert.equal(validUpdate, true);
    }
  });

  it("should fallback to default password when blank or whitespace password is provided", async () => {
    const capturedHashes: string[] = [];
    const mockClient: SeedProdClient = {
      user: {
        upsert: async (args) => {
          capturedHashes.push(args.create.passwordHash);
          return args.create;
        },
      },
      dashboardButton: {
        upsert: async (args) => args.create,
      },
    };

    const expectedPassword = process.env.DEFAULT_ADMIN_PASSWORD || "AdminPass123!";
    await seedProductionDatabase(mockClient, "   ");

    assert.equal(capturedHashes.length, 2);
    for (const hash of capturedHashes) {
      const matchesDefault = await verifyPassword(expectedPassword, hash);
      assert.equal(matchesDefault, true);
    }
  });

  it("should propagate database errors cleanly when upsert fails", async () => {
    const failingClient: SeedProdClient = {
      user: {
        upsert: async () => {
          throw new Error("Database connection refused");
        },
      },
      dashboardButton: {
        upsert: async (args) => args.create,
      },
    };

    await assert.rejects(
      async () => {
        await seedProductionDatabase(failingClient);
      },
      { message: "Database connection refused" }
    );
  });
});
