import React, { type SVGProps } from "react";

/** Raster assets served from /public/dashboard-animation */
const ASSETS = {
  person: "/dashboard-animation/image2.png",
  background: "/dashboard-animation/image3.png",
  defineIt: "/dashboard-animation/image5.png",
  hostIt: "/dashboard-animation/image7.png",
  botRecognition: "/dashboard-animation/image9.png",
  buildIt: "/dashboard-animation/image17.png",
  leverageIt: "/dashboard-animation/image19.png",
  affinityMeasurement: "/dashboard-animation/image21.png",
  refineIt: "/dashboard-animation/image11.png",
  analyzeIt: "/dashboard-animation/image13.png",
  storyBasedSurveys: "/dashboard-animation/image15.png",
} as const;

/**
 * Easy-to-edit content — change title, button labels, and hrefs here.
 * Title fits the arc best at about 31 characters.
 * Use \n in a button label for a second line.
 */
export const TITLE = "BuyFacts Service and Tool Areas";

export const BUTTONS = [
  {
    id: "defineIt",
    label: "Define It",
    href: "https://www.buyfacts.com/",
  },
  {
    id: "hostIt",
    label: "Host It",
    href: "https://www.buyfacts.com/",
  },
  {
    id: "botRecognition",
    label: "Bot Recognition",
    href: "https://www.buyfacts.com/",
  },
  {
    id: "buildIt",
    label: "Build It",
    href: "https://www.buyfacts.com/",
  },
  {
    id: "leverageIt",
    label: "Leverage It",
    href: "https://www.buyfacts.com/",
  },
  {
    id: "affinityMeasurement",
    label: "Affinity\nMeasurement",
    href: "https://www.buyfacts.com/",
  },
  {
    id: "refineIt",
    label: "Refine It",
    href: "https://www.buyfacts.com/",
  },
  {
    id: "analyzeIt",
    label: "Analyze It",
    href: "https://www.buyfacts.com/",
  },
  {
    id: "storyBasedSurveys",
    label: "Story-Based\nSurveys",
    href: "https://www.buyfacts.com/",
  },
] as const;

type ButtonId = (typeof BUTTONS)[number]["id"];

export type DashboardAnimationProps = SVGProps<SVGSVGElement> & {
  /** Override the arc title text */
  title?: string;
  /** Override individual button labels / links by id */
  buttons?: Partial<Record<ButtonId, { label?: string; href?: string }>>;
};

const TITLE_TRANSFORMS = [
  "translate(197.42 555.29) rotate(19.41) scale(.96 1)",
  "translate(218.17 562.55) rotate(17.36) scale(.96 1)",
  "translate(236.04 568.13) rotate(15.68) scale(.96 1)",
  "translate(252.15 572.66) rotate(14.08) scale(.96 1)",
  "translate(269.34 576.98) rotate(12.55) scale(.96 1)",
  "translate(286.75 580.85) rotate(11.05) scale(.96 1)",
  "translate(303.81 584.15) rotate(9.87) scale(.96 1)",
  "translate(314.89 586.11) rotate(8.72) scale(.96 1)",
  "translate(331.83 588.67) rotate(7.71) scale(.96 1)",
  "translate(340 589.83) rotate(6.58) scale(.96 1)",
  "translate(360.39 592.17) rotate(5.09) scale(.96 1)",
  "translate(378.32 593.74) rotate(3.95) scale(.96 1)",
  "translate(390.77 594.62) rotate(2.84) scale(.96 1)",
  "translate(407.67 595.43) rotate(1.89) scale(.96 1)",
  "translate(416.45 595.75) rotate(.93) scale(.96 1)",
  "translate(434.18 596.07) rotate(-.52) scale(.96 1)",
  "translate(452.24 595.88) rotate(-1.34) scale(.96 1)",
  "translate(460.49 595.73) rotate(-2.3) scale(.96 1)",
  "translate(478.31 595.02) rotate(-3.66) scale(.96 1)",
  "translate(496.95 593.83) rotate(-5.08) scale(.96 1)",
  "translate(515.67 592.12) rotate(-6.12) scale(.96 1)",
  "translate(522.99 591.4) rotate(-7.17) scale(.96 1)",
  "translate(540.7 589.2) rotate(-8.51) scale(.96 1)",
  "translate(559.29 586.42) rotate(-10.04) scale(.96 1)",
  "translate(577.84 583.09) rotate(-11.18) scale(.96 1)",
  "translate(586.48 581.38) rotate(-11.91) scale(.96 1)",
  "translate(594.55 579.76) rotate(-13.23) scale(.96 1)",
  "translate(616.33 574.57) rotate(-14.77) scale(.96 1)",
  "translate(627.81 571.59) rotate(-16.13) scale(.96 1)",
  "translate(645.31 566.53) rotate(-17.87) scale(.96 1)",
  "translate(662.88 560.85) rotate(-19.68) scale(.96 1)",
] as const;

