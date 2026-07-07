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
    primary: 'bg-[#FF5FAE] hover:bg-[#FF2F93] text-white',
    secondary: 'bg-[#F3EEFF] hover:bg-[#E4DBFF] text-[#151427]',
    accent: 'bg-[#FFD166] hover:bg-[#FFC247] text-[#151427]',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-[9px] min-h-[44px]',
    md: 'px-5 py-3 text-[10px] min-h-[48px]',
    lg: 'px-6 py-4 text-xs min-h-[52px]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative inline-flex items-center justify-center gap-2 rounded-[8px] font-["Press_Start_2P"] leading-none',
        'border-4 border-[#05050A]',
        'transition-all duration-100 ease-out',
        'active:translate-x-1 active:translate-y-1',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#FFD166]',
        'shadow-[4px_4px_0_#05050A]',
        'hover:shadow-[6px_6px_0_#05050A]',
        'hover:-translate-x-0.5 hover:-translate-y-0.5',
        'active:shadow-[2px_2px_0_#05050A]',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      style={{
        boxShadow: '4px 4px 0 #05050A, inset -4px -4px 0 rgba(0,0,0,0.2), inset 4px 4px 0 rgba(255,255,255,0.18)',
      }}
    >
      {children}
    </button>
  );
};
