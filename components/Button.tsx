import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'font-medium text-sm uppercase tracking-wider transition-all duration-300 rounded-lg px-6 py-3 flex items-center justify-center gap-2';
  
  const variants = {
    primary: 'bg-red-700 hover:bg-red-600 text-white border border-red-500/50 shadow-[0_0_15px_rgba(217,29,29,0.3)] hover:shadow-[0_0_25px_rgba(217,29,29,0.5)]',
    outline: 'bg-transparent border border-zinc-700 text-zinc-300 hover:border-red-500/50 hover:text-red-400',
    ghost: 'bg-transparent text-zinc-400 hover:text-red-500 hover:bg-red-500/5',
    danger: 'bg-red-900/40 border border-red-500/50 text-red-200 hover:bg-red-900/60 hover:text-white'
  };
  
  const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';
  const widthStyles = fullWidth ? 'w-full' : '';
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${disabledStyles} ${widthStyles} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
