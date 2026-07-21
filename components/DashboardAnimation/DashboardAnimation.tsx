import React, { type SVGProps } from "react";

/** Raster assets served from /public/dashboard-animation */
const ASSETS = {
  person: "/dashboard-animation/image2.png",
  background: "/dashboard-animation/image3.png",
} as const;

/**
 * Default arc title — shorter titles are centered across the arc slots.
 */
export const TITLE = "Range of Responsibilities";

export type DashboardButton = {
  /** Button label. Use \n for a second line. */
  label: string;
  /** Link URL for this button */
  href: string;
};

/**
 * Default button list (9 slots). Pass a different `buttons` prop per page
 * to control labels and URLs.
 *
 * Slot order (matches the SVG layout):
 * 0–2 left column, 3–5 center column, 6–8 right column
 */
export const DEFAULT_BUTTONS: DashboardButton[] = [
  { label: "Define It", href: "https://www.buyfacts.com/" },
  { label: "Host", href: "https://www.buyfacts.com/" },
  { label: "Bot", href: "https://www.buyfacts.com/" },
  { label: "Refine It", href: "https://www.buyfacts.com/" },
  { label: "Analyze It", href: "https://www.buyfacts.com/" },
  { label: "Story Based", href: "https://www.buyfacts.com/" },
  { label: "Build It", href: "https://www.buyfacts.com/" },
  { label: "Leverage", href: "https://www.buyfacts.com/" },
  { label: "Affinity", href: "https://www.buyfacts.com/" },
];

/** @deprecated Use DEFAULT_BUTTONS */
export const BUTTONS = DEFAULT_BUTTONS;

export type DashboardAnimationProps = SVGProps<SVGSVGElement> & {
  /** Arc title text */
  title?: string;
  /**
   * List of up to 9 buttons. Order maps to fixed SVG slots:
   * left (0–2), center (3–5), right (6–8).
   * Missing slots fall back to DEFAULT_BUTTONS.
   */
  buttons?: DashboardButton[];
};

/**
 * Arc the title follows — letter spacing is handled by SVG textPath,
 * so any title string renders without overlapping glyphs.
 */
const TITLE_ARC_PATH =
  "M 190 552 C 310 598, 565 598, 685 552";
const TITLE_ARC_PATH_ID = "dashboard-title-arc";

type ButtonSlotMeta = {
  id: string;
  d: string;
  textTransform: string;
  fontSize: number;
};

/**
 * Fixed geometry for the 9 button slots (left → center → right).
 * textTransform points are button centers; labels use textAnchor="middle".
 */
const BUTTON_SLOTS: ButtonSlotMeta[] = [
  {
    id: "slot-0",
    d: "m64.52,523v67.78c0,4.53,3.39,10.18,7.73,12.54,62.78,34.5,129.43,59.11,197.69,73.91,4.62.94,8.39-1.98,8.39-6.5v-67.78c0-4.53-3.77-9.05-8.39-9.99-68.25-14.8-134.9-39.41-197.69-73.91-1.32-.66-2.55-1.04-3.58-1.04-2.45,0-4.15,1.79-4.15,5Z",
    textTransform:
      "translate(168 608) rotate(20) scale(1.06 .94) skewX(17.82)",
    fontSize: 28,
  },
  {
    id: "slot-1",
    d: "m64.52,613.32v67.78c0,4.62,3.39,10.18,7.73,12.54,62.78,34.5,129.43,59.11,197.69,73.91,4.62.94,8.39-1.98,8.39-6.5v-67.78c0-4.53-3.77-8.96-8.39-9.99-68.25-14.8-134.9-39.41-197.69-73.91-1.32-.66-2.55-1.04-3.58-1.04-2.45,0-4.15,1.79-4.15,5Z",
    textTransform:
      "translate(168 698) rotate(20) scale(1.06 .94) skewX(17.82)",
    fontSize: 28,
  },
  {
    id: "slot-2",
    d: "m67.59,704.59v67.78c0,4.53,3.39,10.18,7.73,12.54,62.78,34.5,129.43,59.11,197.69,73.91,4.62.94,8.39-1.98,8.39-6.5v-67.78c0-4.53-3.77-9.05-8.39-9.99-68.25-14.8-134.9-39.41-197.69-73.91-1.32-.66-2.55-1.04-3.58-1.04-2.45,0-4.15,1.79-4.15,5Z",
    textTransform:
      "translate(171 789) rotate(20) scale(1.06 .94) skewX(17.82)",
    fontSize: 28,
  },
  {
    id: "slot-3",
    d: "m542.15,602.28c-68.95,9.96-138.93,10.13-207.97.52-4.64-.69-8.41,2.4-8.41,6.96v67.75c0,4.55,3.78,8.84,8.41,9.53,69.04,9.62,139.02,9.53,207.97-.52,4.64-.69,8.41-4.98,8.41-9.53v-67.75c0-4.12-3.09-7.04-7.21-7.04-.34,0-.77,0-1.2.09Z",
    textTransform: "translate(434 647)",
    fontSize: 26,
  },
  {
    id: "slot-4",
    d: "m542.15,696.45c-68.95,9.96-138.93,10.13-207.97.52-4.64-.69-8.41,2.4-8.41,6.96v67.75c0,4.55,3.78,8.84,8.41,9.53,69.04,9.62,139.02,9.53,207.97-.52,4.64-.69,8.41-4.98,8.41-9.53v-67.75c0-4.12-3.09-7.04-7.21-7.04-.34,0-.77,0-1.2.09Z",
    textTransform: "translate(434 741)",
    fontSize: 26,
  },
  {
    id: "slot-5",
    d: "m541.75,790.82c-68.95,9.96-138.93,10.13-207.97.52-4.64-.69-8.41,2.4-8.41,6.96v67.75c0,4.55,3.78,8.84,8.41,9.53,69.04,9.62,139.02,9.53,207.97-.52,4.64-.69,8.41-4.98,8.41-9.53v-67.75c0-4.12-3.09-7.04-7.21-7.04-.34,0-.77,0-1.2.09Z",
    textTransform: "translate(434 836)",
    fontSize: 26,
  },
  {
    id: "slot-6",
    d: "m800.04,519.98c-62.78,34.83-129.33,59.76-197.48,74.86-4.63,1.04-8.4,5.48-8.4,10.01v67.78c0,4.63,3.78,7.46,8.4,6.42,68.16-15.1,134.71-40.03,197.48-74.76,4.25-2.36,7.65-8.02,7.65-12.56v-67.78c0-3.21-1.7-5-4.15-5-1.04,0-2.27.38-3.49,1.04Z",
    textTransform:
      "translate(700 608) rotate(-20) scale(1.06 .94) skewX(-17.82)",
    fontSize: 26,
  },
  {
    id: "slot-7",
    d: "m800.04,611.1c-62.78,34.83-129.33,59.76-197.49,74.86-4.63,1.04-8.4,5.48-8.4,10.01v67.78c0,4.63,3.78,7.46,8.4,6.42,68.16-15.1,134.71-40.03,197.49-74.77,4.25-2.36,7.65-8.02,7.65-12.56v-67.78c0-3.21-1.7-5-4.15-5-1.04,0-2.27.38-3.49,1.04Z",
    textTransform:
      "translate(700 699) rotate(-20) scale(1.06 .94) skewX(-17.82)",
    fontSize: 26,
  },
  {
    id: "slot-8",
    d: "m800.18,703.24c-62.78,34.83-129.33,59.76-197.49,74.86-4.63,1.04-8.4,5.48-8.4,10.01v67.78c0,4.63,3.78,7.46,8.4,6.42,68.16-15.1,134.71-40.03,197.49-74.76,4.25-2.36,7.65-8.02,7.65-12.56v-67.78c0-3.21-1.7-5-4.15-5-1.04,0-2.27.38-3.49,1.04Z",
    textTransform:
      "translate(700 791) rotate(-20) scale(1.06 .94) skewX(-17.82)",
    fontSize: 26,
  },
];

