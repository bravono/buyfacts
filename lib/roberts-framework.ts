/**
 * Robert's Three-Part Framework™: Research, Rules, Way
 * Complete SRA 10-Color Semantic Design System and Tenets
 */

export interface SRALevelColor {
  id: number;
  name: string;
  code: string;
  cssVar: string;
  bgVar: string;
  borderVar: string;
  hex: string;
}

export const SRA_COLOR_SPECTRUM: Record<number, SRALevelColor> = {
  1: {
    id: 1,
    name: "Pink",
    code: "pink",
    cssVar: "var(--sra-pink)",
    bgVar: "var(--sra-pink-bg)",
    borderVar: "var(--sra-pink-border)",
    hex: "#F8A5C2",
  },
  2: {
    id: 2,
    name: "Red",
    code: "red",
    cssVar: "var(--sra-red)",
    bgVar: "var(--sra-red-bg)",
    borderVar: "var(--sra-red-border)",
    hex: "#E84118",
  },
  3: {
    id: 3,
    name: "Orange",
    code: "orange",
    cssVar: "var(--sra-orange)",
    bgVar: "var(--sra-orange-bg)",
    borderVar: "var(--sra-orange-border)",
    hex: "#E67E22",
  },
  4: {
    id: 4,
    name: "Yellow",
    code: "yellow",
    cssVar: "var(--sra-yellow)",
    bgVar: "var(--sra-yellow-bg)",
    borderVar: "var(--sra-yellow-border)",
    hex: "#F1C40F",
  },
  5: {
    id: 5,
    name: "Spring Green",
    code: "spring-green",
    cssVar: "var(--sra-spring-green)",
    bgVar: "var(--sra-spring-green-bg)",
    borderVar: "var(--sra-spring-green-border)",
    hex: "#2ECC71",
  },
  6: {
    id: 6,
    name: "Forest Green",
    code: "forest-green",
    cssVar: "var(--sra-forest-green)",
    bgVar: "var(--sra-forest-green-bg)",
    borderVar: "var(--sra-forest-green-border)",
    hex: "#27AE60",
  },
  7: {
    id: 7,
    name: "Sky Blue",
    code: "sky-blue",
    cssVar: "var(--sra-sky-blue)",
    bgVar: "var(--sra-sky-blue-bg)",
    borderVar: "var(--sra-sky-blue-border)",
    hex: "#00A8FF",
  },
  8: {
    id: 8,
    name: "Royal Blue",
    code: "royal-blue",
    cssVar: "var(--sra-royal-blue)",
    bgVar: "var(--sra-royal-blue-bg)",
    borderVar: "var(--sra-royal-blue-border)",
    hex: "#273C75",
  },
  9: {
    id: 9,
    name: "Fuscia",
    code: "fuscia",
    cssVar: "var(--sra-fuscia)",
    bgVar: "var(--sra-fuscia-bg)",
    borderVar: "var(--sra-fuscia-border)",
    hex: "#E056FD",
  },
  10: {
    id: 10,
    name: "Purple",
    code: "purple",
    cssVar: "var(--sra-purple)",
    bgVar: "var(--sra-purple-bg)",
    borderVar: "var(--sra-purple-border)",
    hex: "#8C7AE6",
  },
};

export interface RobertTenet {
  id: number;
  numberStr: string;
  title: string;
  command: string;
  color: SRALevelColor;
  prompts: string[];
}

export const ROBERTS_TEN_TENETS: RobertTenet[] = [
  {
    id: 1,
    numberStr: "01",
    title: "EARLY RECOGNITION",
    command: "Recognize what may matter earlier so you gain time to protect choices and personal benefit.",
    color: SRA_COLOR_SPECTRUM[1],
    prompts: [
      "Sense what is developing.",
      "Test whether it is real.",
      "Judge whether it is significant.",
    ],
  },
  {
    id: 2,
    numberStr: "02",
    title: "CHOICES",
    command: "Compare meaningful alternatives so you preserve the personal benefit of choosing before circumstances choose for you.",
    color: SRA_COLOR_SPECTRUM[2],
    prompts: [
      "Compare the alternative benefits.",
      "Test each choice against existing direction.",
      "Identify the choice with compounding potential.",
    ],
  },
  {
    id: 3,
    numberStr: "03",
    title: "DIRECTION",
    command: "Establish direction before applying speed so your energy advances a grounded personal benefit.",
    color: SRA_COLOR_SPECTRUM[3],
    prompts: [
      "Separate well-grounded passion from a surface-level construct.",
      "Apply only the force the direction deserves.",
      "Build momentum from demonstrated personal benefit.",
    ],
  },
  {
    id: 4,
    numberStr: "04",
    title: "SELF-STEWARDSHIP",
    command: "Pursue meaningful personal benefit while governing the risk, energy, and effect you choose to own.",
    color: SRA_COLOR_SPECTRUM[4],
    prompts: [
      "Confirm that the potential return is distinctive and meaningful to you.",
      "Weigh the potential reward against the risk you will accept.",
      "Own the effect you create.",
    ],
  },
  {
    id: 5,
    numberStr: "05",
    title: "SPEED",
    command: "Increase speed only after direction earns it so you gain time without sacrificing personal benefit.",
    color: SRA_COLOR_SPECTRUM[5],
    prompts: [
      "Confirm that the direction has earned greater speed.",
      "Accelerate what preserves or increases personal benefit.",
      "Slow down when speed threatens what you have gained.",
    ],
  },
  {
    id: 6,
    numberStr: "06",
    title: "VELOCITY",
    command: "Combine direction with appropriate speed so your movement produces purposeful personal progress.",
    color: SRA_COLOR_SPECTRUM[6],
    prompts: [
      "Move toward the personal benefit you chose.",
      "Align speed with direction.",
      "Tune direction or pace when new patterns emerge.",
    ],
  },
  {
    id: 7,
    numberStr: "07",
    title: "APPLICATION",
    command: "Apply each tenet to a real situation so its meaning produces an immediate personal benefit.",
    color: SRA_COLOR_SPECTRUM[7],
    prompts: [
      "Select a real situation that matters now.",
      "Adapt the tenet to your experience, needs, and context.",
      "Define the personal benefit the application must produce.",
    ],
  },
  {
    id: 8,
    numberStr: "08",
    title: "USE",
    command: "Use the practice repeatedly so personal benefit becomes practical, accessible, and easier to obtain.",
    color: SRA_COLOR_SPECTRUM[8],
    prompts: [
      "Use the practice again in a meaningful situation.",
      "Remove the friction that obstructs repeated use.",
      "Confirm that continued use returns meaningful personal benefit.",
    ],
  },
  {
    id: 9,
    numberStr: "09",
    title: "REINFORCEMENT",
    command: "Reinforce the practice through repetition and personal gain until it becomes second nature.",
    color: SRA_COLOR_SPECTRUM[9],
    prompts: [
      "Install a cue that calls the practice forward.",
      "Repeat the practice until it changes how you naturally think and act.",
      "Use personal gains to reinforce continued practice.",
    ],
  },
  {
    id: 10,
    numberStr: "10",
    title: "SELF-GUIDED",
    command: "Let Robert's Way become an internal compass that guides you toward compounding gains in work, career, and interpersonal relationships.",
    color: SRA_COLOR_SPECTRUM[10],
    prompts: [
      "Recognize the lessons that produce meaningful personal gains.",
      "Guide yourself toward choices whose benefits can compound.",
      "Live by the lessons that continue to prove their value.",
    ],
  },
];
