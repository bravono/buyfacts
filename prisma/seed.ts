import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import path from 'path'
import { hashPassword } from '../lib/auth/password'

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
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "AdminPass123!";
  const defaultHash = await hashPassword(defaultPassword);

  const users = [
    { email: "rmj@robertjohnso.com", name: "Robert Johnson", passwordHash: defaultHash, role: "admin" },
    { email: "ahbideeny@gmail.com", name: "Ahbideen Yusuf", passwordHash: defaultHash, role: "admin" },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role,
      },
      create: user,
    });
  }
  console.log(`   Seeded ${users.length} Users`);

  // 2. Dashboard Buttons
  console.log("2. Seeding Dashboard Buttons...");
  const dashboardButtons = [
    // Products / Services
    {
      id: "btn-srv-001",
      label: "Survey Define IT",
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      mediaType: "video",
      subtitle: "Inclusive Research Definition",
      category: "Products & Services",
      color: "#9b5d00",
    },
    {
      id: "btn-srv-002",
      label: "Survey Refine IT",
      mediaUrl: "https://pdfobject.com/pdf/sample.pdf",
      mediaType: "pdf",
      subtitle: "Increase the Return on Research",
      category: "Products & Services",
      color: "#006398",
    },
    {
      id: "btn-srv-003",
      label: "Survey Build IT",
      mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      mediaType: "audio",
      subtitle: "Make Each Question Actionable",
      category: "Products & Services",
      color: "#ea425f",
    },
    {
      id: "btn-srv-004",
      label: "Survey Field IT",
      mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
      mediaType: "image",
      subtitle: "Quality-Centric Survey Execution",
      category: "Products & Services",
      color: "#b0e843",
    },
    {
      id: "btn-srv-005",
      label: "Recognize IT",
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
      mediaType: "video",
      subtitle: "Active Pattern Analytics",
      category: "Products & Services",
      color: "#ed40ed",
    },
    {
      id: "btn-srv-006",
      label: "Validate IT",
      mediaUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      mediaType: "pdf",
      subtitle: "Opportunity Validation",
      category: "Products & Services",
      color: "#532254",
    },
    {
      id: "btn-srv-007",
      label: "Respondent Validation",
      mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      mediaType: "audio",
      subtitle: "Play Cubicon Puzzle Games",
      category: "Products & Services",
      color: "#ffc164",
    },
    {
      id: "btn-srv-008",
      label: "Story-Based Surveys",
      mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
      mediaType: "image",
      subtitle: "Execute a Dual-Based Survey Model",
      category: "Products & Services",
      color: "#ff9900",
    },
    {
      id: "btn-srv-009",
      label: "Content Assessment",
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      mediaType: "video",
      subtitle: "Maximize the Return on Content",
      category: "Products & Services",
      color: "#42ea86",
    },
    // Thought Leadership
    {
      id: "btn-tl-001",
      label: "Research Leadership",
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      mediaType: "video",
      subtitle: "Return on Primary Research",
      category: "Research Imperatives",
      color: "#ff9900",
    },
    {
      id: "btn-tl-002",
      label: "Marketing Leadership",
      mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      mediaType: "audio",
      subtitle: "Best Practices by Marketing Area",
      category: "Research Imperatives",
      color: "#b0e843",
    },
    {
      id: "btn-tl-003",
      label: "Cohort Research",
      mediaUrl: "https://pdfobject.com/pdf/sample.pdf",
      mediaType: "pdf",
      subtitle: "Smaller Groups that Know the Topic",
      category: "Research Imperatives",
      color: "#ffc164",
    },
    {
      id: "btn-tl-004",
      label: "Hybrid Marketing",
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      mediaType: "video",
      subtitle: "Digital Reach and a Human Touch",
      category: "Research Imperatives",
      color: "#532254",
    },
    {
      id: "btn-tl-005",
      label: "Early Recognition",
      mediaUrl: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&auto=format&fit=crop&q=80",
      mediaType: "image",
      subtitle: "Earlier Recognition for Your Time Advantage",
      category: "Research Imperatives",
      color: "#ea425f",
    },
    {
      id: "btn-tl-006",
      label: "Survey Engagement",
      mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      mediaType: "audio",
      subtitle: "Optimize Question Value",
      category: "Research Imperatives",
      color: "#42ea86",
    },
    {
      id: "btn-tl-007",
      label: "Content Creation",
      mediaUrl: "https://www.orimi.com/pdf-test.pdf",
      mediaType: "pdf",
      subtitle: "Assets that Engage with Thought Leadership",
      category: "Research Imperatives",
      color: "#ffc164",
    },
    {
      id: "btn-tl-008",
      label: "Research Methods",
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      mediaType: "video",
      subtitle: "Exceed Stakeholder Wants and Needs",
      category: "Research Imperatives",
      color: "#006398",
    },
    {
      id: "btn-tl-009",
      label: "Wisdom Gap",
      mediaUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      mediaType: "pdf",
      subtitle: "Research Becomes Intellectual Currency",
      category: "Research Imperatives",
      color: "#9b5d00",
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
      publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788447281907-vjuvjj-Puzzle1.png",
      fileName: "puzzle1_hd.png",
      fileType: "image/png",
      fileSize: 1048576,
    },
    {
      id: "asset-uuid-002",
      publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788447293717-oyaqga-Puzzle2.png",
      fileName: "intro_video.mp4",
      fileType: "video/mp4",
      fileSize: 5242880,
    },
    {
      id: "asset-uuid-003",
      publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788447294428-ijvkcq-Puzzle3.png",
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

  // 4. Cubicon 3D Tasks
  console.log("4. Seeding Cubicon 3D Tasks...");
  const cubiconTasks = [
    {
      taskIndex: 0,
      task_number: 1,
      heading: "Puzzle 1 of 3",
      description: "Who gets concerned by howling? (Draw a circle)",
      screen: "Active_front",
      image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788447281907-vjuvjj-Puzzle1.png",
      rotation: "left",
      rotationInterval: 15,
      question_type: "Selection",
      isFinal: false,
    },
    {
      taskIndex: 1,
      task_number: 2,
      heading: "Puzzle 2 of 3",
      description: "Who's in line for a change of shirt? (click to choose)",
      screen: "Active_side_l",
      image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788447293717-oyaqga-Puzzle2.png",
      rotation: "left",
      rotationInterval: 15,
      question_type: "Selection",
      isFinal: false,
    },
    {
      taskIndex: 2,
      task_number: 3,
      heading: "Puzzle 3 of 3",
      description: "Who gets concerned by howling? (Draw a circle)",
      screen: "Active_back",
      image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788447294428-ijvkcq-Puzzle3.png",
      rotation: "left",
      rotationInterval: 15,
      question_type: "Selection",
      isFinal: true,
    },
  ];

  const existingCubiconTasks = await prisma.cubiconTask.count();
  if (existingCubiconTasks === 0) {
    for (const t of cubiconTasks) {
      await prisma.cubiconTask.create({ data: t });
    }
    console.log(`   ✓ Seeded ${cubiconTasks.length} Cubicon Tasks`);
  } else {
    console.log(`   ✓ ${existingCubiconTasks} Cubicon Tasks already exist`);
  }

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
