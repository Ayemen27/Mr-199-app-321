import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Printer, Calendar, Filter, Download } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface DailyExpense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  projectId: string;
}

export default function DailyExpensesReport() {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { selectedProjectId } = useSelectedProject();

  const { data: expenses = [], isLoading } = useQuery<DailyExpense[]>({
    queryKey: ["/api/daily-expenses-report", selectedProjectId, dateFrom, dateTo, categoryFilter],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const params = new URLSearchParams({
        projectId: selectedProjectId,
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
        ...(categoryFilter && categoryFilter !== "all" && { category: categoryFilter })
      });
      return apiRequest(`/api/daily-expenses-report?${params}`, "GET");
    },
    enabled: !!selectedProjectId
  });

  const totalExpenses = Array.isArray(expenses) ? expenses.reduce((sum, expense) => sum + expense.amount, 0) : 0;

  const handleExportExcel = () => {
    // تصدير Excel - سيتم تطويرها لاحقاً
    console.log("تصدير Excel للمصاريف اليومية");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">تقرير المصاريف اليومية</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            طباعة
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* فلاتر التقرير */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            فلاتر التقرير
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">المشروع</label>
              <ProjectSelector onProjectChange={(projectId) => {
                console.log('تم تغيير المشروع في تقرير المصاريف:', projectId);
              }} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">من تاريخ</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">إلى تاريخ</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">الفئة</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="كل الفئات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفئات</SelectItem>
                  <SelectItem value="materials">مواد</SelectItem>
                  <SelectItem value="labor">عمالة</SelectItem>
                  <SelectItem value="transport">نقل</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ملخص المصاريف */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المصاريف</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalExpenses.toString())}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">عدد العمليات</p>
                <p className="text-2xl font-bold text-blue-600">{expenses.length}</p>
              </div>
              <Download className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">متوسط المصروف</p>
                <p className="text-2xl font-bold text-green-600">
                  {expenses.length > 0 ? formatCurrency((totalExpenses / expenses.length).toString()) : "0"}
                </p>
              </div>
              <FileSpreadsheet className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جدول المصاريف */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل المصاريف</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد مصاريف في الفترة المحددة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-right p-3">التاريخ</th>
                    <th className="text-right p-3">الوصف</th>
                    <th className="text-right p-3">الفئة</th>
                    <th className="text-right p-3">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(expenses) && expenses.map((expense) => (
                    <tr key={expense.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">{formatDate(expense.date)}</td>
                      <td className="p-3">{expense.description}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                          {expense.category}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-red-600">
                        {formatCurrency(expense.amount.toString())}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td colSpan={3} className="p-3 text-right">الإجمالي:</td>
                    <td className="p-3 text-red-600 text-lg">
                      {formatCurrency(totalExpenses.toString())}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}