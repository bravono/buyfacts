import * as React from "react";
const SvgBeamBlasts = (props) => (
  <g xmlns="http://www.w3.org/2000/svg" {...props}>
    <g id="beam-blasts" opacity={0}>
      <g id="right-blast">
        <circle cx={584.3158} cy={517.203} r={2} fill="#ffffff" opacity={0.8} />
        <circle cx={584.3158} cy={517.203} r={4} fill="#ffffff" opacity={0.5} />
        <circle
          cx={584.3158}
          cy={517.203}
          r={12}
          fill="#ffffff"
          opacity={0.2}
        />
      </g>
      <g id="middle-blast">
        <circle cx={342.1452} cy={659.203} r={2} fill="#ffffff" opacity={0.8} />
        <circle cx={342.1452} cy={659.203} r={4} fill="#ffffff" opacity={0.5} />
        <circle
          cx={342.1452}
          cy={659.203}
          r={12}
          fill="#ffffff"
          opacity={0.2}
        />
      </g>
      <g id="left-blast">
        <circle
          cx={124.6047}
          cy={571.3693}
          r={2}
          fill="#ffffff"
          opacity={0.8}
        />
        <circle
          cx={124.6047}
          cy={571.3693}
          r={4}
          fill="#ffffff"
          opacity={0.5}
        />
        <circle
          cx={124.6047}
          cy={571.3693}
          r={12}
          fill="#ffffff"
          opacity={0.2}
        />
      </g>
    </g>
  </g>
);
export default SvgBeamBlasts;
