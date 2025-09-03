import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatsCard, StatsGrid } from "@/components/ui/stats-card";
import { 
  FileSpreadsheet, 
  Printer, 
  Download, 
  Calendar,
  Users,
  Building2,
  TrendingUp,
  DollarSign,
  FileText,
  Eye,
  RefreshCw
} from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import { formatCurrency, formatDate, getCurrentDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
  lastGenerated?: string;
}

const reportCategories = [
  { id: "financial", name: "التقارير المالية", icon: DollarSign, color: "text-green-600" },
  { id: "workers", name: "تقارير العمال", icon: Users, color: "text-blue-600" },
  { id: "projects", name: "تقارير المشاريع", icon: Building2, color: "text-purple-600" },
  { id: "analytics", name: "تقارير تحليلية", icon: TrendingUp, color: "text-orange-600" },
  { id: "operations", name: "تقارير تشغيلية", icon: FileText, color: "text-gray-600" }
];

export default function ReportsFixed() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(getCurrentDate());
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { selectedProjectId } = useSelectedProject();

  // جلب قوالب التقارير المتاحة
  const { data: reportTemplates = [], isLoading: templatesLoading, refetch: refetchTemplates } = useQuery<ReportTemplate[]>({
    queryKey: ["/api/report-templates", selectedCategory],
    queryFn: async () => {
      const params = selectedCategory !== "all" ? `?category=${selectedCategory}` : "";
      return apiRequest(`/api/report-templates${params}`, "GET");
    }
  });

  // جلب التقارير المُنشأة مؤخراً
  const { data: recentReports = [], isLoading: reportsLoading } = useQuery({
    queryKey: ["/api/recent-reports", selectedProjectId],
    queryFn: () => selectedProjectId ? apiRequest(`/api/recent-reports?projectId=${selectedProjectId}`, "GET") : [],
    enabled: !!selectedProjectId
  });

  const handleGenerateReport = async (templateId: string, format: 'excel' | 'pdf' = 'excel') => {
    if (!selectedProjectId) {
      alert('يرجى اختيار مشروع أولاً');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await apiRequest("/api/generate-report", "POST", {
        templateId,
        projectId: selectedProjectId,
        dateFrom,
        dateTo,
        format
      });

      // تحميل التقرير
      if (response.downloadUrl) {
        window.open(response.downloadUrl, '_blank');
      }
      
      // تحديث قائمة التقارير
      refetchTemplates();
    } catch (error) {
      console.error('خطأ في إنشاء التقرير:', error);
      alert('حدث خطأ في إنشاء التقرير');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewReport = (templateId: string) => {
    // معاينة التقرير في نافذة جديدة
    const previewUrl = `/preview-report/${templateId}?projectId=${selectedProjectId}&dateFrom=${dateFrom}&dateTo=${dateTo}`;
    window.open(previewUrl, '_blank', 'width=1200,height=800');
  };

  const filteredTemplates = Array.isArray(reportTemplates) ? reportTemplates.filter(template => 
    selectedCategory === "all" || template.category === selectedCategory
  ) : [];

  return (
    <div className="p-6 space-y-6">
      {/* رأس الصفحة */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">التقارير المحسنة</h1>
          <p className="text-gray-600 mt-1">إنشاء وإدارة التقارير بشكل متقدم</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchTemplates()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            تحديث
          </Button>
        </div>
      </div>

      {/* فلاتر وإعدادات */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إعدادات التقرير</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">المشروع</label>
              <ProjectSelector onProjectChange={() => {}} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">من تاريخ</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">إلى تاريخ</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">فئة التقرير</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="كل الفئات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الفئات</SelectItem>
                  {reportCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">قوالب التقارير</TabsTrigger>
          <TabsTrigger value="recent">التقارير الأخيرة</TabsTrigger>
          <TabsTrigger value="analytics">إحصائيات التقارير</TabsTrigger>
        </TabsList>

        {/* قوالب التقارير */}
        <TabsContent value="templates" className="space-y-4">
          {templatesLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">جاري تحميل قوالب التقارير...</p>
              </CardContent>
            </Card>
          ) : filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد قوالب تقارير متاحة</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(filteredTemplates) && filteredTemplates.map((template) => {
                const category = reportCategories.find(cat => cat.id === template.category);
                const CategoryIcon = category?.icon || FileText;
                
                return (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <CategoryIcon className={`w-5 h-5 ${category?.color || 'text-gray-500'}`} />
                          <CardTitle className="text-sm">{template.name}</CardTitle>
                        </div>
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "نشط" : "معطل"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {template.description}
                      </p>
                      
                      {template.lastGenerated && (
                        <p className="text-xs text-gray-500">
                          آخر إنشاء: {formatDate(template.lastGenerated)}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handlePreviewReport(template.id)}
                          disabled={!selectedProjectId}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          معاينة
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleGenerateReport(template.id, 'excel')}
                          disabled={!selectedProjectId || isGenerating}
                        >
                          <FileSpreadsheet className="w-4 h-4 mr-1" />
                          Excel
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateReport(template.id, 'pdf')}
                          disabled={!selectedProjectId || isGenerating}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* التقارير الأخيرة */}
        <TabsContent value="recent" className="space-y-4">
          {reportsLoading ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">جاري تحميل التقارير الأخيرة...</p>
              </CardContent>
            </Card>
          ) : recentReports.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد تقارير تم إنشاؤها مؤخراً</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {Array.isArray(recentReports) && recentReports.map((report: any) => (
                <Card key={report.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <div>
                          <h4 className="font-medium">{report.name}</h4>
                          <p className="text-sm text-gray-500">
                            {formatDate(report.createdAt)} - {report.format.toUpperCase()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Download className="w-4 h-4 mr-1" />
                          تحميل
                        </Button>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          عرض
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* إحصائيات التقارير */}
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>إحصائيات استخدام التقارير</CardTitle>
            </CardHeader>
            <CardContent>
              <StatsGrid>
                <StatsCard
                  title="قوالب متاحة"
                  value={reportTemplates.length}
                  icon={FileText}
                  color="blue"
                />
                <StatsCard
                  title="تقارير هذا الشهر"
                  value={recentReports.length}
                  icon={Download}
                  color="green"
                />
                <StatsCard
                  title="قوالب نشطة"
                  value={Array.isArray(reportTemplates) ? reportTemplates.filter(t => t.isActive).length : 0}
                  icon={TrendingUp}
                  color="orange"
                />
              </StatsGrid>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}