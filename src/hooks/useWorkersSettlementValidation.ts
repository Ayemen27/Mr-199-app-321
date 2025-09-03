// client/src/hooks/useWorkersSettlementValidation.ts
import { useState, useCallback } from "react";

export type ValidationError = {
  field: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  suggestion?: string;
};

type Errors = Record<string, string>;

type SettlementData = {
  workerId?: string;
  amount?: number;
  projectId?: string;
  settlementType?: string;
  paymentMethod?: string;
  settlementDate?: string;
  notes?: string;
  [k: string]: any;
};

export default function useWorkersSettlementValidation() {
  const [errors, setErrors] = useState<Errors>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const validate = useCallback((data: SettlementData) => {
    const e: Errors = {};
    const vErrors: ValidationError[] = [];
    
    if (!data.workerId || typeof data.workerId !== "string") {
      e.workerId = "معرّف العامل مطلوب";
      vErrors.push({
        field: 'workerId',
        message: 'معرّف العامل مطلوب',
        type: 'error'
      });
    }
    
    if (data.amount == null || Number.isNaN(Number(data.amount)) || Number(data.amount) <= 0) {
      e.amount = "المبلغ غير صالح";
      vErrors.push({
        field: 'amount',
        message: 'المبلغ غير صالح',
        type: 'error',
        suggestion: 'أدخل مبلغاً صحيحاً أكبر من الصفر'
      });
    }
    
    if (!data.projectId) {
      e.projectId = "معرّف المشروع مطلوب";
      vErrors.push({
        field: 'projectId',
        message: 'معرّف المشروع مطلوب',
        type: 'error'
      });
    }
    
    setErrors(e);
    setValidationErrors(vErrors);
    return Object.keys(e).length === 0;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setValidationErrors([]);
  }, []);

  return { 
    errors, 
    validationErrors,
    validate, 
    clear: clearErrors,
    hasErrors: Object.keys(errors).length > 0
  };
}

export { useWorkersSettlementValidation };