import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'px-6 py-2 transition-all duration-200 font-body text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2';
  
  const variantStyles = {
    // Primary Pill (Dark): #0f0f0f bg, #fafafa text, 9999px radius, 1px solid #fafafa border
    primary: 'bg-near-black text-off-white border border-off-white rounded-pill hover:bg-near-black/80',
    // Secondary Pill (Dark, Muted): #0f0f0f bg, #fafafa text, 9999px radius, 1px solid #2e2e2e border
    secondary: 'bg-near-black text-off-white border border-border-dark rounded-pill hover:opacity-80',
    // Ghost Button: transparent bg, #fafafa text, 6px radius
    ghost: 'bg-transparent text-off-white border border-transparent rounded-6 hover:bg-near-black',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  icon,
  className = '',
  ...props
}) => {
  return (
    <div className="relative w-full">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-mid-gray">
          {icon}
        </div>
      )}
      <input
        className={`w-full ${icon ? 'pl-10' : 'px-4'} py-2.5 bg-dark border border-mid-border rounded-pill 
                   text-off-white placeholder:text-mid-gray font-body text-sm
                   focus:outline-none focus:ring-1 focus:ring-supabase-green 
                   transition-all duration-200 ${className}`}
        {...props}
      />
    </div>
  );
};

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-dark border border-border-dark rounded-8 overflow-hidden ${className}`}>
      {children}
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 bg-near-black text-off-white border border-border-dark rounded-pill text-xs font-medium ${className}`}>
      {children}
    </span>
  );
};