function renderButtonLabel(label: string): React.ReactNode {
  const lines = label.split("\n");
  if (lines.length < 2) {
    return <tspan x={0} y={0}>{label}</tspan>;
  }
  return (
    <>
      <tspan x={0} y={-12}>
        {lines[0]}
      </tspan>
      <tspan x={0} y={16}>
        {lines.slice(1).join(" ")}
      </tspan>
    </>
  );
}

function resolveButtons(buttons?: DashboardButton[]): DashboardButton[] {
  return BUTTON_SLOTS.map((_, index) => {
    const provided = buttons?.[index];
    const fallback = DEFAULT_BUTTONS[index];
    return {
      label: provided?.label ?? fallback.label,
      href: provided?.href ?? fallback.href,
    };
  });
}

export default function DashboardAnimation({
  title = TITLE,
  buttons,
  className,
  ...props
}: DashboardAnimationProps) {
  const resolvedButtons = resolveButtons(buttons);
  const titlePathId = `${TITLE_ARC_PATH_ID}-${React.useId().replace(/:/g, "")}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 875.02 1082.23"
      className={className}
      role="img"
      aria-label={title}
      {...props}
    >
      <defs>
        <path id={titlePathId} d={TITLE_ARC_PATH} fill="none" />
        <style>{`
          .dashboard-btn { cursor: pointer; }
          .dashboard-btn:hover { opacity: 0.85; }
          .dashboard-btn:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        `}</style>
      </defs>

      <g id="arthist">
        <g id="Person">
          <image
            width={509}
            height={1026}
            transform="translate(0 26) scale(.29)"
            href={ASSETS.person}
            style={{ isolation: "isolate" }}
          />
        </g>
      </g>

      <g id="background">
        <image
          width={2969}
          height={3591}
          transform="translate(1.55) scale(.29)"
          href={ASSETS.background}
          style={{ isolation: "isolate" }}
        />
      </g>

      <g id="title">
        <text
          fill="#fff"
          fontFamily="Roboto, sans-serif"
          fontSize={32}
          fontWeight={700}
          letterSpacing="0.04em"
        >
          <textPath
            href={`#${titlePathId}`}
            startOffset="50%"
            textAnchor="middle"
          >
            {title}
          </textPath>
        </text>
      </g>

      {resolvedButtons.map((btn, index) => {
        const slot = BUTTON_SLOTS[index];
        return (
          <a
            key={slot.id}
            href={btn.href}
            target="_blank"
            rel="noopener noreferrer"
            className="dashboard-btn"
            aria-label={btn.label.replace(/\n/g, " ")}
          >
            <g id={slot.id}>
              <path
                d={slot.d}
                fill="none"
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                transform={slot.textTransform}
                fill="#fff"
                fontFamily="Roboto, sans-serif"
                fontSize={slot.fontSize}
                fontWeight={500}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {renderButtonLabel(btn.label)}
              </text>
            </g>
          </a>
        );
      })}
    </svg>
  );
}