const BUTTON_META: Record<
  ButtonId,
  {
    svgId: string;
    d: string;
    fill: string;
    image: { href: string; width: number; height: number; transform: string };
    textTransform: string;
    fontSize: number;
    multiline: boolean;
    line2Dx?: number;
  }
> = {
  defineIt: {
    svgId: "defineIt",
    d: "m64.52,523v67.78c0,4.53,3.39,10.18,7.73,12.54,62.78,34.5,129.43,59.11,197.69,73.91,4.62.94,8.39-1.98,8.39-6.5v-67.78c0-4.53-3.77-9.05-8.39-9.99-68.25-14.8-134.9-39.41-197.69-73.91-1.32-.66-2.55-1.04-3.58-1.04-2.45,0-4.15,1.79-4.15,5Z",
    fill: "url(#radial-gradient)",
    image: {
      href: ASSETS.defineIt,
      width: 516,
      height: 464,
      transform: "translate(95.04 538.87) scale(.28)",
    },
    textTransform: "translate(98.76 593.5) rotate(20) scale(1.06 .94) skewX(17.82)",
    fontSize: 30.2,
    multiline: false,
  },
  hostIt: {
    svgId: "hostIt",
    d: "m64.52,613.32v67.78c0,4.62,3.39,10.18,7.73,12.54,62.78,34.5,129.43,59.11,197.69,73.91,4.62.94,8.39-1.98,8.39-6.5v-67.78c0-4.53-3.77-8.96-8.39-9.99-68.25-14.8-134.9-39.41-197.69-73.91-1.32-.66-2.55-1.04-3.58-1.04-2.45,0-4.15,1.79-4.15,5Z",
    fill: "url(#radial-gradient-2)",
    image: {
      href: ASSETS.hostIt,
      width: 398,
      height: 370,
      transform: "translate(113.39 641.67) scale(.28)",
    },
    textTransform: "translate(126.29 687.97) rotate(20) scale(1.06 .94) skewX(17.82)",
    fontSize: 30.2,
    multiline: false,
  },
  botRecognition: {
    svgId: "botRecognition",
    d: "m67.59,704.59v67.78c0,4.53,3.39,10.18,7.73,12.54,62.78,34.5,129.43,59.11,197.69,73.91,4.62.94,8.39-1.98,8.39-6.5v-67.78c0-4.53-3.77-9.05-8.39-9.99-68.25-14.8-134.9-39.41-197.69-73.91-1.32-.66-2.55-1.04-3.58-1.04-2.45,0-4.15,1.79-4.15,5Z",
    fill: "url(#radial-gradient-3)",
    image: {
      href: ASSETS.botRecognition,
      width: 792,
      height: 518,
      transform: "translate(64.52 704.17) scale(.28)",
    },
    textTransform: "translate(78.09 758.15) rotate(20) scale(1.06 .94) skewX(17.82)",
    fontSize: 26.42,
    multiline: false,
  },
  buildIt: {
    svgId: "buildIt",
    d: "m800.04,519.98c-62.78,34.83-129.33,59.76-197.48,74.86-4.63,1.04-8.4,5.48-8.4,10.01v67.78c0,4.63,3.78,7.46,8.4,6.42,68.16-15.1,134.71-40.03,197.48-74.76,4.25-2.36,7.65-8.02,7.65-12.56v-67.78c0-3.21-1.7-5-4.15-5-1.04,0-2.27.38-3.49,1.04Z",
    fill: "url(#radial-gradient-4)",
    image: {
      href: ASSETS.buildIt,
      width: 409,
      height: 376,
      transform: "translate(645.67 552.52) scale(.28)",
    },
    textTransform: "translate(659.63 633.18) rotate(-20) scale(1.06 .94) skewX(-17.82)",
    fontSize: 26.42,
    multiline: false,
  },
  leverageIt: {
    svgId: "leverageIt",
    d: "m800.04,611.1c-62.78,34.83-129.33,59.76-197.49,74.86-4.63,1.04-8.4,5.48-8.4,10.01v67.78c0,4.63,3.78,7.46,8.4,6.42,68.16-15.1,134.71-40.03,197.49-74.77,4.25-2.36,7.65-8.02,7.65-12.56v-67.78c0-3.21-1.7-5-4.15-5-1.04,0-2.27.38-3.49,1.04Z",
    fill: "url(#radial-gradient-5)",
    image: {
      href: ASSETS.leverageIt,
      width: 583,
      height: 444,
      transform: "translate(622.45 628.47) scale(.28)",
    },
    textTransform: "translate(640.56 728.14) rotate(-20) scale(1.06 .94) skewX(-17.82)",
    fontSize: 26.42,
    multiline: false,
  },
  affinityMeasurement: {
    svgId: "affinityMeasurement",
    d: "m800.18,703.24c-62.78,34.83-129.33,59.76-197.49,74.86-4.63,1.04-8.4,5.48-8.4,10.01v67.78c0,4.63,3.78,7.46,8.4,6.42,68.16-15.1,134.71-40.03,197.49-74.76,4.25-2.36,7.65-8.02,7.65-12.56v-67.78c0-3.21-1.7-5-4.15-5-1.04,0-2.27.38-3.49,1.04Z",
    fill: "url(#radial-gradient-6)",
    image: {
      href: ASSETS.affinityMeasurement,
      width: 704,
      height: 585,
      transform: "translate(602.6 697.91) scale(.28)",
    },
    textTransform: "translate(662.02 793.97) rotate(-20) scale(1.06 .94) skewX(-17.82)",
    fontSize: 26.42,
    multiline: true,
    line2Dx: -38.82,
  },
  refineIt: {
    svgId: "refineIt",
    d: "m542.15,602.28c-68.95,9.96-138.93,10.13-207.97.52-4.64-.69-8.41,2.4-8.41,6.96v67.75c0,4.55,3.78,8.84,8.41,9.53,69.04,9.62,139.02,9.53,207.97-.52,4.64-.69,8.41-4.98,8.41-9.53v-67.75c0-4.12-3.09-7.04-7.21-7.04-.34,0-.77,0-1.2.09Z",
    fill: "url(#radial-gradient-7)",
    image: {
      href: ASSETS.refineIt,
      width: 493,
      height: 238,
      transform: "translate(370.28 618.02) scale(.28)",
    },
    textTransform: "translate(388.89 657.78)",
    fontSize: 26.42,
    multiline: false,
  },
  analyzeIt: {
    svgId: "analyzeIt",
    d: "m542.15,696.45c-68.95,9.96-138.93,10.13-207.97.52-4.64-.69-8.41,2.4-8.41,6.96v67.75c0,4.55,3.78,8.84,8.41,9.53,69.04,9.62,139.02,9.53,207.97-.52,4.64-.69,8.41-4.98,8.41-9.53v-67.75c0-4.12-3.09-7.04-7.21-7.04-.34,0-.77,0-1.2.09Z",
    fill: "url(#radial-gradient-8)",
    image: {
      href: ASSETS.analyzeIt,
      width: 558,
      height: 244,
      transform: "translate(364.55 710.47) scale(.28)",
    },
    textTransform: "translate(380.16 753.16)",
    fontSize: 26.42,
    multiline: false,
  },
  storyBasedSurveys: {
    svgId: "story-basedSurveys",
    d: "m541.75,790.82c-68.95,9.96-138.93,10.13-207.97.52-4.64-.69-8.41,2.4-8.41,6.96v67.75c0,4.55,3.78,8.84,8.41,9.53,69.04,9.62,139.02,9.53,207.97-.52,4.64-.69,8.41-4.98,8.41-9.53v-67.75c0-4.12-3.09-7.04-7.21-7.04-.34,0-.77,0-1.2.09Z",
    fill: "url(#radial-gradient-9)",
    image: {
      href: ASSETS.storyBasedSurveys,
      width: 666,
      height: 348,
      transform: "translate(345.27 790.29) scale(.28)",
    },
    textTransform: "translate(365.49 833.24)",
    fontSize: 26.42,
    multiline: true,
    line2Dx: 25.4,
  },
};

