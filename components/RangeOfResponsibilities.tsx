import React from 'react';
import styles from './RangeOfResponsibilities.module.css';

export interface ButtonProp {
  id: string;
  label: string;
  url: string;
  color?: string;
  textColor?: string;
}

export interface RangeOfResponsibilitiesProps {
  heading?: string;
  buttons?: ButtonProp[];
  className?: string;
}

const defaultButtons: ButtonProp[] = [
  { id: 'define-it', label: 'Define It', url: 'https://www.buyfacts.com/', color: 'linear-gradient(135deg, #3b82f6, #60a5fa)' },
  { id: 'host', label: 'Host', url: 'https://www.buyfacts.com/', color: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' },
  { id: 'bot', label: 'Bot', url: 'https://www.buyfacts.com/', color: 'linear-gradient(135deg, #ec4899, #f472b6)' },
  { id: 'refine-it', label: 'Refine It', url: 'https://www.buyfacts.com/', color: 'linear-gradient(135deg, #f43f5e, #fb7185)' },
  { id: 'analyze-it', label: 'Analyze It', url: 'https://www.buyfacts.com/', color: 'linear-gradient(135deg, #f97316, #fb923c)' },
  { id: 'story-based', label: 'Story Based', url: 'https://www.buyfacts.com/', color: 'linear-gradient(135deg, #eab308, #facc15)' },
  { id: 'build-it', label: 'Build It', url: 'https://www.buyfacts.com/', color: 'linear-gradient(135deg, #22c55e, #4ade80)' },
  { id: 'leverage', label: 'Leverage', url: 'https://www.buyfacts.com/', color: 'linear-gradient(135deg, #14b8a6, #2dd4bf)' },
  { id: 'affinity', label: 'Affinity', url: 'https://www.buyfacts.com/', color: 'linear-gradient(135deg, #06b6d4, #22d3ee)' },
];

export default function RangeOfResponsibilities({
  heading = 'Range of Responsibilities',
  buttons = defaultButtons,
  className = '',
}: RangeOfResponsibilitiesProps) {
  return (
    <div className={`${styles.container} ${className}`}>
      {heading && <h2 className={styles.heading}>{heading}</h2>}
      
      <div className={styles.grid}>
        {buttons.map((button) => {
          const styleProps = {
            ...(button.color ? { '--btn-color': button.color } : {}),
            ...(button.textColor ? { '--btn-text-color': button.textColor } : {}),
          } as React.CSSProperties;

          return (
            <a
              key={button.id}
              href={button.url}
              className={styles.button}
              style={styleProps}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{button.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
