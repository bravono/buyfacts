import "dotenv/config";
import { PrismaClient, ContentFormat } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/auth/password";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

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
    {
      email: "rmj@robertjohnson.com",
      name: "Robert Johnson",
      passwordHash: defaultHash,
      role: "admin",
    },
    {
      email: "ahbideeny@gmail.com",
      name: "Ahbideen Yusuf",
      passwordHash: defaultHash,
      role: "admin",
    },
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
  {
    id: "btn-srv-001",
    label: "Research Planning",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839466-0qvuw9-01_Research_Planning_Description.docx",
    mediaType: "video",
    subtitle: "Inclusive Research Definition",
    description: "Collaborative scoping and question architecture ensuring comprehensive coverage of core business objectives and target demographics.",
    category: "Products & Services",
    color: "#9b5d00"
  },
  {
    id: "btn-srv-002",
    label: "Survey Design",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986838481-n6a9ii-02_Survey_Design_Description.docx",
    mediaType: "audio",
    subtitle: "Make Each Question Actionable",
    description: "Constructing streamlined survey workflows with zero ambiguity, ensuring every collected response informs direct business decisions.",
    category: "Products & Services",
    color: "#ea425f"
  },
  {
    id: "btn-srv-003",
    label: "Story-Based Surveys",
    mediaUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986839478-6u694d-03_Story_Based_Surveys_Description.docx",
    mediaType: "image",
    subtitle: "Execute a Dual-Based Survey Model",
    description: "Narrative-driven interactive inquiry combining quantitative polling with qualitative scenario-based storytelling.",
    category: "Products & Services",
    color: "#ff9900"
  },
  {
    id: "btn-srv-004",
    label: "Improve Surveys",
    mediaUrl: "https://pdfobject.com/pdf/sample.pdf",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986842316-4d5s6l-04_Improve_Surveys_Description.docx",
    mediaType: "pdf",
    subtitle: "Increase the Return on Research",
    description: "Iterative prompt refinement and telemetry tuning to amplify insight yield and maximize return on research investment.",
    category: "Products & Services",
    color: "#006398"
  },
  {
    id: "btn-srv-005",
    label: "Participant Validation",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986843736-k745d3-05_Participant_Validation_Description.docx",
    mediaType: "audio",
    subtitle: "Play Cubicon Puzzle Games",
    description: "Interactive verification mechanics using engaging 3D Cubicon spatial puzzles to verify genuine human participant engagement.",
    category: "Products & Services",
    color: "#ffc164"
  },
  {
    id: "btn-srv-006",
    label: "Survey Fieldwork",
    mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986843086-eow5fo-06_Survey_Fieldwork_Description.docx",
    mediaType: "image",
    subtitle: "Quality-Centric Survey Execution",
    description: "High-fidelity deployment across verified B2B panels with real-time fraud mitigation and strict data integrity enforcement.",
    category: "Products & Services",
    color: "#b0e843"
  },
  {
    id: "btn-srv-007",
    label: "Content Value",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844032-fg4d90-07_Content_Value_Description.docx",
    mediaType: "video",
    subtitle: "Maximize the Return on Content",
    description: "Diagnostic evaluation of collateral effectiveness, optimizing messaging resonance and content syndication impact.",
    category: "Products & Services",
    color: "#42ea86"
  },
  {
    id: "btn-srv-008",
    label: "Pattern Insights",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844220-qnr5ue-08_Pattern_Insights_Description.docx",
    mediaType: "video",
    subtitle: "Active Pattern Analytics",
    description: "Automated pattern detection and anomaly recognition uncovering non-obvious correlations in real-time response streams.",
    category: "Products & Services",
    color: "#ed40ed"
  },
  {
    id: "btn-srv-009",
    label: "Audience Validation",
    mediaUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791986844826-u389e3-09_Audience_Validation_Description.docx",
    mediaType: "pdf",
    subtitle: "Opportunity Validation",
    description: "Empirical validation frameworks to confirm market demand, assess willingness-to-pay, and de-risk new product initiatives.",
    category: "Products & Services",
    color: "#532254"
  },
  {
    id: "btn-tl-001",
    label: "Research Methods",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074574239-x6ub5n-01_Research_Methods_Description.docx",
    mediaType: "video",
    subtitle: "Exceed Stakeholder Wants and Needs",
    description: "Rigorous multi-channel research protocols designed to consistently surpass stakeholder expectations with bulletproof empirical validation.",
    category: "Research Imperatives",
    color: "#006398"
  },
  {
    id: "btn-tl-002",
    label: "Cohort Research",
    mediaUrl: "https://pdfobject.com/pdf/sample.pdf",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074574173-4b8fgs-02_Cohort_Research_Description.docx",
    mediaType: "pdf",
    subtitle: "Smaller Groups that Know the Topic",
    description: "Targeted cohort intelligence focusing on niche practitioner panels and specialist groups who possess deep, authoritative domain expertise.",
    category: "Research Imperatives",
    color: "#ffc164"
  },
  {
    id: "btn-tl-003",
    label: "Survey Engagement",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579276-qn7un6-03_Survey_Engagement_Description.docx",
    mediaType: "audio",
    subtitle: "Optimize Question Value",
    description: "Structuring engaging, high-yield survey instruments that maximize participant completion rates while extracting deep, high-value data.",
    category: "Research Imperatives",
    color: "#42ea86"
  },
  {
    id: "btn-tl-004",
    label: "Hybrid Marketing",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579402-xl20ok-04_Hybrid_Marketing_Description.docx",
    mediaType: "video",
    subtitle: "Digital Reach and a Human Touch",
    description: "Harmonizing high-scale digital reach with consultative human engagement to cultivate authentic relationships and sustained audience loyalty.",
    category: "Research Imperatives",
    color: "#532254"
  },
  {
    id: "btn-tl-005",
    label: "Content Creation",
    mediaUrl: "https://www.orimi.com/pdf-test.pdf",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074579513-oc4n27-05_Content_Creation_Description.docx",
    mediaType: "pdf",
    subtitle: "Assets that Engage with Thought Leadership",
    description: "Transforming empirical data points into compelling thought leadership whitepapers, interactive infographics, and high-impact digital narratives.",
    category: "Research Imperatives",
    color: "#ffc164"
  },
  {
    id: "btn-tl-006",
    label: "Marketing Leadership",
    mediaUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581455-z6tri2-06_Marketing_Leadership_Description.docx",
    mediaType: "audio",
    subtitle: "Best Practices by Marketing Area",
    description: "Curated best practices across enterprise marketing divisions, aligning narrative precision with measurable campaign outcomes and growth metrics.",
    category: "Research Imperatives",
    color: "#b0e843"
  },
  {
    id: "btn-tl-007",
    label: "Research Leadership",
    mediaUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581679-ny59f6-07_Research_Leadership_Description.docx",
    mediaType: "video",
    subtitle: "Return on Primary Research",
    description: "High-fidelity primary research methodologies delivering strategic insights, benchmark telemetry, and quantitative clarity to guide executive leadership.",
    category: "Research Imperatives",
    color: "#ff9900"
  },
  {
    id: "btn-tl-008",
    label: "Early Recognition",
    mediaUrl: "https://s3.buyfacts.com/buyfacts-public-assets/products-services/1791397108403-8ixhpm-Affinity_Turn_Early_Recognition_into_An_Affinity_Advantage.mp4",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074581945-r6aiws-08_Early_Recognition_Description.docx",
    mediaType: "video",
    subtitle: "Earlier Recognition for Your Time Advantage",
    description: "Detecting nascent market signals and emerging customer sentiment early to secure a definitive first-mover advantage.",
    category: "Research Imperatives",
    color: "#ea425f"
  },
  {
    id: "btn-tl-009",
    label: "Wisdom Gap",
    mediaUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    readItUrl: "https://s3.buyfacts.com/buyfacts-public-assets/research-imperatives/1792074583583-b751b5-09_Wisdom_Gap_Description.docx",
    mediaType: "pdf",
    subtitle: "Research Becomes Intellectual Currency",
    description: "Bridging the gap between raw data collection and actionable organizational wisdom, converting research findings into proprietary intellectual currency.",
    category: "Research Imperatives",
    color: "#9b5d00"
  }
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
      publicUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505108337-1zkn2t-Puzzle1.webp",
      fileName: "puzzle1_hd.png",
      fileType: "image/png",
      fileSize: 1048576,
    },
    {
      id: "asset-uuid-002",
      publicUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110243-kde8r0-Puzzle2.webp",
      fileName: "intro_video.mp4",
      fileType: "video/mp4",
      fileSize: 5242880,
    },
    {
      id: "asset-uuid-003",
      publicUrl:
        "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110606-pcdywj-Puzzle3.webp",
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

  const sequences = [
    {
      id: 5,
      slug: "default",
      title: "Default Verification Challenge",
      description: "Standard anti-bot human verification puzzle sequence",
      passThreshold: 0.01,
      rotationDirection: "left",
      defaultRotationInterval: 15,
      isActive: true,
      createdBy: "system",
    },
    {
      id: 6,
      slug: "contact_form",
      title: "Contact Form Human Verification",
      description: "Anti-bot spatial puzzle verification for contact inquiries",
      passThreshold: 0.6,
      rotationDirection: "left",
      defaultRotationInterval: 15,
      isActive: true,
      createdBy: "system",
    },
    {
      id: 7,
      slug: "challenge_sequence_3",
      title: "Challenge Sequence 3",
      description: "Dynamic human verification puzzle sequence 3",
      passThreshold: 0.66,
      rotationDirection: "left",
      defaultRotationInterval: 15,
      isActive: true,
      createdBy: "system",
    },
  ];

  for (const seq of sequences) {
    await prisma.cubiconSequence.upsert({
      where: { id: seq.id },
      update: seq,
      create: seq,
    });
  }

  try {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"CubiconSequence"', 'id'), coalesce((SELECT max(id) FROM "CubiconSequence"), 1));`
    );
  } catch {
    // Non-fatal if sequence sync is not supported in the active environment
  }

  const cubiconTasks = [
      {
          id: 17,
          "sequenceId": 5,
          "taskIndex": 0,
          "taskNumber": 1,
          "heading": "Puzzle 1 of 3  (Draw a circle)",
          description: "Who gets concerned by howling?",
          "screen": "Active_front",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505108337-1zkn2t-Puzzle1.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Anticipation",
          "correctCoordinates": "[{\"x\":-0.042574127848625916,\"y\":0.2093228930009854,\"z\":0.5976997207441973},{\"x\":-0.01300874877727363,\"y\":0.16201828672165688,\"z\":0.5976997051073445},{\"x\":-0.07213950692678825,\"y\":0.15462694164718369,\"z\":0.5976997226763686}]",
          "startPoint": "{\"x\":-0.042574127848625916,\"y\":0.2093228930009854,\"z\":0.5976997207441973}",
          "midPoint": "{\"x\":-0.01300874877727363,\"y\":0.16201828672165688,\"z\":0.5976997051073445}",
          "endPoint": "{\"x\":-0.07213950692678825,\"y\":0.15462694164718369,\"z\":0.5976997226763686}",
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-21T09:25:52.360Z"
      },
      {
          id: 18,
          "sequenceId": 5,
          "taskIndex": 1,
          "taskNumber": 2,
          "heading": "Puzzle 2 of 3  (click to choose)",
          description: "Who's in line for a change of shirt?",
          "screen": "Active_side_l",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110243-kde8r0-Puzzle2.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":-0.18356622579331366,\"y\":-0.005166590317604896,\"z\":0.33489561080932634}]",
          "startPoint": "{\"x\":-0.18356622579331366,\"y\":-0.005166590317604896,\"z\":0.33489561080932634}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-21T09:25:52.369Z"
      },
      {
          id: 19,
          "sequenceId": 5,
          "taskIndex": 2,
          "taskNumber": 3,
          "heading": "Puzzle 3 of 3 (click to choose)",
          description: "Where does his next go? ",
          "screen": "Active_back",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/1788505110606-pcdywj-Puzzle3.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":0.17082880041376822,\"y\":-0.05078693590343407,\"z\":0.5976999693622778}]",
          "startPoint": "{\"x\":0.17082880041376822,\"y\":-0.05078693590343407,\"z\":0.5976999693622778}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-21T09:25:52.379Z"
      },
      {
          id: 20,
          "sequenceId": 5,
          "taskIndex": 3,
          "taskNumber": 4,
          "heading": "Bonus Puzzle (enter multiple clicks)",
          description: "Who sat with time over their shoulders?",
          "screen": "Active_side_r",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082428358-lf20q4-WOW_Grand_Central_Station_Color_No_Text.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":0.496,\"y\":0.187,\"z\":0.502},{\"x\":0.678,\"y\":0.187,\"z\":0.502}]",
          "startPoint": "{\"x\":0.496,\"y\":0.187,\"z\":0.502}",
          "midPoint": null,
          "endPoint": "{\"x\":0.678,\"y\":0.187,\"z\":0.502}",
          "tolerance": 0.5,
          "isFinal": true,
          "createdAt": "2026-10-21T09:25:52.384Z"
      },
      {
          id: 21,
          "sequenceId": 6,
          "taskIndex": 0,
          "taskNumber": 1,
          "heading": "Puzzle 1 of 3 (click to choose)",
          description: "Who kissed the silent stone guardian?",
          "screen": "Active_front",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082435451-y5oisv-WOW_Great_Pyramids_Illustration_Color.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":0.412,\"y\":0.323,\"z\":0.897}]",
          "startPoint": "{\"x\":0.412,\"y\":0.323,\"z\":0.897}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-21T09:25:52.389Z"
      },
      {
          id: 22,
          "sequenceId": 6,
          "taskIndex": 1,
          "taskNumber": 2,
          "heading": "Puzzle 2 of 3 (click to choose)",
          description: "Who stacked the pages high?",
          "screen": "Active_side_l",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082419479-0sm0h3-Benjamin_Franklin_Color.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":-0.192,\"y\":-0.112,\"z\":0.502}]",
          "startPoint": "{\"x\":-0.192,\"y\":-0.112,\"z\":0.502}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-21T09:25:52.396Z"
      },
      {
          id: 23,
          "sequenceId": 6,
          "taskIndex": 2,
          "taskNumber": 3,
          "heading": "Puzzle 3 of 3 (click to choose)",
          description: "Who deals in chances but takes a bite between turns? ",
          "screen": "Active_back",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082472298-9m556g-WOW_Things_BermudaTriangle_Color.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":-0.394,\"y\":-0.081,\"z\":0.897}]",
          "startPoint": "{\"x\":-0.394,\"y\":-0.081,\"z\":0.897}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-21T09:25:52.402Z"
      },
      {
          id: 24,
          "sequenceId": 6,
          "taskIndex": 3,
          "taskNumber": 4,
          "heading": "Bonus Puzzle (Click to choose)",
          description: "Who took the shiny slide, not a step? ",
          "screen": "Active_side_r",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082420168-v0qr3q-Beverly_Hillbillies_Colored.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":0.262,\"y\":0.234,\"z\":0.502}]",
          "startPoint": "{\"x\":0.262,\"y\":0.234,\"z\":0.502}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": true,
          "createdAt": "2026-10-21T09:25:52.413Z"
      },
      {
          id: 25,
          "sequenceId": 7,
          "taskIndex": 1,
          "taskNumber": 2,
          "heading": "Puzzle 2 of 3 (Click to Choose)",
          description: "Who chose the high stone seat where heroes stand?",
          "screen": "Active_side_l",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792766115000-ob5kow-WOW_Festival_of_Colors_Color.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":-0.351,\"y\":0.08,\"z\":0.502}]",
          "startPoint": "{\"x\":-0.351,\"y\":0.08,\"z\":0.502}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-23T16:07:51.207Z"
      },
      {
          id: 26,
          "sequenceId": 7,
          "taskIndex": 0,
          "taskNumber": 1,
          "heading": "Puzzle 1 of 3 (Click to Choose)",
          description: "Who's perfecting the face while the road rolls on?",
          "screen": "Active_front",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082447166-7ujbit-WOW_People_Alice_Cooper_Color.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Selection",
          "correctCoordinates": "[{\"x\":-0.14,\"y\":0.019,\"z\":0.897}]",
          "startPoint": "{\"x\":-0.14,\"y\":0.019,\"z\":0.897}",
          "midPoint": null,
          "endPoint": null,
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-23T16:20:11.041Z"
      },
      {
          id: 27,
          "sequenceId": 7,
          "taskIndex": 2,
          "taskNumber": 3,
          "heading": "Puzzle 3 of 3 (Draw a Circle)",
          description: "Who came down the twisting path one step at a time?",
          "screen": "Active_back",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082420168-v0qr3q-Beverly_Hillbillies_Colored.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Anticipation",
          "correctCoordinates": "[{\"x\":0.366,\"y\":0.14,\"z\":0.897},{\"x\":0.362,\"y\":0.14,\"z\":0.897},{\"x\":0.375,\"y\":0.171,\"z\":0.897}]",
          "startPoint": "{\"x\":0.366,\"y\":0.14,\"z\":0.897}",
          "midPoint": "{\"x\":0.362,\"y\":0.14,\"z\":0.897}",
          "endPoint": "{\"x\":0.375,\"y\":0.171,\"z\":0.897}",
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-23T16:26:09.358Z"
      },
      {
          id: 28,
          "sequenceId": 7,
          "taskIndex": 3,
          "taskNumber": 4,
          "heading": "Bonus Puzzle (Draw a Circle)",
          description: "Who receives a royal treat without leaving his throne?",
          "screen": "Active_side_r",
          "image": "https://s3.buyfacts.com/buyfacts-public-assets/cubicon/Puzzle/1792082419103-hp8641-Alice_In_Wonderland_Colored.webp",
          "rotation": "left",
          "rotationInterval": 15,
          "questionType": "Anticipation",
          "correctCoordinates": "[{\"x\":-0.048,\"y\":0.178,\"z\":0.502},{\"x\":-0.038,\"y\":0.183,\"z\":0.502},{\"x\":-0.071,\"y\":0.15,\"z\":0.502}]",
          "startPoint": "{\"x\":-0.048,\"y\":0.178,\"z\":0.502}",
          "midPoint": "{\"x\":-0.038,\"y\":0.183,\"z\":0.502}",
          "endPoint": "{\"x\":-0.071,\"y\":0.15,\"z\":0.502}",
          "tolerance": 0.5,
          "isFinal": false,
          "createdAt": "2026-10-23T16:30:55.311Z"
      }
  ];

  for (const t of cubiconTasks) {
    await prisma.cubiconTask.upsert({
      where: { id: t.id },
      update: {
        ...t,
        createdAt: new Date(t.createdAt),
      },
      create: {
        ...t,
        createdAt: new Date(t.createdAt),
      },
    });
  }

  try {
    await prisma.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"CubiconTask"', 'id'), coalesce((SELECT max(id) FROM "CubiconTask"), 1));`
    );
  } catch {
    // Non-fatal if sequence sync is not supported in the active environment
  }

  console.log(`   Seeded ${cubiconTasks.length} Cubicon Tasks across ${sequences.length} Sequences`);


  // 8. Content Vault Topics and Multi-Format Assets
  console.log("8. Seeding Content Vault Topics and Assets for Guests...");

  const vaultTopics = [
    // Products
    { name: "Cubicon 3D", slug: "cubicon-3d", category: "Product" },
    { name: "ResearchLib", slug: "research-lib", category: "Product" },
    { name: "TRIAD Framework", slug: "triad-framework", category: "Product" },
    {
      name: "Value Quantification",
      slug: "value-quantification",
      category: "Product",
    },
    // Dashboard Topics
    {
      name: "Research Planning",
      slug: "research-planning",
      category: "Dashboard Topic",
    },
    {
      name: "Survey Design",
      slug: "survey-design",
      category: "Dashboard Topic",
    },
    {
      name: "Story-Based Surveys",
      slug: "story-based-surveys",
      category: "Dashboard Topic",
    },
    {
      name: "Participant Validation",
      slug: "participant-validation",
      category: "Dashboard Topic",
    },
    {
      name: "Pattern Insights",
      slug: "pattern-insights",
      category: "Dashboard Topic",
    },
  ];

  const createdTopics: Record<string, string> = {};
  for (const t of vaultTopics) {
    const topicRecord = await prisma.topic.create({
      data: t,
    });
    createdTopics[t.slug] = topicRecord.id;
  }
  console.log(
    `   Seeded ${vaultTopics.length} Topics (Products and Dashboard Topics)`,
  );

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
      description:
        "How triangulating qualitative responses through three distinct validation layers reduces market uncertainty before full-scale investments.",
      format: ContentFormat.ARTICLE,
      sourceUrl:
        "https://www.linkedin.com/pulse/rule-of-three-b2b-customer-discovery-buyfacts",
      topicId: createdTopics["triad-framework"],
      keywords: JSON.stringify([
        "rule of three",
        "customer discovery",
        "b2b research",
        "validation layers",
        "market uncertainty",
        "decision making",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-09-15T10:00:00Z"),
    },
    {
      title: "Cubicon 3D Spatial Survey Architecture Walkthrough",
      description:
        "Complete guided walkthrough of spatial 3D puzzle validation and drag-and-drop coordinate evaluation.",
      format: ContentFormat.VIDEO,
      sourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      embedCode:
        '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ" title="Cubicon 3D Spatial Survey Architecture Walkthrough" style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
      topicId: createdTopics["cubicon-3d"],
      keywords: JSON.stringify([
        "cubicon 3d",
        "spatial survey",
        "puzzle validation",
        "interactive coordinate",
        "participant engagement",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-09-20T14:30:00Z"),
    },
    {
      title: "Return on Effort (ROE) Framework Whitepaper",
      description:
        "Comprehensive architectural whitepaper detailing mathematical models for maximizing researcher yield per fieldwork hour.",
      format: ContentFormat.PDF,
      sourceUrl: "https://pdfobject.com/pdf/sample.pdf",
      topicId: createdTopics["value-quantification"],
      keywords: JSON.stringify([
        "return on effort",
        "roe framework",
        "research yield",
        "fieldwork economics",
        "b2b metrics",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-09-28T09:00:00Z"),
    },
    {
      title: "Early Market Movement Recognition Audio Briefing",
      description:
        "Executive audio briefing on detecting subtle behavioral shifts in enterprise buyer panels before quarterly churn signals appear.",
      format: ContentFormat.AUDIO,
      sourceUrl:
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      topicId: createdTopics["pattern-insights"],
      keywords: JSON.stringify([
        "early signals",
        "market movement",
        "buyer patterns",
        "executive briefing",
        "b2b intelligence",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-10-02T16:00:00Z"),
    },
    {
      title: "Survey Design Imperatives: Eliminating Acquiescence Bias",
      description:
        "Empirical strategies for framing dual-choice prompts and story-based exercises that force deliberate cognitive engagement.",
      format: ContentFormat.ARTICLE,
      sourceUrl: "https://buyfacts.com/research-imperatives",
      topicId: createdTopics["survey-design"],
      keywords: JSON.stringify([
        "survey design",
        "bias elimination",
        "story-based surveys",
        "cognitive engagement",
        "question framing",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-10-08T11:15:00Z"),
    },
    {
      title: "ResearchLib Narrative Survey Demo",
      description:
        "Demonstration of dynamic fill-in-the-blank narrative survey interfaces that dramatically improve completion fidelity.",
      format: ContentFormat.VIDEO,
      sourceUrl:
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      embedCode:
        '<video controls preload="metadata" style="width:100%;aspect-ratio:16/9;border-radius:12px;background:#000;"><source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4"></video>',
      topicId: createdTopics["research-lib"],
      keywords: JSON.stringify([
        "researchlib",
        "narrative survey",
        "fill in the blanks",
        "completion fidelity",
        "storytelling",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-10-12T13:45:00Z"),
    },
    {
      title: "Participant Validation Protocol Reference",
      description:
        "Standard operating procedures for establishing verified identity and domain authority during high-stakes survey intake.",
      format: ContentFormat.PDF,
      sourceUrl: "https://pdfobject.com/pdf/sample.pdf",
      topicId: createdTopics["participant-validation"],
      keywords: JSON.stringify([
        "participant validation",
        "identity verification",
        "high stakes research",
        "data fidelity",
        "panel management",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-10-13T10:00:00Z"),
    },
    {
      title: "Story-Based Survey Methodology Deep Dive",
      description:
        "In-depth audio masterclass on turning standard survey friction into engaging narrative exploration.",
      format: ContentFormat.AUDIO,
      sourceUrl:
        "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
      topicId: createdTopics["story-based-surveys"],
      keywords: JSON.stringify([
        "story based surveys",
        "narrative friction",
        "audio masterclass",
        "qualitative depth",
        "engagement",
      ]),
      isPublished: true,
      publishedAt: new Date("2026-10-14T08:30:00Z"),
    },
  ];

  for (const a of vaultAssets) {
    await prisma.vaultAsset.create({
      data: a,
    });
  }
  console.log(
    `   Seeded ${vaultAssets.length} Vault Assets across all formats for Guests\n`,
  );

  console.log("\nBuyFacts Core DB seeding completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Error during seeding:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
