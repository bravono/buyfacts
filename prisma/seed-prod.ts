import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { fileURLToPath } from "url";
import { hashPassword } from "../lib/auth/password";

export interface SeedUserDefinition {
  email: string;
  name: string;
  role: string;
}

export interface SeedDashboardButtonDefinition {
  id: string;
  label: string;
  mediaUrl: string;
  mediaType: string;
  subtitle: string;
  category: string;
  color: string;
}

export const PRODUCTION_USERS: SeedUserDefinition[] = [
  {
    email: "rmj@robertjohnson.com",
    name: "Robert Johnson",
    role: "admin",
  },
  {
    email: "ahbideeny@gmail.com",
    name: "Ahbideen Yusuf",
    role: "admin",
  },
];

export const PRODUCTION_DASHBOARD_BUTTONS: SeedDashboardButtonDefinition[] = [
  // Products / Services
  {
    id: "btn-srv-001",
    label: "Research Planning",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
    mediaType: "docx",
    subtitle: "Inclusive Research Definition",
    category: "Products & Services",
    color: "#9b5d00",
  },
  {
    id: "btn-srv-002",
    label: "Survey Design",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986838481-n6a9ii-02_Survey_Design_Description.docx",
    mediaType: "docx",
    subtitle: "Make Each Question Actionable",
    category: "Products & Services",
    color: "#ea425f",
  },
  {
    id: "btn-srv-003",
    label: "Story-Based Surveys",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839478-6u694d-03_Story_Based_Surveys_Description.docx",
    mediaType: "docx",
    subtitle: "Execute a Dual-Based Survey Model",
    category: "Products & Services",
    color: "#ff9900",
  },
  {
    id: "btn-srv-004",
    label: "Improve Surveys",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986842316-4d5s6l-04_Improve_Surveys_Description.docx",
    mediaType: "pdf",
    subtitle: "Increase the Return on Research",
    category: "Products & Services",
    color: "#006398",
  },
  {
    id: "btn-srv-005",
    label: "Participant Validation",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986843736-k745d3-05_Participant_Validation_Description.docx",
    mediaType: "docx",
    subtitle: "Play Cubicon Puzzle Games",
    category: "Products & Services",
    color: "#ffc164",
  },
  {
    id: "btn-srv-006",
    label: "Survey Fieldwork",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986843086-eow5fo-06_Survey_Fieldwork_Description.docx",
    mediaType: "docx",
    subtitle: "Quality-Centric Survey Execution",
    category: "Products & Services",
    color: "#b0e843",
  },
  {
    id: "btn-srv-007",
    label: "Content Value",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844032-fg4d90-07_Content_Value_Description.docx",
    mediaType: "docx",
    subtitle: "Maximize the Return on Content",
    category: "Products & Services",
    color: "#42ea86",
  },
  {
    id: "btn-srv-008",
    label: "Pattern Insights",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844220-qnr5ue-08_Pattern_Insights_Description.docx",
    mediaType: "docx",
    subtitle: "Active Pattern Analytics",
    category: "Products & Services",
    color: "#ed40ed",
  },
  {
    id: "btn-srv-009",
    label: "Audience Validation",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844826-u389e3-09_Audience_Validation_Description.docx",
    mediaType: "docx",
    subtitle: "Opportunity Validation",
    category: "Products & Services",
    color: "#532254",
  },
  // Thought Leadership
  {
    id: "btn-tl-001",
    label: "Research Methods",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074574239-x6ub5n-01_Research_Methods_Description.docx",
    mediaType: "docx",
    subtitle: "Exceed Stakeholder Wants and Needs",
    category: "Research Imperatives",
    color: "#006398",
  },
  {
    id: "btn-tl-002",
    label: "Cohort Research",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074574173-4b8fgs-02_Cohort_Research_Description.docx",
    mediaType: "docx",
    subtitle: "Smaller Groups that Know the Topic",
    category: "Research Imperatives",
    color: "#ffc164",
  },
  {
    id: "btn-tl-003",
    label: "Survey Engagement",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579276-qn7un6-03_Survey_Engagement_Description.docx",
    mediaType: "docx",
    subtitle: "Optimize Question Value",
    category: "Research Imperatives",
    color: "#42ea86",
  },
  {
    id: "btn-tl-004",
    label: "Hybrid Marketing",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579402-xl20ok-04_Hybrid_Marketing_Description.docx",
    mediaType: "docx",
    subtitle: "Digital Reach and a Human Touch",
    category: "Research Imperatives",
    color: "#532254",
  },
  {
    id: "btn-tl-005",
    label: "Content Creation",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579513-oc4n27-05_Content_Creation_Description.docx",
    mediaType: "docx",
    subtitle: "Assets that Engage with Thought Leadership",
    category: "Research Imperatives",
    color: "#ffc164",
  },
  {
    id: "btn-tl-006",
    label: "Marketing Leadership",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581455-z6tri2-06_Marketing_Leadership_Description.docx",
    mediaType: "docx",
    subtitle: "Best Practices by Marketing Area",
    category: "Research Imperatives",
    color: "#b0e843",
  },
  {
    id: "btn-tl-007",
    label: "Research Leadership",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581679-ny59f6-07_Research_Leadership_Description.docx",
    mediaType: "docx",
    subtitle: "Return on Primary Research",
    category: "Research Imperatives",
    color: "#ff9900",
  },
  {
    id: "btn-tl-008",
    label: "Early Recognition",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581945-r6aiws-08_Early_Recognition_Description.docx",
    mediaType: "docx",
    subtitle: "Earlier Recognition for Your Time Advantage",
    category: "Research Imperatives",
    color: "#ea425f",
  },
  {
    id: "btn-tl-009",
    label: "Wisdom Gap",
    mediaUrl:
      "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074583583-b751b5-09_Wisdom_Gap_Description.docx",
    mediaType: "docx",
    subtitle: "Research Becomes Intellectual Currency",
    category: "Research Imperatives",
    color: "#9b5d00",
  },
];