function renderButtonLabel(
  label: string,
  multiline: boolean,
  line2Dx = 0,
): React.ReactNode {
  const lines = label.split("\n");
  if (!multiline || lines.length < 2) {
    return <tspan x={0} y={0}>{label.replace(/\n/g, " ")}</tspan>;
  }
  return (
    <>
      <tspan x={0} y={0}>
        {lines[0]}
      </tspan>
      <tspan x={line2Dx} y={31.71}>
        {lines.slice(1).join(" ")}
      </tspan>
    </>
  );
}

export default function DashboardAnimation({
  title = TITLE,
  buttons: buttonOverrides,
  className,
  ...props
}: DashboardAnimationProps) {
  const resolvedButtons = BUTTONS.map((btn) => {
    const override = buttonOverrides?.[btn.id];
    return {
      ...btn,
      label: override?.label ?? btn.label,
      href: override?.href ?? btn.href,
    };
  });

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
        <radialGradient
          id="radial-gradient"
          cx="-521.12"
          cy="1095.51"
          fx="-521.12"
          fy="1095.51"
          r=".94"
          gradientTransform="translate(52227.64 110032.86) scale(99.89 -99.89)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#e5a46f" />
          <stop offset="1" stopColor="#6f451f" />
        </radialGradient>
        <radialGradient
          id="radial-gradient-2"
          cx="-521.12"
          cy="1095.54"
          fx="-521.12"
          fy="1095.54"
          r=".94"
          gradientTransform="translate(52227.68 110126.08) scale(99.89 -99.89)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#b7ab60" />
          <stop offset="1" stopColor="#60883b" />
        </radialGradient>
        <radialGradient
          id="radial-gradient-3"
          cx="-521.08"
          cy="1095.56"
          fx="-521.08"
          fy="1095.56"
          r=".94"
          gradientTransform="translate(52227.59 110219) scale(99.89 -99.89)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#d5b19c" />
          <stop offset="1" stopColor="#9e8278" />
        </radialGradient>
        <radialGradient
          id="radial-gradient-4"
          cx="-521.24"
          cy="1095.49"
          fx="-521.24"
          fy="1095.49"
          r=".94"
          gradientTransform="translate(52840.85 110181.07) scale(100.03 -100.03)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#e0a08f" />
          <stop offset="1" stopColor="#a14343" />
        </radialGradient>
        <radialGradient
          id="radial-gradient-5"
          cx="-521.24"
          cy="1095.51"
          fx="-521.24"
          fy="1095.51"
          r=".94"
          gradientTransform="translate(52841.01 110274.52) scale(100.03 -100.03)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#b08aa5" />
          <stop offset=".03" stopColor="#b08aa5" />
          <stop offset="1" stopColor="#634669" />
        </radialGradient>
        <radialGradient
          id="radial-gradient-6"
          cx="-521.24"
          cy="1095.52"
          fx="-521.24"
          fy="1095.52"
          r=".94"
          gradientTransform="translate(52840.9 110367.41) scale(100.03 -100.03)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#08b37c" />
          <stop offset="1" stopColor="#0b7f40" />
        </radialGradient>
        <radialGradient
          id="radial-gradient-7"
          cx="-521.17"
          cy="1095.59"
          fx="-521.17"
          fy="1095.59"
          r=".94"
          gradientTransform="translate(47858.1 100332.58) scale(90.99 -90.99)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#bcb3b3" />
          <stop offset="1" stopColor="#356e94" />
        </radialGradient>
        <radialGradient
          id="radial-gradient-8"
          cx="-521.17"
          cy="1095.58"
          fx="-521.17"
          fy="1095.58"
          r=".94"
          gradientTransform="translate(47858.12 100425.76) scale(90.99 -90.99)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#edb2b0" />
          <stop offset="1" stopColor="#d07f84" />
        </radialGradient>
        <radialGradient
          id="radial-gradient-9"
          cx="-521.18"
          cy="1095.57"
          fx="-521.18"
          fy="1095.57"
          r=".94"
          gradientTransform="translate(47858.11 100518.84) scale(90.99 -90.99)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#fab58b" />
          <stop offset="1" stopColor="#f36c31" />
        </radialGradient>
        <style>{`
          .dashboard-btn { cursor: pointer; }
          .dashboard-btn:hover { opacity: 0.92; }
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
        {title
          .slice(0, TITLE_TRANSFORMS.length)
          .split("")
          .map((char, i) => (
            <text
              key={`${i}-${char}`}
              transform={TITLE_TRANSFORMS[i]}
              fill="#fff"
              fontFamily="Roboto, sans-serif"
              fontSize={35}
              fontWeight={700}
            >
              <tspan x={0} y={0}>
                {char}
              </tspan>
            </text>
          ))}
      </g>

      {resolvedButtons.map((btn) => {
        const meta = BUTTON_META[btn.id];
        return (
          <a
            key={btn.id}
            href={btn.href}
            target="_blank"
            rel="noopener noreferrer"
            className="dashboard-btn"
            aria-label={btn.label.replace(/\n/g, " ")}
          >
            <g id={meta.svgId}>
              <path d={meta.d} fill={meta.fill} strokeWidth={0} />
              <image
                width={meta.image.width}
                height={meta.image.height}
                transform={meta.image.transform}
                href={meta.image.href}
                style={{ isolation: "isolate" }}
              />
              <text
                transform={meta.textTransform}
                fill="#fff"
                fontFamily="Roboto, sans-serif"
                fontSize={meta.fontSize}
                fontWeight={500}
              >
                {renderButtonLabel(btn.label, meta.multiline, meta.line2Dx)}
              </text>
            </g>
          </a>
        );
      })}
    </svg>
  );
}
