/**
 * تقرير المصروفات اليومية الاحترافي
 * تصميم احترافي يطابق المتطلبات العملية
 * المالك: عمار
 * التاريخ: 2025-08-17
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from '@/lib/utils';

interface DailyExpenseData {
  date: string;
  projectName: string;
  projectId: string;
  totalIncome: number;
  totalExpenses: number;
  remainingBalance: number;
  carriedForward: number;
  fundTransfers: any[];
  workerAttendance: any[];
  materialPurchases: any[];
  transportationExpenses: any[];
  workerTransfers: any[];
  miscExpenses: any[];
  supplierPayments?: any[];
  incomingProjectTransfers?: any[];
  outgoingProjectTransfers?: any[];
}

interface ProfessionalDailyExpenseReportProps {
  data: DailyExpenseData;
}

export default function ProfessionalDailyExpenseReport({ data }: ProfessionalDailyExpenseReportProps) {
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', { useGrouping: true });
  };

  const formatCurrencySimple = (amount: number) => {
    return formatNumber(amount);
  };

  // حساب إجمالي كل فئة
  const calculateCategoryTotal = (items: any[], amountField = 'amount') => {
    return items?.reduce((sum, item) => sum + (Number(item[amountField]) || 0), 0) || 0;
  };

  const workerWagesTotal = calculateCategoryTotal(data.workerAttendance, 'paidAmount');
  const materialPurchasesTotal = calculateCategoryTotal(data.materialPurchases, 'totalAmount');
  const transportationTotal = calculateCategoryTotal(data.transportationExpenses);
  const workerTransfersTotal = calculateCategoryTotal(data.workerTransfers);
  const miscExpensesTotal = calculateCategoryTotal(data.miscExpenses);
  const fundTransfersTotal = calculateCategoryTotal(data.fundTransfers);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white print:p-0 print:max-w-none" dir="rtl">
      {/* رأس التقرير */}
      <div className="mb-8 text-center">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-blue-800 mb-2">
            شركة الفني للمقاولات والاستشارات الهندسية
          </h1>
          <div className="w-full h-1 bg-blue-600 mb-4"></div>
        </div>
        
        <div className="bg-blue-700 text-white py-3 px-4 rounded-lg mb-6">
          <h2 className="text-xl font-bold">كشف المصروفات اليومية</h2>
        </div>

        <div className="text-right mb-6">
          <p className="text-lg font-semibold">التاريخ: {formatDate(data.date)}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-bold text-center text-blue-800 mb-4">
            المشروع المحدد
          </h3>
          <div className="text-center">
            <p className="text-xl font-bold text-gray-800">{data.projectName}</p>
            <div className="flex justify-center items-center mt-2">
              <div className="w-3 h-3 bg-green-500 rounded-full ml-2"></div>
              <span className="text-sm text-gray-600">نشط</span>
            </div>
          </div>
        </div>
      </div>

      {/* جدول المصروفات الرئيسي */}
      <div className="mb-8">
        <table className="w-full border-collapse border border-gray-400" dir="rtl">
          <thead>
            <tr className="bg-blue-100">
              <th className="border border-gray-400 p-3 text-right font-bold">م</th>
              <th className="border border-gray-400 p-3 text-right font-bold">التاريخ</th>
              <th className="border border-gray-400 p-3 text-right font-bold">البيان</th>
              <th className="border border-gray-400 p-3 text-right font-bold">المبلغ</th>
            </tr>
          </thead>
          <tbody>
            {/* تحويلات الأموال */}
            {data.fundTransfers?.map((transfer, index) => (
              <tr key={`fund-${index}`} className="bg-green-50">
                <td className="border border-gray-400 p-2 text-center">{index + 1}</td>
                <td className="border border-gray-400 p-2">{formatDate(transfer.date)}</td>
                <td className="border border-gray-400 p-2">تحويل عهدة - {transfer.description || 'تحويل مالي'}</td>
                <td className="border border-gray-400 p-2 text-center font-semibold text-green-700">
                  {formatCurrencySimple(transfer.amount)}
                </td>
              </tr>
            ))}

            {/* أجور العمال */}
            {data.workerAttendance?.map((attendance, index) => (
              <tr key={`worker-${index}`}>
                <td className="border border-gray-400 p-2 text-center">{data.fundTransfers.length + index + 1}</td>
                <td className="border border-gray-400 p-2">{formatDate(attendance.date)}</td>
                <td className="border border-gray-400 p-2">أجر عامل - {attendance.worker?.name || 'غير محدد'}</td>
                <td className="border border-gray-400 p-2 text-center font-semibold">
                  {formatCurrencySimple(attendance.paidAmount || 0)}
                </td>
              </tr>
            ))}

            {/* مشتريات المواد */}
            {data.materialPurchases?.map((purchase, index) => (
              <tr key={`material-${index}`}>
                <td className="border border-gray-400 p-2 text-center">
                  {data.fundTransfers.length + data.workerAttendance.length + index + 1}
                </td>
                <td className="border border-gray-400 p-2">{formatDate(purchase.date)}</td>
                <td className="border border-gray-400 p-2">
                  مشتريات - {purchase.material?.name || 'مادة'} ({purchase.quantity} {purchase.unit})
                </td>
                <td className="border border-gray-400 p-2 text-center font-semibold">
                  {formatCurrencySimple(purchase.totalAmount || 0)}
                </td>
              </tr>
            ))}

            {/* مصاريف النقل */}
            {data.transportationExpenses?.map((expense, index) => (
              <tr key={`transport-${index}`}>
                <td className="border border-gray-400 p-2 text-center">
                  {data.fundTransfers.length + data.workerAttendance.length + data.materialPurchases.length + index + 1}
                </td>
                <td className="border border-gray-400 p-2">{formatDate(expense.date)}</td>
                <td className="border border-gray-400 p-2">نقل - {expense.description || 'مصروف نقل'}</td>
                <td className="border border-gray-400 p-2 text-center font-semibold">
                  {formatCurrencySimple(expense.amount)}
                </td>
              </tr>
            ))}

            {/* حوالات العمال */}
            {data.workerTransfers?.map((transfer, index) => (
              <tr key={`worker-transfer-${index}`}>
                <td className="border border-gray-400 p-2 text-center">
                  {data.fundTransfers.length + data.workerAttendance.length + data.materialPurchases.length + 
                   data.transportationExpenses.length + index + 1}
                </td>
                <td className="border border-gray-400 p-2">{formatDate(transfer.date)}</td>
                <td className="border border-gray-400 p-2">
                  حوالة - {transfer.worker?.name} إلى {transfer.recipientName}
                </td>
                <td className="border border-gray-400 p-2 text-center font-semibold">
                  {formatCurrencySimple(transfer.amount)}
                </td>
              </tr>
            ))}

            {/* مصروفات متنوعة */}
            {data.miscExpenses?.map((expense, index) => (
              <tr key={`misc-${index}`}>
                <td className="border border-gray-400 p-2 text-center">
                  {data.fundTransfers.length + data.workerAttendance.length + data.materialPurchases.length + 
                   data.transportationExpenses.length + data.workerTransfers.length + index + 1}
                </td>
                <td className="border border-gray-400 p-2">{formatDate(expense.date)}</td>
                <td className="border border-gray-400 p-2">متنوع - {expense.description || 'مصروف متنوع'}</td>
                <td className="border border-gray-400 p-2 text-center font-semibold">
                  {formatCurrencySimple(expense.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ملخص المصروفات */}
      <div className="mb-8">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="text-lg font-bold text-center text-blue-800 mb-4">ملخص المصروفات</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* الدخل */}
            <div className="space-y-2">
              <h4 className="font-semibold text-green-700 border-b border-green-300 pb-1">الدخل</h4>
              <div className="flex justify-between">
                <span>تحويلات العهدة:</span>
                <span className="font-semibold">{formatCurrencySimple(fundTransfersTotal)}</span>
              </div>
              <div className="flex justify-between text-green-700 font-bold border-t pt-1">
                <span>إجمالي الدخل:</span>
                <span>{formatCurrencySimple(data.totalIncome)}</span>
              </div>
            </div>

            {/* المصروفات */}
            <div className="space-y-2">
              <h4 className="font-semibold text-red-700 border-b border-red-300 pb-1">المصروفات</h4>
              <div className="flex justify-between">
                <span>أجور العمال:</span>
                <span className="font-semibold">{formatCurrencySimple(workerWagesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>مشتريات المواد:</span>
                <span className="font-semibold">{formatCurrencySimple(materialPurchasesTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>النقل:</span>
                <span className="font-semibold">{formatCurrencySimple(transportationTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>حوالات العمال:</span>
                <span className="font-semibold">{formatCurrencySimple(workerTransfersTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>مصروفات متنوعة:</span>
                <span className="font-semibold">{formatCurrencySimple(miscExpensesTotal)}</span>
              </div>
              <div className="flex justify-between text-red-700 font-bold border-t pt-1">
                <span>إجمالي المصروفات:</span>
                <span>{formatCurrencySimple(data.totalExpenses)}</span>
              </div>
            </div>
          </div>

          {/* الرصيد النهائي */}
          <div className="mt-6 p-4 bg-white rounded border-2 border-blue-300">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold">الرصيد المتبقي:</span>
              <span className={`text-2xl font-bold ${
                data.remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrencySimple(Math.abs(data.remainingBalance))} ر.ي
                {data.remainingBalance < 0 && ' (عجز)'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* تذييل التقرير */}
      <div className="mt-8 pt-4 border-t border-gray-300 print:fixed print:bottom-0 print:left-0 print:right-0">
        <div className="text-center text-sm text-gray-600">
          <p>شركة الفني للمقاولات والاستشارات الهندسية</p>
          <p>المصروفات اليومية</p>
        </div>
      </div>
    </div>
  );
}