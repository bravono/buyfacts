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
  console.log("Starting BuyFacts Core DB seed...\n");

  // 0. Reset existing database records so seed replaces existing state instead of appending
  console.log("0. Cleaning existing records to replace database state...");
  await prisma.cubiconAttempt.deleteMany();
  await prisma.cubiconSession.deleteMany();
  await prisma.cubiconTask.deleteMany();
  await prisma.cubiconSequence.deleteMany();
  await prisma.cubiconRegistration.deleteMany();
  await prisma.cubiconShare.deleteMany();
  await prisma.feedbackSubmission.deleteMany();

  await prisma.dashboardButton.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.user.deleteMany();
  console.log("   Cleared existing records successfully.\n");

  // 1. Users
  console.log("1. Seeding Users...");
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "AdminPass123!";
  const defaultHash = await hashPassword(defaultPassword);

  const users = [
    { email: "rmj@robertjohnson.com", name: "Robert Johnson", passwordHash: defaultHash, role: "admin" },
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
      mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
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
      mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
      mediaType: "video",
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
  console.log(`   Seeded ${dashboardButtons.length} Dashboard Buttons`);

  // 3. Media Assets
  console.log("3. Seeding Media Assets...");
  const mediaAssets = [
    {
      id: "asset-uuid-001",
      publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505108337-1zkn2t-Puzzle1.webp",
      fileName: "puzzle1_hd.png",
      fileType: "image/png",
      fileSize: 1048576,
    },
    {
      id: "asset-uuid-002",
      publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110243-kde8r0-Puzzle2.webp",
      fileName: "intro_video.mp4",
      fileType: "video/mp4",
      fileSize: 5242880,
    },
    {
      id: "asset-uuid-003",
      publicUrl: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110606-pcdywj-Puzzle3.webp",
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
  console.log(`   Seeded ${mediaAssets.length} Media Assets`);

  // 4. Cubicon 3D Sequences and Tasks
  console.log("4. Seeding Cubicon 3D Sequences and Tasks...");

  const defaultSeq = await prisma.cubiconSequence.upsert({
    where: { slug: "default" },
    update: {
      title: "Default Verification Challenge",
      passThreshold: 0.66,
      isActive: true,
    },
    create: {
      slug: "default",
      title: "Default Verification Challenge",
      description: "Standard anti-bot human verification puzzle sequence",
      passThreshold: 0.66,
      rotationDirection: "left",
      defaultRotationInterval: 15,
      isActive: true,
      createdBy: "system",
    },
  });

  const contactSeq = await prisma.cubiconSequence.upsert({
    where: { slug: "contact_form" },
    update: {
      title: "Contact Form Human Verification",
      passThreshold: 0.6,
      isActive: true,
    },
    create: {
      slug: "contact_form",
      title: "Contact Form Human Verification",
      description: "Anti-bot spatial puzzle verification for contact inquiries",
      passThreshold: 0.6,
      rotationDirection: "left",
      defaultRotationInterval: 15,
      isActive: true,
      createdBy: "system",
    },
  });

  const cubiconTasks = [
    {
      taskIndex: 0,
      taskNumber: 1,
      heading: "Puzzle 1 of 3",
      description: "Who gets concerned by howling? (Draw a circle)",
      screen: "Active_front",
      image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505108337-1zkn2t-Puzzle1.webp",
      rotation: "left",
      rotationInterval: 15,
      questionType: "Selection",
      correctCoordinates: JSON.stringify([{ x: 0.15, y: 0.45, z: 1.0 }]),
      startPoint: JSON.stringify({ x: 0.15, y: 0.45, z: 1.0 }),
      midPoint: "",
      endPoint: "",
      tolerance: 0.5,
      isFinal: false,
    },
    {
      taskIndex: 1,
      taskNumber: 2,
      heading: "Puzzle 2 of 3",
      description: "Who's in line for a change of shirt? (click to choose)",
      screen: "Active_side_l",
      image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110243-kde8r0-Puzzle2.webp",
      rotation: "left",
      rotationInterval: 15,
      questionType: "Selection",
      correctCoordinates: JSON.stringify([{ x: -0.25, y: 0.30, z: 1.0 }]),
      startPoint: JSON.stringify({ x: -0.25, y: 0.30, z: 1.0 }),
      midPoint: "",
      endPoint: "",
      tolerance: 0.5,
      isFinal: false,
    },
    {
      taskIndex: 2,
      taskNumber: 3,
      heading: "Puzzle 3 of 3",
      description: "Where does his next go? (click to choose)",
      screen: "Active_back",
      image: "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110606-pcdywj-Puzzle3.webp",
      rotation: "left",
      rotationInterval: 15,
      questionType: "Anticipation",
      correctCoordinates: JSON.stringify({
        start: { x: -0.60, y: 0.10, z: 1.0 },
        mid: { x: 0.0, y: 0.35, z: 1.0 },
        end: { x: 0.60, y: 0.10, z: 1.0 },
      }),
      startPoint: JSON.stringify({ x: -0.60, y: 0.10, z: 1.0 }),
      midPoint: JSON.stringify({ x: 0.0, y: 0.35, z: 1.0 }),
      endPoint: JSON.stringify({ x: 0.60, y: 0.10, z: 1.0 }),
      tolerance: 0.5,
      isFinal: true,
    },
  ];

  for (const t of cubiconTasks) {
    await prisma.cubiconTask.create({
      data: {
        ...t,
        sequenceId: defaultSeq.id,
      },
    });
  }

  for (const t of cubiconTasks) {
    await prisma.cubiconTask.create({
      data: {
        ...t,
        heading: t.heading.replace("Puzzle", "Verification Puzzle"),
        sequenceId: contactSeq.id,
      },
    });
  }
  console.log("   Seeded Cubicon Sequences (default, contact_form) and associated Tasks");

  console.log("\nBuyFacts Core DB seeding completed successfully!");
}


main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error("Error during seeding:", e)
    await prisma.$disconnect()
    process.exit(1)
  })
