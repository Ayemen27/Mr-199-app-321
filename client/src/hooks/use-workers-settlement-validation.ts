import { useState, useCallback } from "react";
import { z } from "zod";

// تعريف أنواع البيانات
export interface WorkerSettlementData {
  workerId: string;
  workerName?: string;
  projectId: string;
  amount: number;
  settlementType: "full" | "partial" | "advance";
  paymentMethod: "cash" | "transfer" | "check";
  notes?: string;
  settlementDate: string;
}

type ValidationErrors = Record<string, string>;

// schema للتحقق من صحة البيانات
const workerSettlementSchema = z.object({
  workerId: z.string().min(1, "معرّف العامل مطلوب"),
  projectId: z.string().min(1, "معرّف المشروع مطلوب"),
  amount: z.number().positive("المبلغ يجب أن يكون أكبر من صفر"),
  settlementType: z.enum(["full", "partial", "advance"], {
    errorMap: () => ({ message: "نوع التسوية غير صحيح" })
  }),
  paymentMethod: z.enum(["cash", "transfer", "check"], {
    errorMap: () => ({ message: "طريقة الدفع غير صحيحة" })
  }),
  settlementDate: z.string().min(1, "تاريخ التسوية مطلوب"),
  notes: z.string().optional(),
  workerName: z.string().optional()
});

export function useWorkersSettlementValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isValidating, setIsValidating] = useState(false);

  // دالة التحقق من صحة البيانات
  const validate = useCallback((data: Partial<WorkerSettlementData>): boolean => {
    setIsValidating(true);
    const newErrors: ValidationErrors = {};

    try {
      // التحقق باستخدام Zod schema
      workerSettlementSchema.parse(data);
      
      // فحوصات إضافية مخصصة
      if (data.amount && data.amount > 50000) {
        newErrors.amount = "المبلغ كبير جداً - يرجى التأكد من الصحة";
      }

      if (data.settlementDate) {
        const settlementDate = new Date(data.settlementDate);
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 30);

        if (settlementDate > futureDate) {
          newErrors.settlementDate = "تاريخ التسوية بعيد جداً في المستقبل";
        }
      }

      setErrors(newErrors);
      setIsValidating(false);
      return Object.keys(newErrors).length === 0;

    } catch (error) {
      if (error instanceof z.ZodError) {
        // تحويل أخطاء Zod إلى كائن errors
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
      }

      setErrors(newErrors);
      setIsValidating(false);
      return false;
    }
  }, []);

  // دالة التحقق من الحد الأدنى للبيانات
  const validateMinimum = useCallback((data: Partial<WorkerSettlementData>): boolean => {
    const minErrors: ValidationErrors = {};

    if (!data.workerId) {
      minErrors.workerId = "معرّف العامل مطلوب";
    }

    if (!data.projectId) {
      minErrors.projectId = "معرّف المشروع مطلوب";
    }

    if (!data.amount || data.amount <= 0) {
      minErrors.amount = "المبلغ مطلوب ويجب أن يكون أكبر من صفر";
    }

    setErrors(minErrors);
    return Object.keys(minErrors).length === 0;
  }, []);

  // دالة مسح الأخطاء
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // دالة مسح خطأ حقل معين
  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // دالة التحقق من وجود أخطاء
  const hasErrors = Object.keys(errors).length > 0;

  // دالة الحصول على خطأ حقل معين
  const getFieldError = useCallback((fieldName: string): string | undefined => {
    return errors[fieldName];
  }, [errors]);

  // دالة التحقق السريع من حقل واحد
  const validateField = useCallback((fieldName: keyof WorkerSettlementData, value: any): boolean => {
    const fieldErrors: ValidationErrors = {};

    switch (fieldName) {
      case 'workerId':
        if (!value || value.trim() === '') {
          fieldErrors.workerId = "معرّف العامل مطلوب";
        }
        break;

      case 'projectId':
        if (!value || value.trim() === '') {
          fieldErrors.projectId = "معرّف المشروع مطلوب";
        }
        break;

      case 'amount':
        if (!value || isNaN(value) || value <= 0) {
          fieldErrors.amount = "المبلغ يجب أن يكون رقماً صحيحاً أكبر من صفر";
        } else if (value > 50000) {
          fieldErrors.amount = "المبلغ كبير جداً - يرجى التأكد";
        }
        break;

      case 'settlementType':
        if (!value || !['full', 'partial', 'advance'].includes(value)) {
          fieldErrors.settlementType = "نوع التسوية مطلوب";
        }
        break;

      case 'paymentMethod':
        if (!value || !['cash', 'transfer', 'check'].includes(value)) {
          fieldErrors.paymentMethod = "طريقة الدفع مطلوبة";
        }
        break;

      case 'settlementDate':
        if (!value) {
          fieldErrors.settlementDate = "تاريخ التسوية مطلوب";
        }
        break;
    }

    // دمج الأخطاء الجديدة مع الموجودة
    setErrors(prev => ({
      ...prev,
      ...fieldErrors
    }));

    return Object.keys(fieldErrors).length === 0;
  }, []);

  return {
    errors,
    hasErrors,
    isValidating,
    validate,
    validateMinimum,
    validateField,
    clearErrors,
    clearFieldError,
    getFieldError
  };
}