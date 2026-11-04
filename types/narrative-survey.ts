export const VALID_COMBOS = [
  "narWid",
  "tradWid",
  "narList",
  "tradList",
] as const;

export type ComboRule = (typeof VALID_COMBOS)[number];

export const VALID_QUESTION_TYPES = [
  "scale",
  "multipleChoice",
  "checkbox",
  "rank",
  "singleChoice",
  "radio",
  "number",
  "text",
  "ring",
  "rate",
  "slider",
  "triad",
] as const;

export type QuestionType = (typeof VALID_QUESTION_TYPES)[number];

export const VALID_WIDGETS = [
  "triad",
  "bar",
  "ring",
  "barrel",
] as const;

export type WidgetType = (typeof VALID_WIDGETS)[number];

export interface BlankChoice {
  name: string;
  text: string;
  value: number;
  scales?: number[];
}

export interface BlankDefinition {
  name: string;
  questionType: QuestionType;
  choiceList: BlankChoice[];
  heading?: string;
  instruction?: string;
  widget?: WidgetType | string;
}

export interface SurveyTask {
  id?: number;
  taskIndex: number;
  heading: string;
  instruction: string;
  widget: WidgetType | string;
  question: string;
  story: string;
  blanks: BlankDefinition[];
  isFollowup: boolean;
}

export interface NarrativeSurvey {
  id?: number | string;
  userId: string;
  title?: string;
  timeCounter: "down" | "up" | string;
  pauseDuration: string;
  durationInMin: string;
  combo: ComboRule | string;
  tasks: SurveyTask[];
}
