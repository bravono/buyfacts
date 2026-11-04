import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  VALID_COMBOS,
  VALID_QUESTION_TYPES,
  VALID_WIDGETS,
  NarrativeSurvey,
  SurveyTask,
} from "@/types/narrative-survey";

export const DEFAULT_SURVEYS = [
  {
    userId: "system_default",
    heading: "ORGANIZATIONAL FUNCTION",
    instruction: "Select your function by positioning within the triangle",
    widget: "triad",
    story:
      "I got up from my desk after getting off the phone with our top salesperson. The conversation had turned to AI as it often did these days. As I walked toward the meeting room I thought about my involvement with marketing, Being in the ____a_____ function I had a pretty good idea of what was going on.",
    combo: "narWid",
    durationInMin: "30",
    pauseDuration: "3",
    timeCounter: "down",
    isFollowup: 1,
    blanks: JSON.stringify([
      {
        name: "a",
        questionType: "triad",
        heading: "ORGANIZATIONAL FUNCTION",
        instruction: "Select your function by positioning within the triangle",
        widget: "triad",
        choiceList: [
          { name: "item 1", text: "Marketing", value: 0 },
          { name: "item 2", text: "Sales", value: 0 },
          { name: "item 3", text: "Operations", value: 0 },
        ],
      },
    ]),
  },
  {
    userId: "system_default",
    heading: "AI ADOPTION RATE",
    instruction: "Rate the speed of adoption relative to other functions",
    widget: "triad",
    story:
      "You know, I thought market’s adoption of AI compared to other function is____b_______",
    combo: "narWid",
    durationInMin: "30",
    pauseDuration: "3",
    timeCounter: "down",
    isFollowup: 1,
    blanks: JSON.stringify([
      {
        name: "b",
        questionType: "triad",
        heading: "AI ADOPTION RATE",
        instruction: "Rate the speed of adoption relative to other functions",
        widget: "triad",
        choiceList: [
          { name: "item 1", text: "Slow", value: 0 },
          { name: "item 2", text: "Moderate", value: 0 },
          { name: "item 3", text: "Rapid", value: 0 },
        ],
      },
    ]),
  },
  {
    userId: "system_default",
    heading: "AI MOMENTUM",
    instruction: "Select the visible momentum observed in the market",
    widget: "triad",
    story:
      "because the visibly shows_____c__________.",
    combo: "narWid",
    durationInMin: "30",
    pauseDuration: "3",
    timeCounter: "down",
    isFollowup: 1,
    blanks: JSON.stringify([
      {
        name: "c",
        questionType: "triad",
        heading: "AI MOMENTUM",
        instruction: "Select the visible momentum observed in the market",
        widget: "triad",
        choiceList: [
          { name: "item 1", text: "Hidden Momentum (Internal Work and Programs)", value: 0 },
          { name: "item 2", text: "Visible Momentum (With Other Functions/Customers)", value: 0 },
          { name: "item 3", text: "Network Momentum (In the Market)", value: 0 },
        ],
      },
    ]),
  },
  {
    userId: "system_default",
    heading: "EXTERNAL AI COMMITMENT",
    instruction: "Assess the level of commitment to taking AI outside the organization",
    widget: "triad",
    story:
      "From what I see Marketing’s taking AI outside the organization has  ______d___________.",
    combo: "narWid",
    durationInMin: "30",
    pauseDuration: "3",
    timeCounter: "down",
    isFollowup: 1,
    blanks: JSON.stringify([
      {
        name: "d",
        questionType: "triad",
        heading: "EXTERNAL AI COMMITMENT",
        instruction: "Assess the level of commitment to taking AI outside the organization",
        widget: "triad",
        choiceList: [
          { name: "item 1", text: "No Commitment", value: 0 },
          { name: "item 2", text: "Some Promise", value: 0 },
          { name: "item 3", text: "Strong Commitment", value: 0 },
        ],
      },
    ]),
  },
  {
    userId: "system_default",
    heading: "LEADERSHIP DIALOGUE",
    instruction: "Characterize leadership discussion regarding commitment to AI",
    widget: "triad",
    story:
      "I sat down across the table from the head of Marketing who _____e______ about marketing’s commitment to the use of AI.",
    combo: "narWid",
    durationInMin: "30",
    pauseDuration: "3",
    timeCounter: "down",
    isFollowup: 1,
    blanks: JSON.stringify([
      {
        name: "e",
        questionType: "triad",
        heading: "LEADERSHIP DIALOGUE",
        instruction: "Characterize leadership discussion regarding commitment to AI",
        widget: "triad",
        choiceList: [
          { name: "item 1", text: "Never Spoke", value: 0 },
          { name: "item 2", text: "Had Spoken", value: 0 },
          { name: "item 3", text: "Often Spoke", value: 0 },
        ],
      },
    ]),
  },
  {
    userId: "system_default",
    heading: "PRIMARY SUCCESS FACTOR",
    instruction: "Select the primary driver behind marketing's current positioning",
    widget: "triad",
    story:
      "I sat back and new that marketing was where it was today because of ____f_______________.",
    combo: "narWid",
    durationInMin: "30",
    pauseDuration: "3",
    timeCounter: "down",
    isFollowup: 0, // Final task has follow up set to false
    blanks: JSON.stringify([
      {
        name: "f",
        questionType: "triad",
        heading: "PRIMARY SUCCESS FACTOR",
        instruction: "Select the primary driver behind marketing's current positioning",
        widget: "triad",
        choiceList: [
          { name: "item 1", text: "The People", value: 0 },
          { name: "item 2", text: "The Way They Work", value: 0 },
          { name: "item 3", text: "Leadership", value: 0 },
        ],
      },
    ]),
  },
];

