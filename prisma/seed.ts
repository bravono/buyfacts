import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

import path from 'path'

const dbUrl = process.env.DATABASE_URL || "file:./dev.db";
const rawPath = dbUrl.replace(/^file:/, "");
const dbPath = path.isAbsolute(rawPath)
  ? rawPath
  : rawPath.startsWith("prisma") || rawPath.startsWith("./prisma")
    ? path.join(process.cwd(), rawPath)
    : path.join(process.cwd(), "prisma", rawPath);

const adapter = new PrismaBetterSqlite3({ url: dbPath })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Starting BuyFacts Core DB seed...\n");

  // 1. Users
  console.log("1. Seeding Users...");
  const users = [
    { email: "rmj@robertjohnso.com", name: "Robert Johnson" },
    { email: "ahbideeny@gmail.com", name: "Ahbideen Yusuf" },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name },
      create: user,
    });
  }
  console.log(`   ✓ Seeded ${users.length} Users`);

  // 2. Dashboard Buttons
  console.log("2. Seeding Dashboard Buttons...");
  const dashboardButtons = [
    {
      id: "btn-uuid-001",
      label: "Introductory Overview",
      mediaUrl: "/videos/intro_overview.mp4",
      mediaType: "video",
      subtitle: "Watch a 2-minute overview of our platform",
      category: "Services",
      color: "#3B82F6",
    },
    {
      id: "btn-uuid-002",
      label: "Fact-Checking Report 2026",
      mediaUrl: "/docs/report_2026.pdf",
      mediaType: "pdf",
      subtitle: "Download key findings & methodologies",
      category: "Thought Leadership",
      color: "#10B981",
    },
    {
      id: "btn-uuid-003",
      label: "Cubicon Audio Walkthrough",
      mediaUrl: "/audio/walkthrough.mp3",
      mediaType: "audio",
      subtitle: "Listen to guided voice instructions",
      category: "Services",
      color: "#8B5CF6",
    },
  ];

  for (const btn of dashboardButtons) {
    await prisma.dashboardButton.upsert({
      where: { id: btn.id },
      update: btn,
      create: btn,
    });
  }
  console.log(`   ✓ Seeded ${dashboardButtons.length} Dashboard Buttons`);

  // 3. Media Assets
  console.log("3. Seeding Media Assets...");
  const mediaAssets = [
    {
      id: "asset-uuid-001",
      publicUrl: "/uploads/puzzle1_hd.png",
      fileName: "puzzle1_hd.png",
      fileType: "image/png",
      fileSize: 1048576,
    },
    {
      id: "asset-uuid-002",
      publicUrl: "/uploads/intro_video.mp4",
      fileName: "intro_video.mp4",
      fileType: "video/mp4",
      fileSize: 5242880,
    },
    {
      id: "asset-uuid-003",
      publicUrl: "/uploads/whitepaper.pdf",
      fileName: "whitepaper.pdf",
      fileType: "application/pdf",
      fileSize: 2097152,
    },
  ];

  for (const asset of mediaAssets) {
    await prisma.mediaAsset.upsert({
      where: { id: asset.id },
      update: asset,
      create: asset,
    });
  }
  console.log(`   ✓ Seeded ${mediaAssets.length} Media Assets`);

  console.log("\n🎉 BuyFacts Core DB seeding completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error("❌ Error during seeding:", e)
    await prisma.$disconnect()
    process.exit(1)
  })
