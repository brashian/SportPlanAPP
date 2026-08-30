import React from 'react';

interface Props {
  className?: string;
}

export default function BrandLogo({ className = "w-full h-full" }: Props) {
  return (
    <img 
      src="/logo.svg" 
      alt="SportPlan Logo" 
      className={`object-contain ${className}`} 
    />
  );
}