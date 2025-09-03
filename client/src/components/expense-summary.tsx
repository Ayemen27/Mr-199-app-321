/**
 * الوصف: مكون ملخص المصاريف اليومية
 * المدخلات: الدخل والمنصرفات والرصيد
 * المخرجات: عرض ملخص مالي مصمم
 * المالك: عمار
 * آخر تعديل: 2025-08-20
 * الحالة: نشط - مكون أساسي للتقارير المالية
 */

import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface ExpenseSummaryProps {
  totalIncome?: number | string;
  totalExpenses?: number | string;
  remainingBalance?: number | string;
}

export default function ExpenseSummary({ totalIncome, totalExpenses, remainingBalance }: ExpenseSummaryProps) {
  // معالجة آمنة للقيم - تحويل إلى أرقام والتعامل مع القيم المفقودة
  const safeIncome = typeof totalIncome === 'number' ? totalIncome : parseFloat(String(totalIncome || '0')) || 0;
  const safeExpenses = typeof totalExpenses === 'number' ? totalExpenses : parseFloat(String(totalExpenses || '0')) || 0;
  const safeBalance = typeof remainingBalance === 'number' ? remainingBalance : parseFloat(String(remainingBalance || '0')) || 0;

  return (
    <div className="mt-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl p-4">
      <h4 className="font-bold text-lg mb-3">ملخص اليوم</h4>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="opacity-90">إجمالي الدخل:</div>
          <div className="text-lg font-bold arabic-numbers">{formatCurrency(safeIncome)}</div>
        </div>
        <div>
          <div className="opacity-90">إجمالي المنصرف:</div>
          <div className="text-lg font-bold arabic-numbers">{formatCurrency(safeExpenses)}</div>
        </div>
      </div>
      <div className="text-center mt-3 pt-3 border-t border-primary-foreground/20">
        <div className="text-sm opacity-90">المبلغ المتبقي</div>
        <div className="text-2xl font-bold arabic-numbers">{formatCurrency(safeBalance)}</div>
      </div>
    </div>
  );
}
