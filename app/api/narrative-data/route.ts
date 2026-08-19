import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_SURVEYS = [
  {
    user_id: "system_default",
    heading: "MEAL TYPE",
    instruction: "Select Up to Six",
    widget: "triade",
    story:
      "I eat breakfast, lunch, or dinner each day ___a___, of dessert. Some people suggest that you eat a meal to get to dessert. They’re I’d like to say Let’s Eat!.",
    combo: "narWid",
    durationInMin: "30",
    pauseDuration: "3",
    timeCounter: "down",
    isFollowup: 1,
    blanks: JSON.stringify([
      {
        name: "g",
        questionType: "",
        choiceList: [
          { name: "item 1", text: "Katsina state university", value: 0 },
          { name: "item 2", text: "Kaduna State University", value: 0 },
          { name: "item 3", text: "Kwara State University", value: 0 },
          { name: "item 4", text: "Gombe State University", value: 0 },
          { name: "item 5", text: "Bauchi State University", value: 0 },
        ],
      },
    ]),
  },
  {
    user_id: "system_default",
    heading: "FAVORITE BEVERAGE",
    instruction: "Select one or more options",
    widget: "barrel",
    story: "For a drink, I usually prefer ___a___, especially when it's hot.",
    combo: "narWid",
    durationInMin: "30",
    pauseDuration: "3",
    timeCounter: "down",
    isFollowup: 1,
    blanks: JSON.stringify([
      {
        name: "g",
        questionType: "multipleChoice",
        choiceList: [
          { name: "item 1", text: "Water", value: 0 },
          { name: "item 2", text: "Soda", value: 0 },
          { name: "item 3", text: "Coffee", value: 0 },
          { name: "item 4", text: "Tea", value: 0 },
          { name: "item 5", text: "Juice", value: 0 },
        ],
      },
    ]),
  },
  {
    user_id: "system_default",
    heading: "TRANSPORTATION SHARE",
    instruction: "Allocate percentage to each transit (must sum to 100%)",
    widget: "ring",
    story: "My daily commute consists of ___a___.",
    combo: "narWid",
    durationInMin: "30",
    pauseDuration: "3",
    timeCounter: "down",
    isFollowup: 1,
    blanks: JSON.stringify([
      {
        name: "g",
        questionType: "ring",
        choiceList: [
          { name: "item 1", text: "Driving", value: 0 },
          { name: "item 2", text: "Walking", value: 0 },
          { name: "item 3", text: "Public Transit", value: 0 },
          { name: "item 4", text: "Biking", value: 0 },
        ],
      },
    ]),
  },
  {
    user_id: "system_default",
    heading: "RATING",
    instruction: "Rate this experience",
    widget: "bar",
    story: "Overall, I rate this experience ___a___ out of 10.",
    combo: "narWid",
    durationInMin: "30",
    pauseDuration: "3",
    timeCounter: "down",
    isFollowup: 1,
    blanks: JSON.stringify([
      {
        name: "g",
        questionType: "bar",
        choiceList: [{ name: "item 1", text: "rating", value: 0 }],
      },
    ]),
  },
];

