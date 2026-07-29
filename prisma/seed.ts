import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

// Pass the database file URL directly to the driver adapter
const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Starting database seed for all tables...\n");

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

  // 4. Cubicon Tasks
  console.log("4. Seeding Cubicon Tasks...");
  const cubiconTasks = [
    {
      id: "task-uuid-001",
      taskIndex: 0,
      screen: "Active_front",
      image: "/cubicon-app/arts/Puzzle1.png",
      heading: "Puzzle 1 of 3",
      description: "Tap the highlighted area on the cube to continue.",
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      tolerance: 0.5,
      rotationInterval: 10,
      rotation: "left",
      isFinal: false,
    },
    {
      id: "task-uuid-002",
      taskIndex: 1,
      screen: "Active_side_r",
      image: "/cubicon-app/arts/Puzzle2.png",
      heading: "Puzzle 2 of 3",
      description: "Tap the highlighted area on the cube to continue.",
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      tolerance: 0.5,
      rotationInterval: 10,
      rotation: "left",
      isFinal: false,
    },
    {
      id: "task-uuid-003",
      taskIndex: 2,
      screen: "Active_back",
      image: "/cubicon-app/arts/Puzzle3.png",
      heading: "Puzzle 3 of 3",
      description: "Tap the highlighted area on the cube to continue.",
      targetX: 0,
      targetY: 0,
      targetZ: 0,
      tolerance: 0.5,
      rotationInterval: 10,
      rotation: "left",
      isFinal: true,
    },
  ];

  for (const task of cubiconTasks) {
    await prisma.cubiconTask.upsert({
      where: { taskIndex: task.taskIndex },
      update: task,
      create: task,
    });
  }
  console.log(`   ✓ Seeded ${cubiconTasks.length} Cubicon Tasks`);

  console.log("\n🎉 Database seeding completed successfully!");
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
