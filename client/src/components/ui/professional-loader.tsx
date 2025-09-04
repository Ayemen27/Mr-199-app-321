import React from 'react';
import { motion } from 'framer-motion';

interface ProfessionalLoaderProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
}

export function ProfessionalLoader({ 
  message = "جاري تحميل التطبيق...", 
  showProgress = false,
  progress = 0 
}: ProfessionalLoaderProps) {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center z-50">
      {/* خلفية متحركة */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 rounded-full blur-xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-60 h-60 bg-accent/20 rounded-full blur-xl animate-pulse delay-500"></div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="relative text-center p-8">
        {/* شعار متحرك */}
        <motion.div 
          className="mb-8"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="relative w-24 h-24 mx-auto">
            {/* الدائرة الخارجية */}
            <motion.div
              className="absolute inset-0 border-4 border-primary/30 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            
            {/* الدائرة الوسطى */}
            <motion.div
              className="absolute inset-2 border-4 border-secondary/50 rounded-full"
              animate={{ rotate: -360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            
            {/* الدائرة الداخلية */}
            <motion.div
              className="absolute inset-4 bg-gradient-to-br from-primary to-secondary rounded-full shadow-lg"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-white/20 to-transparent"></div>
            </motion.div>
            
            {/* أيقونة البناء */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center text-white text-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              🏗️
            </motion.div>
          </div>
        </motion.div>

        {/* النص الرئيسي */}
        <motion.h1 
          className="text-2xl font-bold text-foreground mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
        >
          نظام إدارة المشاريع الإنشائية
        </motion.h1>

        {/* الرسالة */}
        <motion.p 
          className="text-muted-foreground mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          {message}
        </motion.p>

        {/* نقاط التحميل المتحركة */}
        <motion.div 
          className="flex justify-center space-x-2 mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-3 h-3 bg-primary rounded-full"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: index * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>

        {/* شريط التقدم */}
        {showProgress && (
          <motion.div 
            className="w-64 mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
          >
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>جاري التحميل</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                style={{ width: `${progress}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        )}

        {/* رسالة إضافية */}
        <motion.p 
          className="text-xs text-muted-foreground mt-4 max-w-xs mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.6 }}
        >
          نحن نحضر لك أفضل تجربة لإدارة مشاريعك الإنشائية
        </motion.p>

        {/* نصيحة تخطي التحميل (مخفية للمطورين) */}
        <motion.div 
          className="text-xs text-muted-foreground/50 mt-2 text-center space-y-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.3 }}
          transition={{ delay: 2, duration: 0.6 }}
        >
          <p className="opacity-0 hover:opacity-100 transition-opacity duration-300">
            Esc: تخطي الآن | Ctrl+S: تخطي دائماً
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// مكون تحميل مبسط للاستخدام داخل الصفحات
export function SimpleLoader({ size = "md", text = "جاري التحميل..." }: { 
  size?: "sm" | "md" | "lg", 
  text?: string 
}) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-8 h-8", 
    lg: "w-12 h-12"
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <motion.div
        className={`${sizeClasses[size]} border-2 border-primary/30 border-t-primary rounded-full`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <motion.p 
        className="text-muted-foreground text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {text}
      </motion.p>
    </div>
  );
}

// مكون تحميل للبطاقات
export function CardLoader() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((item) => (
        <motion.div
          key={item}
          className="bg-card border rounded-lg p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: item * 0.1 }}
        >
          <div className="animate-pulse">
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="w-12 h-12 bg-muted rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 bg-muted rounded w-full"></div>
              <div className="h-3 bg-muted rounded w-5/6"></div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}