import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'px-6 py-3 rounded-pill font-body text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variantStyles = variant === 'primary'
    ? 'bg-black text-white hover:bg-black/90'
    : 'bg-light-gray text-near-black hover:bg-light-gray/80';

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${className}`}
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
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-silver">
          {icon}
        </div>
      )}
      <input
        className={`w-full ${icon ? 'pl-10' : 'px-4'} py-3 bg-snow border border-light-gray rounded-pill 
                   text-near-black placeholder:text-silver font-body text-sm
                   focus:outline-none focus:ring-2 focus:ring-[rgba(59,130,246,0.5)] ${className}`}
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
    <div className={`bg-white border border-light-gray rounded-container ${className}`}>
      {children}
    </div>
  );
};

export const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <span className={`inline-flex items-center px-3 py-1 bg-light-gray text-near-black rounded-pill text-xs font-medium ${className}`}>
      {children}
    </span>
  );
};
