import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  FileSpreadsheet, 
  Printer, 
  Users,
  Filter,
  Search,
  Calendar,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import { formatCurrency, formatDate, getCurrentDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface FilterCriteria {
  workerIds: string[];
  workerTypes: string[];
  isActive: boolean | null;
  dateFrom: string;
  dateTo: string;
  minWorkDays: number | null;
  maxWorkDays: number | null;
  minBalance: number | null;
  maxBalance: number | null;
  hasDebt: boolean | null;
  searchTerm: string;
}

interface FilteredWorkerData {
  id: string;
  name: string;
  type: string;
  dailyWage: number;
  isActive: boolean;
  stats: {
    totalWorkDays: number;
    totalEarned: number;
    totalPaid: number;
    balance: number;
    lastWorkDate: string;
    averageDaysPerMonth: number;
  };
}

export default function WorkersFilterReport() {
  const [filters, setFilters] = useState<FilterCriteria>({
    workerIds: [],
    workerTypes: [],
    isActive: null,
    dateFrom: "",
    dateTo: getCurrentDate(),
    minWorkDays: null,
    maxWorkDays: null,
    minBalance: null,
    maxBalance: null,
    hasDebt: null,
    searchTerm: ""
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  
  const { selectedProjectId } = useSelectedProject();

  // جلب قائمة العمال
  const { data: allWorkers = [] } = useQuery({
    queryKey: ["/api/workers", selectedProjectId],
    queryFn: () => selectedProjectId ? apiRequest(`/api/workers?projectId=${selectedProjectId}`, "GET") : [],
    enabled: !!selectedProjectId
  });

  // جلب أنواع العمال
  const { data: workerTypes = [] } = useQuery({
    queryKey: ["/api/worker-types"],
    queryFn: () => apiRequest("/api/worker-types", "GET")
  });

  // جلب البيانات المفلترة
  const { data: filteredWorkers = [], isLoading, refetch } = useQuery<FilteredWorkerData[]>({
    queryKey: ["/api/workers-filter-report", selectedProjectId, filters],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      
      const params = new URLSearchParams({
        projectId: selectedProjectId,
        dateFrom: filters.dateFrom || "",
        dateTo: filters.dateTo || getCurrentDate(),
        searchTerm: filters.searchTerm || ""
      });
      
      if (filters.workerIds.length > 0) {
        params.append('workerIds', filters.workerIds.join(','));
      }
      
      if (filters.workerTypes.length > 0) {
        params.append('workerTypes', filters.workerTypes.join(','));
      }
      
      if (filters.isActive !== null) {
        params.append('isActive', filters.isActive.toString());
      }
      
      if (filters.minWorkDays !== null) {
        params.append('minWorkDays', filters.minWorkDays.toString());
      }
      
      if (filters.maxWorkDays !== null) {
        params.append('maxWorkDays', filters.maxWorkDays.toString());
      }
      
      if (filters.minBalance !== null) {
        params.append('minBalance', filters.minBalance.toString());
      }
      
      if (filters.maxBalance !== null) {
        params.append('maxBalance', filters.maxBalance.toString());
      }
      
      if (filters.hasDebt !== null) {
        params.append('hasDebt', filters.hasDebt.toString());
      }
      
      return apiRequest(`/api/workers-filter-report?${params}`, "GET");
    },
    enabled: !!selectedProjectId
  });

  const handleWorkerTypeToggle = (typeId: string) => {
    setFilters(prev => ({
      ...prev,
      workerTypes: prev.workerTypes.includes(typeId)
        ? prev.workerTypes.filter(id => id !== typeId)
        : [...prev.workerTypes, typeId]
    }));
  };

  const handleWorkerSelection = (workerId: string) => {
    setSelectedWorkers(prev => 
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedWorkers.length === filteredWorkers.length) {
      setSelectedWorkers([]);
    } else {
      setSelectedWorkers(filteredWorkers.map(w => w.id));
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!selectedProjectId) {
      alert('يرجى اختيار مشروع');
      return;
    }

    if (selectedWorkers.length === 0) {
      alert('يرجى اختيار عمال للتصدير');
      return;
    }

    try {
      const response = await apiRequest("/api/export-workers-filter-report", "POST", {
        projectId: selectedProjectId,
        workerIds: selectedWorkers,
        filters,
        format
      });

      if (response.downloadUrl) {
        window.open(response.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('خطأ في التصدير:', error);
      alert('حدث خطأ في تصدير التقرير');
    }
  };

  const clearFilters = () => {
    setFilters({
      workerIds: [],
      workerTypes: [],
      isActive: null,
      dateFrom: "",
      dateTo: getCurrentDate(),
      minWorkDays: null,
      maxWorkDays: null,
      minBalance: null,
      maxBalance: null,
      hasDebt: null,
      searchTerm: ""
    });
    setSelectedWorkers([]);
  };

  return (
    <div className="p-6 space-y-6">
      {/* رأس الصفحة */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">تقرير العمال المفلتر</h1>
          <p className="text-gray-600 mt-1">فلترة وتصنيف العمال حسب معايير متقدمة</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            تحديث
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} disabled={selectedWorkers.length === 0}>
            <Printer className="w-4 h-4 mr-2" />
            PDF
          </Button>
          <Button size="sm" onClick={() => handleExport('excel')} disabled={selectedWorkers.length === 0}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* فلاتر البحث */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              فلاتر البحث والتصنيف
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                مسح الفلاتر
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                فلاتر متقدمة
                {showAdvancedFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* الفلاتر الأساسية */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">المشروع</label>
              <ProjectSelector onProjectChange={() => {}} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">البحث في الأسماء</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="ابحث عن عامل..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">من تاريخ</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">إلى تاريخ</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
              />
            </div>
          </div>

          {/* فلتر أنواع العمال */}
          <div>
            <label className="block text-sm font-medium mb-2">أنواع العمال</label>
            <div className="flex flex-wrap gap-2">
              {workerTypes.map((type: any) => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={type.id}
                    checked={filters.workerTypes.includes(type.id)}
                    onCheckedChange={() => handleWorkerTypeToggle(type.id)}
                  />
                  <label htmlFor={type.id} className="text-sm cursor-pointer">
                    {type.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* الفلاتر المتقدمة */}
          {showAdvancedFilters && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">حالة العامل</label>
                  <Select 
                    value={filters.isActive?.toString() || "all"} 
                    onValueChange={(value) => setFilters(prev => ({ 
                      ...prev, 
                      isActive: value === "all" ? null : value === "true" 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل العمال</SelectItem>
                      <SelectItem value="true">النشطين فقط</SelectItem>
                      <SelectItem value="false">غير النشطين فقط</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">حالة الرصيد</label>
                  <Select 
                    value={filters.hasDebt?.toString() || "all"} 
                    onValueChange={(value) => setFilters(prev => ({ 
                      ...prev, 
                      hasDebt: value === "all" ? null : value === "true" 
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأرصدة</SelectItem>
                      <SelectItem value="true">لديهم مديونية</SelectItem>
                      <SelectItem value="false">رصيد موجب أو صفر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">أقل عدد أيام عمل</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minWorkDays?.toString() || ""}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      minWorkDays: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">أكثر عدد أيام عمل</label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={filters.maxWorkDays?.toString() || ""}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      maxWorkDays: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">أقل رصيد</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minBalance?.toString() || ""}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      minBalance: e.target.value ? parseFloat(e.target.value) : null 
                    }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">أكثر رصيد</label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={filters.maxBalance?.toString() || ""}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      maxBalance: e.target.value ? parseFloat(e.target.value) : null 
                    }))}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* نتائج البحث */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              نتائج البحث ({filteredWorkers.length} عامل)
            </CardTitle>
            {filteredWorkers.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="selectAllResults"
                  checked={selectedWorkers.length === filteredWorkers.length}
                  onCheckedChange={handleSelectAll}
                />
                <label htmlFor="selectAllResults" className="text-sm cursor-pointer">
                  تحديد الكل ({selectedWorkers.length}/{filteredWorkers.length})
                </label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">جاري البحث...</p>
            </div>
          ) : filteredWorkers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>لا توجد نتائج تطابق معايير البحث المحددة</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                مسح الفلاتر
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWorkers.map((worker) => (
                <div key={worker.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <Checkbox
                    id={worker.id}
                    checked={selectedWorkers.includes(worker.id)}
                    onCheckedChange={() => handleWorkerSelection(worker.id)}
                  />
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                    <div>
                      <p className="font-medium">{worker.name}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{worker.type}</Badge>
                        <Badge variant={worker.isActive ? "default" : "secondary"} className="text-xs">
                          {worker.isActive ? "نشط" : "غير نشط"}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-600">الأجر اليومي</p>
                      <p className="font-medium">{formatCurrency(worker.dailyWage.toString())}</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-600">أيام العمل</p>
                      <p className="font-medium text-blue-600">{worker.stats.totalWorkDays}</p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-600">المستحق</p>
                      <p className="font-medium text-green-600">
                        {formatCurrency(worker.stats.totalEarned.toString())}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-600">الرصيد</p>
                      <p className={`font-medium ${
                        worker.stats.balance > 0 ? 'text-green-600' :
                        worker.stats.balance < 0 ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {formatCurrency(worker.stats.balance.toString())}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <p className="text-sm text-gray-600">آخر عمل</p>
                      <p className="text-sm">
                        {worker.stats.lastWorkDate ? formatDate(worker.stats.lastWorkDate) : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}