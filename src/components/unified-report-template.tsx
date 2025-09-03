/**
 * الوصف: قالب تقارير موحد وبسيط لجميع التقارير
 * المدخلات: عنوان التقرير + معلومات الرأس + المحتوى
 * المخرجات: قالب تقرير احترافي مع دعم الطباعة
 * المالك: عمار
 * آخر تعديل: 2025-08-15
 * الحالة: نشط
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building2Icon } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { StatsCard } from "@/components/ui/stats-card";

interface UnifiedReportTemplateProps {
  title: string;
  subtitle?: string;
  reportDate?: string;
  headerInfo: {
    label: string;
    value: string;
  }[];
  children: React.ReactNode;
  className?: string;
}

export function UnifiedReportTemplate({
  title,
  subtitle,
  reportDate = new Date().toISOString().split('T')[0],
  headerInfo,
  children,
  className = ""
}: UnifiedReportTemplateProps) {
  return (
    <div className={`container mx-auto p-4 space-y-6 max-w-7xl ${className}`}>
      {/* Header Section */}
      <Card className="print:shadow-none print:border-2 print:border-gray-800">
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            {/* Company Logo and Title */}
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-3 rounded-lg print:bg-gray-100">
                <Building2Icon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white print:text-black">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-lg text-muted-foreground mt-1 print:text-gray-600">{subtitle}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs print:border-gray-400">
                    تاريخ التقرير: {formatDate(reportDate)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator className="mt-4" />

          {/* Report Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 print:grid-cols-3">
            {headerInfo.map((info, index) => (
              <div key={index} className="flex justify-between py-2 px-3 bg-muted/30 rounded-lg print:bg-gray-50 print:border print:border-gray-300">
                <span className="font-medium text-sm text-muted-foreground print:text-gray-700">
                  {info.label}:
                </span>
                <span className="font-semibold text-sm print:text-black">
                  {info.value}
                </span>
              </div>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Content Section */}
      <div className="space-y-4">
        {children}
      </div>

      {/* Footer - Print Only */}
      <div className="hidden print:block text-center text-xs text-gray-500 mt-8 pt-4 border-t border-gray-300">
        <p>نظام إدارة المشاريع الإنشائية - طُبع في {formatDate(new Date().toISOString().split('T')[0])}</p>
        <p>www.constructionpm.com | info@constructionpm.com</p>
      </div>
    </div>
  );
}

// Helper component for summary cards
interface SummaryCardProps {
  title: string;
  value: string | number;
  valueColor?: string;
  icon?: React.ReactNode;
}

// استخدم StatsCard الموحد بدلاً من SummaryCard
// export function SummaryCard({ title, value, valueColor = "text-gray-900", icon }: SummaryCardProps) {
//   return (
//     <Card className="print:shadow-none print:border print:border-gray-300">
//       <CardContent className="p-4 text-center">
//         {icon && (
//           <div className="flex justify-center mb-2 print:hidden">
//             {icon}
//           </div>
//         )}
//         <p className="text-sm text-muted-foreground print:text-gray-600">{title}</p>
//         <p className={`text-xl font-bold print:text-lg print:text-black ${valueColor}`}>
//           {typeof value === 'number' ? formatCurrency(value) : value}
//         </p>
//       </CardContent>
//     </Card>
//   );
// }

// مكون بديل محسن يستخدم StatsCard الموحد
export function SummaryCard({ title, value, valueColor = "text-gray-900", icon }: SummaryCardProps) {
  // تحويل اللون إلى لون StatsCard
  const colorMap: Record<string, any> = {
    "text-gray-900": "blue",
    "text-green-600": "green",
    "text-red-600": "red",
    "text-orange-600": "orange",
    "text-blue-600": "blue",
    "text-purple-600": "purple"
  };
  
  // استخدام أيقونة افتراضية إذا لم تُوفر
  const defaultIcon = Building2Icon;
  
  return (
    <div className="print:border print:border-gray-300 print:rounded">
      <StatsCard
        title={title}
        value={typeof value === 'number' ? formatCurrency(value) : value}
        icon={icon as any || defaultIcon}
        color={colorMap[valueColor] || "blue"}
      />
    </div>
  );
}

// Professional table component
interface UnifiedTableProps {
  headers: string[];
  data: (string | number | React.ReactNode)[][];
  className?: string;
}

export function UnifiedTable({ headers, data, className = "" }: UnifiedTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className={`min-w-full border-collapse print:text-sm ${className}`}>
        <thead>
          <tr className="bg-muted/50 print:bg-gray-200">
            {headers.map((header, index) => (
              <th
                key={index}
                className="text-center font-semibold text-sm border border-gray-300 p-3 print:p-2 print:text-xs"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/30 even:bg-muted/10 print:even:bg-gray-50">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="text-center text-sm border border-gray-300 p-3 print:p-2 print:text-xs"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}