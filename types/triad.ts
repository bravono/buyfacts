// src/types/triad.ts

export type CornerKey = "Top" | "LL" | "LR";

export type PlesFocusArea = "Priority" | "Effort" | "Legacy" | "Share";

export type KymDomain = "Cognitive" | "Physical" | "Creative" | "Social";

export type SatchelLifecycleState =
    | "IDLE_CLOSED"     // Stage 1: Closed & upright at rest
    | "ROTATING_DOWN"   // Stage 2: Rotates 180° downward toward TRIAD area
    | "ACTIVATED_OPEN"  // Stage 3: Flap opens awaiting reflection
    | "MINIMIZED_ICON"  // Stage 4: Reduces to icon size (<11vh) while TRIAD is in progress
    | "AWAITING_SWIPE"  // Stage 5: Resumes full size (<22vh) awaiting upward swipe
    | "STORED_SECURE";  // Stage 6: Flap snaps closed & rotates 180° upright

export interface KymQuestion {
    questionNumber: number;
    id: string;
    focusArea: PlesFocusArea;
    question: string;
    queryName: string;
    choices: {
        Top: string; // Score = 99 (+4.9 Peak)
        LL: string;  // Score = 33 (-3.3 Valley)
        LR: string;  // Score = 66 (0.0 Base)
    };
    learningMode: string;
    category: "Life" | "Work" | "Love";
    puckColor: string;
    fillColor: string;
}

export interface RecordedReflection {
    questionNumber: number;
    id: string;
    queryName: string;
    focusArea: PlesFocusArea;
    domain: KymDomain;
    corner: CornerKey;
    score: 33 | 66 | 99;
    w1: number; // Top barycentric weight
    w2: number; // Lower-Left barycentric weight
    w3: number; // Lower-Right barycentric weight
    timestamp: string;
}

export interface DomainAggregate {
    domain: KymDomain;
    focusArea: PlesFocusArea;
    questionCount: number;
    meanScore: number;
    elevation: number; // -3.3 (Valley) to +4.9 (Peak)
    questions: Array<{
        id: string;
        questionNumber: number;
        queryName: string;
        focusArea: PlesFocusArea;
        corner: CornerKey;
        score: number;
    }>;
}