import React from 'react';

interface WorkerFilterData {
  companyName: string;
  reportTitle: string;
  dateRange: {
    from: string;
    to: string;
  };
  projectCount: number;
  workerCount: number;
  totalDailyWages: number;
  workers: Array<{
    id: string;
    name: string;
    type: string;
    project: string;
    dailyWage: number;
    workDays: number;
    totalEarned: number;
    totalPaid: number;
    remaining: number;
    isActive: boolean;
    notes?: string;
  }>;
  totals: {
    totalRemaining: number;
    totalPaid: number;
    totalEarned: number;
    totalWorkDays: number;
    averageDailyWage: number;
  };
}

interface WorkerFilterTemplateProps {
  data: WorkerFilterData;
}

export default function WorkerFilterTemplate({ data }: WorkerFilterTemplateProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' YER';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="worker-filter-report bg-white text-black p-6" dir="rtl">
      {/* رأس التقرير */}
      <div className="text-center mb-6 border-b-2 border-blue-600 pb-4">
        <h1 className="text-2xl font-bold text-blue-800 mb-2">
          {data.companyName || 'شركة الفتني للمقاولات والاستشارات الهندسية'}
        </h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          {data.reportTitle || 'كشف تصفية العمال'}
        </h2>
        <p className="text-sm text-gray-600">
          للفترة من {formatDate(data.dateRange.from)} إلى {formatDate(data.dateRange.to)}
        </p>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-4 gap-4 mb-6 text-center">
        <div className="bg-gray-100 p-3 rounded">
          <div className="text-lg font-bold">{data.projectCount}</div>
          <div className="text-sm text-gray-600">عدد المشاريع</div>
        </div>
        <div className="bg-gray-100 p-3 rounded">
          <div className="text-lg font-bold">{data.workerCount}</div>
          <div className="text-sm text-gray-600">عدد العمال</div>
        </div>
        <div className="bg-gray-100 p-3 rounded">
          <div className="text-lg font-bold">{formatCurrency(data.totals.averageDailyWage)}</div>
          <div className="text-sm text-gray-600">إجمالي أيام العمل</div>
        </div>
        <div className="bg-gray-100 p-3 rounded">
          <div className="text-lg font-bold">{formatCurrency(data.totals.totalWorkDays)}</div>
          <div className="text-sm text-gray-600">متوسط الأجر اليومي</div>
        </div>
      </div>

      {/* عنوان الجدول */}
      <div className="bg-blue-600 text-white p-3 text-center font-bold text-lg mb-0">
        كشف تصفية العمال
      </div>

      {/* جدول العمال */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="border border-gray-300 p-2 text-center w-8">م</th>
              <th className="border border-gray-300 p-2 text-center w-24">الاسم</th>
              <th className="border border-gray-300 p-2 text-center w-16">المهنة</th>
              <th className="border border-gray-300 p-2 text-center w-20">اسم المشروع</th>
              <th className="border border-gray-300 p-2 text-center w-16">الأجر اليومي</th>
              <th className="border border-gray-300 p-2 text-center w-16">أيام العمل</th>
              <th className="border border-gray-300 p-2 text-center w-20">إجمالي المستحق</th>
              <th className="border border-gray-300 p-2 text-center w-20">المبلغ المستلم</th>
              <th className="border border-gray-300 p-2 text-center w-20">المبلغ المتبقي</th>
              <th className="border border-gray-300 p-2 text-center w-16">الحالة</th>
              <th className="border border-gray-300 p-2 text-center w-20">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {data.workers.map((worker, index) => (
              <tr key={worker.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="border border-gray-300 p-2 text-center font-medium">
                  {index + 1}
                </td>
                <td className="border border-gray-300 p-2 text-center font-medium">
                  {worker.name}
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  {worker.type}
                </td>
                <td className="border border-gray-300 p-2 text-center text-xs">
                  {worker.project}
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  {formatCurrency(worker.dailyWage)}
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  {worker.workDays}
                </td>
                <td className="border border-gray-300 p-2 text-center font-medium text-black">
                  {formatCurrency(worker.totalEarned)}
                </td>
                <td className="border border-gray-300 p-2 text-center text-red-600 font-medium">
                  {formatCurrency(worker.totalPaid)}
                </td>
                <td className="border border-gray-300 p-2 text-center font-medium text-green-600">
                  {formatCurrency(worker.remaining)}
                </td>
                <td className="border border-gray-300 p-2 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${
                    worker.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {worker.isActive ? 'نشط' : 'غير نشط'}
                  </span>
                </td>
                <td className="border border-gray-300 p-2 text-center text-xs">
                  {worker.notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-green-600 text-white font-bold">
              <td className="border border-gray-300 p-2 text-center" colSpan={6}>
                الإجماليات
              </td>
              <td className="border border-gray-300 p-2 text-center">
                {formatCurrency(data.totals.totalEarned)} ر.س
              </td>
              <td className="border border-gray-300 p-2 text-center">
                {formatCurrency(data.totals.totalPaid)} ر.س
              </td>
              <td className="border border-gray-300 p-2 text-center">
                {formatCurrency(data.totals.totalRemaining)} ر.س
              </td>
              <td className="border border-gray-300 p-2 text-center" colSpan={2}>
                -
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* الملخص النهائي */}
      <div className="mt-6 bg-gray-50 p-4 rounded">
        <h3 className="text-lg font-bold text-center mb-4 text-blue-800">الملخص النهائي</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-xl font-bold text-blue-600">{formatCurrency(data.totals.totalEarned)} ر.س</div>
            <div className="text-sm text-gray-600">إجمالي المبلغ المستحق</div>
          </div>
          <div>
            <div className="text-xl font-bold text-red-600">{formatCurrency(data.totals.totalPaid)} ر.س</div>
            <div className="text-sm text-gray-600">إجمالي المبلغ المدفوع</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-600">{formatCurrency(data.totals.totalRemaining)} ر.س</div>
            <div className="text-sm text-gray-600">إجمالي المبلغ المتبقي</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-600">{formatCurrency(data.totals.totalWorkDays)}</div>
            <div className="text-sm text-gray-600">إجمالي أيام العمل</div>
          </div>
        </div>
      </div>

      {/* التوقيعات */}
      <div className="mt-8 grid grid-cols-3 gap-8 text-center">
        <div className="border-t-2 border-gray-400 pt-2">
          <div className="font-semibold">توقيع المدير العام</div>
          <div className="text-sm text-gray-600 mt-8">...................................</div>
        </div>
        <div className="border-t-2 border-gray-400 pt-2">
          <div className="font-semibold">توقيع مدير المشروع</div>
          <div className="text-sm text-gray-600 mt-8">...................................</div>
        </div>
        <div className="border-t-2 border-gray-400 pt-2">
          <div className="font-semibold">توقيع المحاسب</div>
          <div className="text-sm text-gray-600 mt-8">...................................</div>
        </div>
      </div>

      {/* تاريخ الطباعة */}
      <div className="mt-6 text-center text-xs text-gray-500">
        تم إنشاء هذا التقرير في تاريخ {new Date().toLocaleDateString('ar-SA')} الساعة {new Date().toLocaleTimeString('ar-SA')}
        <br />
        التاريخ الميلادي: {new Date().toLocaleDateString('en-US')}
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          .worker-filter-report {
            font-size: 12px;
            margin: 0;
            padding: 20px;
          }
          
          table {
            page-break-inside: avoid;
          }
          
          thead {
            display: table-header-group;
          }
          
          tr {
            page-break-inside: avoid;
          }
          
          .grid {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          
          .grid > div {
            flex: 1;
            min-width: 120px;
          }
        }
        `
      }} />
    </div>
  );
}

export type { WorkerFilterData };