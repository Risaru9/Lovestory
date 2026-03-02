import React from 'react';

interface ScanlinesProps {
  enabled?: boolean;
  opacity?: number;
}

export const Scanlines: React.FC<ScanlinesProps> = ({ 
  enabled = true, 
  opacity = 1 
}) => {
  if (!enabled) return null;

  return (
    <div 
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{ opacity }}
    >
      <div 
        className="absolute inset-0"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.08),
            rgba(0, 0, 0, 0.08) 1px,
            transparent 1px,
            transparent 2px
          )`,
        }}
      />
      <div 
        className="absolute inset-0 animate-pulse"
        style={{
          background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)`,
        }}
      />
    </div>
  );
};
