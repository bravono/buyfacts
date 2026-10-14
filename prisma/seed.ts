import { PrismaClient, ContentFormat } from '@prisma/client'
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

  await prisma.vaultAsset.deleteMany();
  await prisma.topic.deleteMany();

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
      label: "Research Planning",
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      mediaType: "video",
      subtitle: "Inclusive Research Definition",
      category: "Products & Services",
      color: "#9b5d00",
    },
    {
      id: "btn-srv-002",
      label: "Survey Design",
      mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      mediaType: "audio",
      subtitle: "Make Each Question Actionable",
      category: "Products & Services",
      color: "#ea425f",
    },
    {
      id: "btn-srv-003",
      label: "Story-Based Surveys",
      mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
      mediaType: "image",
      subtitle: "Execute a Dual-Based Survey Model",
      category: "Products & Services",
      color: "#ff9900",
    },
    {
      id: "btn-srv-004",
      label: "Improve Surveys",
      mediaUrl: "https://pdfobject.com/pdf/sample.pdf",
      mediaType: "pdf",
      subtitle: "Increase the Return on Research",
      category: "Products & Services",
      color: "#006398",
    },
    {
      id: "btn-srv-005",
      label: "Participant Validation",
      mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      mediaType: "audio",
      subtitle: "Play Cubicon Puzzle Games",
      category: "Products & Services",
      color: "#ffc164",
    },
    {
      id: "btn-srv-006",
      label: "Survey Fieldwork",
      mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
      mediaType: "image",
      subtitle: "Quality-Centric Survey Execution",
      category: "Products & Services",
      color: "#b0e843",
    },
    {
      id: "btn-srv-007",
      label: "Content Value",
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
      mediaType: "video",
      subtitle: "Maximize the Return on Content",
      category: "Products & Services",
      color: "#42ea86",
    },
    {
      id: "btn-srv-008",
      label: "Pattern Insights",
      mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
      mediaType: "video",
      subtitle: "Active Pattern Analytics",
      category: "Products & Services",
      color: "#ed40ed",
    },
    {
      id: "btn-srv-009",
      label: "Audience Validation",
      mediaUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
      mediaType: "pdf",
      subtitle: "Opportunity Validation",
      category: "Products & Services",
      color: "#532254",
    },
    // Thought Leadership
    {
      id: "btn-tl-001",
      label: "Research Methods",
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      mediaType: "video",
      subtitle: "Exceed Stakeholder Wants and Needs",
      category: "Research Imperatives",
      color: "#006398",
    },
    {
      id: "btn-tl-002",
      label: "Cohort Research",
      mediaUrl: "https://pdfobject.com/pdf/sample.pdf",
      mediaType: "pdf",
      subtitle: "Smaller Groups that Know the Topic",
      category: "Research Imperatives",
      color: "#ffc164",
    },
    {
      id: "btn-tl-003",
      label: "Survey Engagement",
      mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      mediaType: "audio",
      subtitle: "Optimize Question Value",
      category: "Research Imperatives",
      color: "#42ea86",
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
      label: "Content Creation",
      mediaUrl: "https://www.orimi.com/pdf-test.pdf",
      mediaType: "pdf",
      subtitle: "Assets that Engage with Thought Leadership",
      category: "Research Imperatives",
      color: "#ffc164",
    },
    {
      id: "btn-tl-006",
      label: "Marketing Leadership",
      mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
      mediaType: "audio",
      subtitle: "Best Practices by Marketing Area",
      category: "Research Imperatives",
      color: "#b0e843",
    },
    {
      id: "btn-tl-007",
      label: "Research Leadership",
      mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
      mediaType: "video",
      subtitle: "Return on Primary Research",
      category: "Research Imperatives",
      color: "#ff9900",
    },
    {
      id: "btn-tl-008",
      label: "Early Recognition",
      mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
      mediaType: "video",
      subtitle: "Earlier Recognition for Your Time Advantage",
      category: "Research Imperatives",
      color: "#ea425f",
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
  // 8. Content Vault Topics and Multi-Format Assets
  console.log("8. Seeding Content Vault Topics and Assets for Guests...");

  const vaultTopics = [
    // Products
    { name: "Cubicon 3D", slug: "cubicon-3d", category: "Product" },
    { name: "ResearchLib", slug: "research-lib", category: "Product" },
    { name: "TRIAD Framework", slug: "triad-framework", category: "Product" },
    { name: "Value Quantification", slug: "value-quantification", category: "Product" },
    // Dashboard Topics
    { name: "Research Planning", slug: "research-planning", category: "Dashboard Topic" },
    { name: "Survey Design", slug: "survey-design", category: "Dashboard Topic" },
    { name: "Story-Based Surveys", slug: "story-based-surveys", category: "Dashboard Topic" },
    { name: "Participant Validation", slug: "participant-validation", category: "Dashboard Topic" },
    { name: "Pattern Insights", slug: "pattern-insights", category: "Dashboard Topic" },
  ];

  const createdTopics: Record<string, string> = {};
  for (const t of vaultTopics) {
    const topicRecord = await prisma.topic.create({
      data: t,
    });
    createdTopics[t.slug] = topicRecord.id;
  }
  console.log(`   Seeded ${vaultTopics.length} Topics (Products and Dashboard Topics)`);

  const vaultAssets: Array<{
    title: string;
    description: string;
    format: ContentFormat;
    sourceUrl: string;
    embedCode?: string;
    topicId: string;
    keywords: string;
    isPublished: boolean;
    publishedAt: Date;
  }> = [
    {
      title: "The Rule of Three in B2B Customer Discovery",
      description: "How triangulating qualitative responses through three distinct validation layers reduces market uncertainty before full-scale investments.",
      format: ContentFormat.ARTICLE,
      sourceUrl: "https://www.linkedin.com/pulse/rule-of-three-b2b-customer-discovery-buyfacts",
      topicId: createdTopics["triad-framework"],
      keywords: JSON.stringify(["rule of three", "customer discovery", "b2b research", "validation layers", "market uncertainty", "decision making"]),
      isPublished: true,
      publishedAt: new Date("2026-09-15T10:00:00Z"),
    },
    {
      title: "Cubicon 3D Spatial Survey Architecture Walkthrough",
      description: "Complete guided walkthrough of spatial 3D puzzle validation and drag-and-drop coordinate evaluation.",
      format: ContentFormat.VIDEO,
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      embedCode: '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="Cubicon 3D Spatial Survey Architecture Walkthrough" style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
      topicId: createdTopics["cubicon-3d"],
      keywords: JSON.stringify(["cubicon 3d", "spatial survey", "puzzle validation", "interactive coordinate", "participant engagement"]),
      isPublished: true,
      publishedAt: new Date("2026-09-20T14:30:00Z"),
    },
    {
      title: "Return on Effort (ROE) Framework Whitepaper",
      description: "Comprehensive architectural whitepaper detailing mathematical models for maximizing researcher yield per fieldwork hour.",
      format: ContentFormat.PDF,
      sourceUrl: "https://pdfobject.com/pdf/sample.pdf",
      topicId: createdTopics["value-quantification"],
      keywords: JSON.stringify(["return on effort", "roe framework", "research yield", "fieldwork economics", "b2b metrics"]),
      isPublished: true,
      publishedAt: new Date("2026-09-28T09:00:00Z"),
    },
    {
      title: "Early Market Movement Recognition Audio Briefing",
      description: "Executive audio briefing on detecting subtle behavioral shifts in enterprise buyer panels before quarterly churn signals appear.",
      format: ContentFormat.AUDIO,
      sourceUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      topicId: createdTopics["pattern-insights"],
      keywords: JSON.stringify(["early signals", "market movement", "buyer patterns", "executive briefing", "b2b intelligence"]),
      isPublished: true,
      publishedAt: new Date("2026-10-02T16:00:00Z"),
    },
    {
      title: "Survey Design Imperatives: Eliminating Acquiescence Bias",
      description: "Empirical strategies for framing dual-choice prompts and story-based exercises that force deliberate cognitive engagement.",
      format: ContentFormat.ARTICLE,
      sourceUrl: "https://buyfacts.com/research-imperatives",
      topicId: createdTopics["survey-design"],
      keywords: JSON.stringify(["survey design", "bias elimination", "story-based surveys", "cognitive engagement", "question framing"]),
      isPublished: true,
      publishedAt: new Date("2026-10-08T11:15:00Z"),
    },
    {
      title: "ResearchLib Narrative Survey Demo",
      description: "Demonstration of dynamic fill-in-the-blank narrative survey interfaces that dramatically improve completion fidelity.",
      format: ContentFormat.VIDEO,
      sourceUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      embedCode: '<video controls preload="metadata" style="width:100%;aspect-ratio:16/9;border-radius:12px;background:#000;"><source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4"></video>',
      topicId: createdTopics["research-lib"],
      keywords: JSON.stringify(["researchlib", "narrative survey", "fill in the blanks", "completion fidelity", "storytelling"]),
      isPublished: true,
      publishedAt: new Date("2026-10-12T13:45:00Z"),
    },
    {
      title: "Participant Validation Protocol Reference",
      description: "Standard operating procedures for establishing verified identity and domain authority during high-stakes survey intake.",
      format: ContentFormat.PDF,
      sourceUrl: "https://pdfobject.com/pdf/sample.pdf",
      topicId: createdTopics["participant-validation"],
      keywords: JSON.stringify(["participant validation", "identity verification", "high stakes research", "data fidelity", "panel management"]),
      isPublished: true,
      publishedAt: new Date("2026-10-13T10:00:00Z"),
    },
    {
      title: "Story-Based Survey Methodology Deep Dive",
      description: "In-depth audio masterclass on turning standard survey friction into engaging narrative exploration.",
      format: ContentFormat.AUDIO,
      sourceUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      topicId: createdTopics["story-based-surveys"],
      keywords: JSON.stringify(["story based surveys", "narrative friction", "audio masterclass", "qualitative depth", "engagement"]),
      isPublished: true,
      publishedAt: new Date("2026-10-14T08:30:00Z"),
    },
  ];

  for (const a of vaultAssets) {
    await prisma.vaultAsset.create({
      data: a,
    });
  }
  console.log(`   Seeded ${vaultAssets.length} Vault Assets across all formats for Guests\n`);

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
