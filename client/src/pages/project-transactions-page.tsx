import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Search, Filter, Download, TrendingUp, TrendingDown, Building2, Users, Truck, ChartGantt } from 'lucide-react';
import ProjectSelector from '@/components/project-selector';
import { useSelectedProject } from '@/hooks/use-selected-project';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useFloatingButton } from '@/components/layout/floating-button-context';
import { apiRequest } from '@/lib/queryClient';
import { useEffect } from 'react';

interface Project {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  date: string;
  type: 'income' | 'expense' | 'deferred';
  category: string;
  amount: number;
  description: string;
  details?: any;
}

export default function ProjectTransactionsPage() {
  const { selectedProjectId, selectProject } = useSelectedProject();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const { setFloatingAction } = useFloatingButton();

  // إزالة الزر العائم من هذه الصفحة لأنها صفحة عرض فقط
  useEffect(() => {
    setFloatingAction(null);
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // جلب المشاريع
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/projects', 'GET');
        if (response && response.data && Array.isArray(response.data)) {
          return response.data as Project[];
        }
        return Array.isArray(response) ? response as Project[] : [];
      } catch (error) {
        console.error('Error fetching projects:', error);
        return [];
      }
    },
  });

  // جلب بيانات المشروع مع الإحصائيات بدلاً من التحليل المعطل
  const { data: projectStats, isLoading } = useQuery({
    queryKey: ['/api/projects', selectedProjectId, 'stats'],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/projects/${selectedProjectId}/stats`, 'GET');
        return response && response.data ? response.data : response;
      } catch (error) {
        console.error('Error fetching project stats:', error);
        return null;
      }
    },
    enabled: !!selectedProjectId,
  });

  // جلب تحويلات العهدة للمشروع
  const { data: fundTransfers = [] } = useQuery({
    queryKey: ['/api/projects', selectedProjectId, 'fund-transfers'],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/projects/${selectedProjectId}/fund-transfers`, 'GET');
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('Error fetching fund transfers:', error);
        return [];
      }
    },
    enabled: !!selectedProjectId,
  });

  // جلب حضور العمال للمشروع  
  const { data: workerAttendance = [] } = useQuery({
    queryKey: ['/api/projects', selectedProjectId, 'worker-attendance'],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/projects/${selectedProjectId}/worker-attendance`, 'GET');
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('Error fetching worker attendance:', error);
        return [];
      }
    },
    enabled: !!selectedProjectId,
  });

  // جلب مشتريات المواد للمشروع
  const { data: materialPurchases = [] } = useQuery({
    queryKey: ['/api/projects', selectedProjectId, 'material-purchases'],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/projects/${selectedProjectId}/material-purchases`, 'GET');
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('Error fetching material purchases:', error);
        return [];
      }
    },
    enabled: !!selectedProjectId,
  });

  // جلب مصاريف النقل للمشروع
  const { data: transportExpenses = [] } = useQuery({
    queryKey: ['/api/projects', selectedProjectId, 'transportation-expenses'],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/projects/${selectedProjectId}/transportation-expenses`, 'GET');
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error('Error fetching transportation expenses:', error);
        return [];
      }
    },
    enabled: !!selectedProjectId,
  });

  // تحويل البيانات المالية إلى قائمة معاملات موحدة
  const transactions = useMemo(() => {
    const allTransactions: Transaction[] = [];

    // إضافة تحويلات العهدة (دخل)
    if (fundTransfers && Array.isArray(fundTransfers) && fundTransfers.length > 0) {
      fundTransfers.forEach((transfer: any) => {
        allTransactions.push({
          id: `fund-${transfer.id || Math.random()}`,
          date: transfer.transferDate,
          type: 'income',
          category: 'تحويل عهدة',
          amount: transfer.amount,
          description: `من: ${transfer.senderName || 'غير محدد'}`,
          details: transfer
        });
      });
    }

    // إضافة أجور العمال (مصروف)
    if (workerAttendance && Array.isArray(workerAttendance) && workerAttendance.length > 0) {
      workerAttendance.forEach((attendance: any) => {
        allTransactions.push({
          id: `wage-${attendance.id || Math.random()}`,
          date: attendance.date,
          type: 'expense',
          category: 'أجور العمال',
          amount: attendance.actualWage || attendance.wage || 0,
          description: `عامل: ${attendance.workerName || attendance.worker?.name || 'غير محدد'}`,
          details: attendance
        });
      });
    }

    // إضافة مشتريات المواد (مصروف) - المشتريات النقدية فقط
    if (materialPurchases && Array.isArray(materialPurchases) && materialPurchases.length > 0) {
      materialPurchases.forEach((purchase: any) => {
        // فقط المشتريات النقدية تُحسب كمصروفات - المشتريات الآجلة لا تُحسب
        if (purchase.purchaseType === "نقد") {
          allTransactions.push({
            id: `material-${purchase.id || Math.random()}`,
            date: purchase.purchaseDate || purchase.date,
            type: 'expense',
            category: 'مشتريات المواد',
            amount: purchase.totalAmount || purchase.amount || 0,
            description: `مادة: ${purchase.materialName || purchase.material?.name || 'غير محدد'} (${purchase.purchaseType})`,
            details: purchase
          });
        } else if (purchase.purchaseType === "آجل") {
          // إضافة المشتريات الآجلة كعنصر منفصل للعرض فقط (ليس مصروف)
          allTransactions.push({
            id: `material-deferred-${purchase.id || Math.random()}`,
            date: purchase.purchaseDate || purchase.date,
            type: 'deferred',
            category: 'مشتريات آجلة',
            amount: purchase.totalAmount || purchase.amount || 0,
            description: `مادة: ${purchase.materialName || purchase.material?.name || 'غير محدد'} (${purchase.purchaseType})`,
            details: purchase
          });
        }
      });
    }

    // إضافة مصاريف النقل (مصروف)
    if (transportExpenses && Array.isArray(transportExpenses) && transportExpenses.length > 0) {
      transportExpenses.forEach((transport: any) => {
        allTransactions.push({
          id: `transport-${transport.id || Math.random()}`,
          date: transport.expenseDate || transport.date,
          type: 'expense',
          category: 'نقل ومواصلات',
          amount: transport.amount || 0,
          description: transport.description || 'مصروف نقل',
          details: transport
        });
      });
    }

    return allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fundTransfers, workerAttendance, materialPurchases, transportExpenses]);

  // تطبيق الفلاتر
  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // فلتر حسب النوع
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.type === filterType);
    }

    // فلتر حسب الفئة
    if (filterCategory !== 'all') {
      filtered = filtered.filter(t => t.category === filterCategory);
    }

    // فلتر البحث النصي
    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // فلتر التاريخ
    if (dateFrom) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter(t => new Date(t.date) <= new Date(dateTo));
    }

    return filtered;
  }, [transactions, filterType, filterCategory, searchTerm, dateFrom, dateTo]);

  // حساب الإجماليات المفلترة
  const filteredTotals = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [filteredTransactions]);

  // الحصول على قائمة الفئات الفريدة
  const categories = useMemo(() => {
    return Array.from(new Set(transactions.map(t => t.category)));
  }, [transactions]);

  const exportToExcel = () => {
    // تصدير إلى Excel - سيتم تنفيذه لاحقاً
    console.log('تصدير إلى Excel...');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* اختيار المشروع */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <h2 className="text-lg font-bold text-foreground mb-3 flex items-center">
              <ChartGantt className="ml-2 h-5 w-5 text-primary" />
              اختر المشروع
            </h2>
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={(projectId, projectName) => selectProject(projectId, projectName)}
              showHeader={false}
              variant="compact"
            />
          </CardContent>
        </Card>

        {selectedProjectId && (
          <>
            {/* شريط الفلاتر */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    الفلاتر والبحث
                  </span>
                  <Button onClick={exportToExcel} variant="outline" size="sm">
                    <Download className="h-4 w-4 ml-2" />
                    تصدير Excel
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* نوع العملية */}
                  <div>
                    <label className="block text-sm font-medium mb-2">نوع العملية</label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع العمليات</SelectItem>
                        <SelectItem value="income">الدخل فقط</SelectItem>
                        <SelectItem value="expense">المصاريف فقط</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* فئة العملية */}
                  <div>
                    <label className="block text-sm font-medium mb-2">الفئة</label>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الفئات</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* من تاريخ */}
                  <div>
                    <label className="block text-sm font-medium mb-2">من تاريخ</label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                    />
                  </div>

                  {/* إلى تاريخ */}
                  <div>
                    <label className="block text-sm font-medium mb-2">إلى تاريخ</label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                    />
                  </div>
                </div>

                {/* البحث النصي */}
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">البحث</label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="ابحث في الوصف أو الفئة..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ملخص الإجماليات */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        إجمالي الدخل
                      </p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        {filteredTotals.income.toLocaleString()} ر.ي
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">
                        إجمالي المصاريف
                      </p>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                        {filteredTotals.expenses.toLocaleString()} ر.ي
                      </p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className={`${filteredTotals.balance >= 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-sm font-medium ${filteredTotals.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        الرصيد النهائي
                      </p>
                      <p className={`text-2xl font-bold ${filteredTotals.balance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700 dark:text-orange-300'}`}>
                        {filteredTotals.balance.toLocaleString()} ر.ي
                      </p>
                    </div>
                    <Calendar className={`h-8 w-8 ${filteredTotals.balance >= 0 ? 'text-blue-500' : 'text-orange-500'}`} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* جدول العمليات */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>سجل العمليات ({filteredTransactions.length} عملية)</span>
                  <Badge variant="outline">
                    {isLoading ? 'جاري التحميل...' : `${filteredTransactions.length} من ${transactions.length}`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">جاري تحميل البيانات...</p>
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد عمليات تطابق الفلاتر المحددة
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full table-auto">
                      <thead>
                        <tr className="border-b bg-gray-50 dark:bg-gray-800">
                          <th className="text-right py-3 px-4 font-medium">التاريخ</th>
                          <th className="text-right py-3 px-4 font-medium">النوع</th>
                          <th className="text-right py-3 px-4 font-medium">الفئة</th>
                          <th className="text-right py-3 px-4 font-medium">المبلغ</th>
                          <th className="text-right py-3 px-4 font-medium">الوصف</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((transaction, index) => (
                          <tr key={transaction.id} className={`border-b ${index % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800'} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                            <td className="py-3 px-4 text-sm">
                              {format(new Date(transaction.date), 'dd/MM/yyyy', { locale: ar })}
                            </td>
                            <td className="py-3 px-4">
                              <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                                {transaction.type === 'income' ? 'دخل' : 'مصروف'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-sm font-medium">
                              {transaction.category}
                            </td>
                            <td className={`py-3 px-4 text-sm font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString()} ر.ي
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                              {transaction.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}