export async function ensureSeedSurveys() {
  const count = await prisma.researchLibSurvey.count();
  if (count === 0) {
    const createdSurvey = await prisma.researchLibSurvey.create({
      data: {
        userId: "system_default",
        title: "AI Marketing Directional Measurement",
        timeCounter: "down",
        pauseDuration: "3",
        durationInMin: "30",
        combo: "narWid",
      },
    });

    for (let idx = 0; idx < DEFAULT_SURVEYS.length; idx++) {
      const item = DEFAULT_SURVEYS[idx];
      const isFinal = idx === DEFAULT_SURVEYS.length - 1;
      await prisma.researchLibTask.create({
        data: {
          surveyId: createdSurvey.id,
          taskIndex: idx,
          heading: item.heading,
          instruction: item.instruction,
          widget: item.widget,
          question: item.story,
          story: item.story,
          blanks: item.blanks,
          isFollowup: isFinal ? 0 : 1,
        },
      });
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

    const survey = await prisma.researchLibSurvey.findFirst({
      where: {
        OR: [{ userId }, { userId: "system_default" }],
      },
      include: {
        tasks: {
          orderBy: { taskIndex: "asc" },
        },
      },
      orderBy: { id: "asc" },
    });

    if (!survey || !survey.tasks || survey.tasks.length === 0) {
      return NextResponse.json(
        { error: "No survey questions found in database" },
        { status: 404 }
      );
    }

    const tasksList = survey.tasks;

    // Top-level survey hierarchy view
    if (
      searchParams.get("view") === "survey" ||
      searchParams.get("format") === "survey"
    ) {
      const formattedTasks: SurveyTask[] = tasksList.map((t, idx) => {
        let parsedBlanks = [];
        try {
          parsedBlanks = JSON.parse(t.blanks);
        } catch {
          parsedBlanks = [];
        }
        return {
          id: t.id,
          taskIndex: t.taskIndex,
          heading: t.heading,
          instruction: t.instruction,
          widget: t.widget,
          question: t.question || t.story || "",
          story: t.story || t.question || "",
          blanks: parsedBlanks,
          isFollowup: idx === tasksList.length - 1 ? false : Boolean(t.isFollowup),
        };
      });

      const surveyModel: NarrativeSurvey = {
        userId,
        title: survey.title || "AI Marketing Directional Measurement",
        timeCounter: survey.timeCounter || "down",
        pauseDuration: survey.pauseDuration || "3",
        durationInMin: survey.durationInMin || "30",
        combo: survey.combo || "narWid",
        tasks: formattedTasks,
      };

      return NextResponse.json({
        survey: surveyModel,
        allowedCombos: VALID_COMBOS,
        allowedQuestionTypes: VALID_QUESTION_TYPES,
        allowedWidgets: VALID_WIDGETS,
      });
    }

    // Completed responses count for this user
    const completedCount = await prisma.researchLibResponse.count({
      where: { userId },
    });

    const activeTask = tasksList[completedCount] || tasksList[0];

    let parsedBlanks = [];
    try {
      parsedBlanks = JSON.parse(activeTask.blanks);
    } catch {
      parsedBlanks = [];
    }

    const isFinalTask = completedCount === tasksList.length - 1;

    return NextResponse.json({
      reply: {
        blanks: parsedBlanks.map((b: any) => ({
          name: b.name,
          questionType: b.questionType || "",
          choiceList: b.choiceList || [],
          heading: activeTask.heading,
          instruction: activeTask.instruction,
          widget: activeTask.widget,
        })),
        durationInMin: survey.durationInMin || "30",
        pauseDuration: survey.pauseDuration || "3",
        timeCounter: survey.timeCounter || "down",
        sessionId: userId,
        isFollowup: isFinalTask ? false : Boolean(activeTask.isFollowup),
        story: activeTask.story,
        combo: survey.combo,
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
        userId,
        surveyId: payload.surveyId || payload.survey_id ? Number(payload.surveyId || payload.survey_id) : null,
        answers: JSON.stringify(answers),
        story: payload.story ? String(payload.story) : null,
      },
    });

    const completedCount = await prisma.researchLibResponse.count({
      where: { userId },
    });

    const survey = await prisma.researchLibSurvey.findFirst({
      where: {
        OR: [{ userId }, { userId: "system_default" }],
      },
      include: {
        tasks: {
          orderBy: { taskIndex: "asc" },
        },
      },
      orderBy: { id: "asc" },
    });

    const tasksList = survey?.tasks || [];
    const nextTask = tasksList[completedCount];

    if (nextTask) {
      let parsedBlanks = [];
      try {
        parsedBlanks = JSON.parse(nextTask.blanks);
      } catch {
        parsedBlanks = [];
      }

      const isNextFinalTask = completedCount === tasksList.length - 1;

      return NextResponse.json({
        reply: {
          blanks: parsedBlanks.map((b: any) => ({
            name: b.name,
            questionType: b.questionType || "",
            choiceList: b.choiceList || [],
            heading: nextTask.heading,
            instruction: nextTask.instruction,
            widget: nextTask.widget,
          })),
          durationInMin: survey?.durationInMin || "30",
          pauseDuration: survey?.pauseDuration || "3",
          timeCounter: survey?.timeCounter || "down",
          sessionId: userId,
          isFollowup: isNextFinalTask ? false : Boolean(nextTask.isFollowup),
          story: nextTask.story,
          combo: survey?.combo || "narWid",
        },
      });
    }

    // Survey complete - all tasks completed
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
        durationInMin: survey?.durationInMin || "30",
        pauseDuration: survey?.pauseDuration || "3",
        timeCounter: survey?.timeCounter || "down",
        sessionId: userId,
        isFollowup: false,
        story:
          "This concludes your test drive of directional measurement of perception, activity and performance. Would you like to download your results? SEND IT Would you like to see a comparison of your answers to other marketing peers? SEND IT Any feedback on your experience ASK ME EXIT.",
        combo: survey?.combo || "narWid",
        redirect: "/finish",
        final: true,
      },
    });
  } catch (err: any) {
    console.error("POST /api/narrative-data error:", err);
    return NextResponse.json(
      { error: "Failed to submit survey response", details: err.message },
      { status: 500 }
    );
  }
}
