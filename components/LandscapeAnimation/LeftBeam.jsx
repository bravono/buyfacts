import * as React from "react";
const SvgLeftBeam = (props) => (
  <g xmlns="http://www.w3.org/2000/svg" {...props}>
    <g id="left-beam" opacity={0}>
      <polyline
        id="left-beam-path"
        points="71.017 405.1111 71.4749 522.0143 109.6253 569.5143 109.6257 633.9034"
        filter="url(#outer-glow-1)"
        fill="none"
        stroke="url(#linear-gradient-202)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={5}
      />
    </g>
  </g>
);
export default SvgLeftBeam;
