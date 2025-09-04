import React from "react";
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProgressStep = {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'loading' | 'completed' | 'error';
  estimatedTime?: number; // بالثواني
  startTime?: number; // timestamp
};

export type AdvancedProgressProps = {
  steps: ProgressStep[];
  currentStepId?: string;
  className?: string;
  showTimeEstimate?: boolean;
  onStepClick?: (stepId: string) => void;
};

export function AdvancedProgressIndicator({ 
  steps, 
  currentStepId, 
  className,
  showTimeEstimate = true,
  onStepClick 
}: AdvancedProgressProps) {
  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'loading':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepColor = (step: ProgressStep) => {
    switch (step.status) {
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'loading':
        return 'border-blue-200 bg-blue-50 shadow-md';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'pending':
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getElapsedTime = (step: ProgressStep) => {
    if (step.startTime && step.status === 'loading') {
      const elapsed = Math.floor((Date.now() - step.startTime) / 1000);
      return elapsed;
    }
    return 0;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}ث`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}د ${remainingSeconds}ث` : `${minutes}د`;
  };

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* شريط التقدم الإجمالي */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold text-gray-800">تقدم إنشاء التقرير</h3>
          <span className="text-sm font-medium text-gray-600">
            {completedSteps} من {totalSteps} ({Math.round(progressPercentage)}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-teal-500 to-teal-600 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* خطوات التقدم التفصيلية */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = step.id === currentStepId;
          const elapsedTime = getElapsedTime(step);
          
          return (
            <div
              key={step.id}
              className={cn(
                "flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-300",
                getStepColor(step),
                isActive && "ring-2 ring-teal-400 ring-opacity-50",
                onStepClick && step.status === 'completed' && "cursor-pointer hover:shadow-md",
                "relative overflow-hidden"
              )}
              onClick={() => onStepClick && step.status === 'completed' && onStepClick(step.id)}
            >
              {/* مؤشر الترقيم */}
              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-current">
                <span className="text-sm font-bold text-gray-600">{index + 1}</span>
              </div>

              {/* أيقونة الحالة */}
              <div className="flex-shrink-0 mt-0.5">
                {getStepIcon(step)}
              </div>

              {/* محتوى الخطوة */}
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-semibold text-gray-800 mb-1">
                  {step.title}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {step.description}
                </p>
                
                {/* معلومات الوقت */}
                {showTimeEstimate && (
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    {step.estimatedTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        التقدير: {formatTime(step.estimatedTime)}
                      </span>
                    )}
                    {step.status === 'loading' && elapsedTime > 0 && (
                      <span className="flex items-center gap-1 text-blue-600 font-medium">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        المدة المنقضية: {formatTime(elapsedTime)}
                      </span>
                    )}
                    {step.status === 'completed' && (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <CheckCircle2 className="h-3 w-3" />
                        مكتمل
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* شريط التحميل للخطوة النشطة */}
              {step.status === 'loading' && step.estimatedTime && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-60">
                  <div className="h-full bg-blue-500 animate-pulse" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* معلومات إضافية */}
      <div className="mt-4 p-3 bg-teal-50 rounded-lg border border-teal-200">
        <p className="text-sm text-teal-700 text-center">
          💡 <strong>نصيحة:</strong> يمكنك متابعة العمل في علامة تبويب أخرى أثناء إنشاء التقرير
        </p>
      </div>
    </div>
  );
}

// Hook لإدارة حالة التقدم
export function useProgressSteps(initialSteps: ProgressStep[]) {
  const [steps, setSteps] = React.useState<ProgressStep[]>(initialSteps);
  const [currentStepId, setCurrentStepId] = React.useState<string | undefined>();

  const updateStep = (stepId: string, updates: Partial<ProgressStep>) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, ...updates } : step
    ));
  };

  const startStep = (stepId: string) => {
    setCurrentStepId(stepId);
    updateStep(stepId, { 
      status: 'loading', 
      startTime: Date.now() 
    });
  };

  const completeStep = (stepId: string) => {
    updateStep(stepId, { status: 'completed' });
  };

  const errorStep = (stepId: string) => {
    updateStep(stepId, { status: 'error' });
  };

  const resetSteps = () => {
    setSteps(initialSteps);
    setCurrentStepId(undefined);
  };

  return {
    steps,
    currentStepId,
    updateStep,
    startStep,
    completeStep,
    errorStep,
    resetSteps,
    setCurrentStepId
  };
}