import * as React from "react";
const SvgRightBeam = (props) => (
  <g xmlns="http://www.w3.org/2000/svg" {...props}>
    <g id="right-beam" opacity={0}>
      <polyline
        id="right-beam-path"
        points="656.6889 388.6749 621.7058 429.0933 621.5902 461.6168 599.7556 482.1108 599.7556 497.5394"
        filter="url(#outer-glow-1)"
        fill="none"
        stroke="url(#linear-gradient-204)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={5}
      />
    </g>
  </g>
);
export default SvgRightBeam;
