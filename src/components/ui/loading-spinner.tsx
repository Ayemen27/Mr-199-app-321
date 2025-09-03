import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  variant?: "default" | "professional" | "minimal";
}

export function LoadingSpinner({ 
  size = "md", 
  className = "", 
  variant = "default" 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  if (variant === "professional") {
    return (
      <motion.div 
        className={`relative ${sizeClasses[size]} ${className}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute inset-0 rounded-full border-2 border-primary/30"></div>
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent"></div>
        <motion.div 
          className="absolute inset-1 rounded-full bg-gradient-to-br from-primary to-secondary opacity-20"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    );
  }

  if (variant === "minimal") {
    return (
      <motion.div
        className={`${sizeClasses[size]} border-2 border-muted border-t-primary rounded-full ${className}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
      />
    );
  }

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary ${sizeClasses[size]} ${className}`} />
  );
}

export function LoadingCard() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center space-y-3">
        <LoadingSpinner size="lg" />
        <p className="text-muted-foreground text-sm">جاري التحميل...</p>
      </div>
    </div>
  );
}