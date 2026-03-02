import React from 'react';
import { cn } from '@/lib/utils';

interface PixelButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
}) => {
  const variantStyles = {
    primary: 'bg-[#FF69B4] hover:bg-[#FF1493]',
    secondary: 'bg-[#E6E6FA] hover:bg-[#D8D8F0] text-[#1A1A2E]',
    accent: 'bg-[#FFD700] hover:bg-[#FFC700] text-[#1A1A2E]',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-[10px]',
    md: 'px-6 py-3 text-xs',
    lg: 'px-8 py-4 text-sm',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative font-["Press_Start_2P"]',
        'border-4 border-[#1A1A2E]',
        'text-white',
        'transition-all duration-100',
        'active:translate-x-1 active:translate-y-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'shadow-[4px_4px_0_#1A1A2E]',
        'hover:shadow-[6px_6px_0_#1A1A2E]',
        'hover:-translate-x-0.5 hover:-translate-y-0.5',
        'active:shadow-[2px_2px_0_#1A1A2E]',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      style={{
        boxShadow: '4px 4px 0 #1A1A2E, inset -4px -4px 0 rgba(0,0,0,0.2), inset 4px 4px 0 rgba(255,255,255,0.2)',
      }}
    >
      {children}
    </button>
  );
};
