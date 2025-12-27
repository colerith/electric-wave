import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  icon,
  ...props 
}) => {
  // Minimalist, editorial styles
  const baseStyles = "inline-flex items-center justify-center gap-2 px-6 py-2.5 font-sans text-sm font-medium tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    // Solid Blue
    primary: "bg-zine-blue text-white hover:bg-zine-blue-light hover:shadow-soft active:scale-95",
    // Outline / Soft
    secondary: "bg-white border border-zine-gray text-zine-blue hover:border-zine-blue hover:bg-zine-blue hover:text-white",
    // Text only
    ghost: "bg-transparent text-zine-blue/60 hover:text-zine-blue hover:bg-zine-blue/5",
    // Danger
    danger: "bg-red-50 text-red-600 hover:bg-red-600 hover:text-white"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`} 
      {...props}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
    </button>
  );
};