async function ensureSeedSurveys() {
  const count = await prisma.researchLibSurvey.count();
  if (count === 0) {
    for (const item of DEFAULT_SURVEYS) {
      await prisma.researchLibSurvey.create({ data: item });
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId =
      searchParams.get("sid") ||
      searchParams.get("session") ||
      searchParams.get("sessionId") ||
      searchParams.get("user_id") ||
      "123abc";

    await ensureSeedSurveys();

    // Completed responses count for this user
    const completedCount = await prisma.researchLibResponse.count({
      where: { user_id: userId },
    });

    const surveys = await prisma.researchLibSurvey.findMany({
      where: {
        OR: [{ user_id: userId }, { user_id: "system_default" }],
      },
      orderBy: { id: "asc" },
    });


    const activeSurvey = surveys[completedCount] || surveys[0];

    if (!activeSurvey) {
      return NextResponse.json(
        { error: "No survey questions found in database" },
        { status: 404 }
      );
    }

    let parsedBlanks = [];
    try {
      parsedBlanks = JSON.parse(activeSurvey.blanks);
    } catch {
      parsedBlanks = [];
    }

    return NextResponse.json({
      reply: {
        blanks: parsedBlanks.map((b: any) => ({
          name: b.name,
          questionType: b.questionType || "",
          choiceList: b.choiceList || [],
          heading: activeSurvey.heading,
          instruction: activeSurvey.instruction,
          widget: activeSurvey.widget,
        })),
        durationInMin: activeSurvey.durationInMin || "30",
        pauseDuration: activeSurvey.pauseDuration || "3",
        timeCounter: activeSurvey.timeCounter || "down",
        sessionId: userId,
        isFollowup: Boolean(activeSurvey.isFollowup),
        story: activeSurvey.story,
        combo: activeSurvey.combo,
      },
    });
  } catch (err: any) {
    console.error("GET /api/narrative-data error:", err);
    return NextResponse.json(
      { error: "Failed to fetch survey data", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let payload: Record<string, any> = {};
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      payload = await request.json();
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        payload[key] = value;
      }
    } else {
      const text = await request.text();
      try {
        payload = JSON.parse(text);
      } catch {
        payload = {};
      }
    }

    let userId =
      payload.sessionId ||
      payload.sid ||
      payload.user_id ||
      `user_${Date.now()}`;

    const answers = { ...payload };
    delete answers.sessionId;
    delete answers.sid;
    delete answers.user_id;

    // Save response into narrative_responses table
    await prisma.researchLibResponse.create({
      data: {
        user_id: userId,
        survey_id: payload.survey_id ? Number(payload.survey_id) : null,
        answers: JSON.stringify(answers),
        story: payload.story ? String(payload.story) : null,
      },
    });

    const completedCount = await prisma.researchLibResponse.count({
      where: { user_id: userId },
    });

    const surveys = await prisma.researchLibSurvey.findMany({
      where: {
        OR: [{ user_id: userId }, { user_id: "system_default" }],
      },
      orderBy: { id: "asc" },
    });


    const nextSurvey = surveys[completedCount];

    if (nextSurvey) {
      let parsedBlanks = [];
      try {
        parsedBlanks = JSON.parse(nextSurvey.blanks);
      } catch {
        parsedBlanks = [];
      }

      return NextResponse.json({
        reply: {
          blanks: parsedBlanks.map((b: any) => ({
            name: b.name,
            questionType: b.questionType || "",
            choiceList: b.choiceList || [],
            heading: nextSurvey.heading,
            instruction: nextSurvey.instruction,
            widget: nextSurvey.widget,
          })),
          durationInMin: nextSurvey.durationInMin || "30",
          pauseDuration: nextSurvey.pauseDuration || "3",
          timeCounter: nextSurvey.timeCounter || "down",
          sessionId: userId,
          isFollowup: Boolean(nextSurvey.isFollowup),
          story: nextSurvey.story,
          combo: nextSurvey.combo,
        },
      });
    } else {
      // Completed survey
      return NextResponse.json({
        reply: {
          blanks: [
            {
              name: "g",
              questionType: "",
              choiceList: [],
              heading: "Thank You!",
              instruction: "You have finished the survey.",
              widget: "",
            },
          ],
          durationInMin: "30",
          pauseDuration: "3",
          timeCounter: "down",
          sessionId: userId,
          isFollowup: false,
          story: "Thank you for completing this survey!",
          combo: "narWid",
          redirect: "/finish",
          final: true,
        },
      });
    }
  } catch (err: any) {
    console.error("POST /api/narrative-data error:", err);
    return NextResponse.json(
      { error: "Failed to process survey reply", details: err.message },
      { status: 500 }
    );
  }
}