export interface SeedProdClient {
  user: {
    upsert: (args: {
      where: { email: string };
      update: { name: string; passwordHash: string; role: string };
      create: { email: string; name: string; passwordHash: string; role: string };
    }) => Promise<unknown>;
  };
  dashboardButton: {
    upsert: (args: {
      where: { id: string };
      update: SeedDashboardButtonDefinition;
      create: SeedDashboardButtonDefinition;
    }) => Promise<unknown>;
  };
}

/**
 * Non-destructively seeds only the User and DashboardButton tables using upsert.
 * Does not call deleteMany() on any table and does not insert sample media or vault records.
 */
export async function seedProductionDatabase(
  client: SeedProdClient,
  adminPassword?: string
): Promise<{ usersSeeded: number; buttonsSeeded: number }> {
  const resolvedPassword =
    adminPassword && adminPassword.trim().length > 0
      ? adminPassword
      : process.env.DEFAULT_ADMIN_PASSWORD || "AdminPass123!";

  const defaultHash = await hashPassword(resolvedPassword);

  for (const user of PRODUCTION_USERS) {
    await client.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash: defaultHash,
        role: user.role,
      },
      create: {
        email: user.email,
        name: user.name,
        passwordHash: defaultHash,
        role: user.role,
      },
    });
  }

  for (const btn of PRODUCTION_DASHBOARD_BUTTONS) {
    await client.dashboardButton.upsert({
      where: { id: btn.id },
      update: btn,
      create: btn,
    });
  }

  return {
    usersSeeded: PRODUCTION_USERS.length,
    buttonsSeeded: PRODUCTION_DASHBOARD_BUTTONS.length,
  };
}

async function main() {
  console.log("Starting BuyFacts Production DB seed (User & DashboardButton only)...\n");

  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  const prisma = new PrismaClient({ adapter });

  try {
    const result = await seedProductionDatabase(prisma);
    console.log(`   Upserted ${result.usersSeeded} Admin Users`);
    console.log(`   Upserted ${result.buttonsSeeded} Dashboard Buttons`);
    console.log("\nBuyFacts Production DB seeding completed successfully!");
  } finally {
    await prisma.$disconnect();
  }
}

const isMainModule =
  typeof process !== "undefined" &&
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  main().catch((e) => {
    console.error("Error during production seeding:", e);
    process.exit(1);
  });
}
