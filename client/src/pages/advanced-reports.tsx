import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, FileSpreadsheet, Printer, TrendingUp, Users, Building2 } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";

export default function AdvancedReports() {
  const [selectedReportType, setSelectedReportType] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const { selectedProjectId } = useSelectedProject();

  const reportTypes = [
    { id: "financial", name: "التقارير المالية", icon: TrendingUp },
    { id: "workers", name: "تقارير العمال", icon: Users },
    { id: "projects", name: "تقارير المشاريع", icon: Building2 },
    { id: "comprehensive", name: "التقارير الشاملة", icon: FileSpreadsheet }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">التقارير المتقدمة</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            طباعة
          </Button>
          <Button variant="outline" size="sm">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            تصدير Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">اختيار المشروع</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectSelector onProjectChange={(projectId) => {
              console.log('تم تغيير المشروع في التقارير المتقدمة:', projectId);
            }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">نوع التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedReportType} onValueChange={setSelectedReportType}>
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع التقرير" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">الفترة الزمنية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <input
                type="date"
                className="w-full p-2 border rounded"
                placeholder="من تاريخ"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
              <input
                type="date"
                className="w-full p-2 border rounded"
                placeholder="إلى تاريخ"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview">معاينة التقرير</TabsTrigger>
          <TabsTrigger value="settings">إعدادات التقرير</TabsTrigger>
          <TabsTrigger value="history">سجل التقارير</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>معاينة التقرير</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center text-gray-500 py-12">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>اختر نوع التقرير والمشروع لعرض المعاينة</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات التقرير</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">إعدادات مخصصة للتقارير - قيد التطوير</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>سجل التقارير المُنشأة</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">سجل التقارير السابقة - قيد التطوير</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}