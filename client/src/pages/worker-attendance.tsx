import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, Save, ChartGantt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import EnhancedWorkerCard from "@/components/enhanced-worker-card";
import { getCurrentDate, formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import type { Worker, InsertWorkerAttendance } from "@shared/schema";

interface AttendanceData {
  [workerId: string]: {
    isPresent: boolean;
    startTime?: string;
    endTime?: string;
    workDescription?: string;
    workDays?: number;
    paidAmount?: string;
    paymentType?: string;
  };
}

export default function WorkerAttendance() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject } = useSelectedProject();
  
  // Get URL parameters for editing
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get('edit');
  const workerId = urlParams.get('worker');
  const dateParam = urlParams.get('date');
  const [selectedDate, setSelectedDate] = useState(dateParam || getCurrentDate());
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({});
  
  // إعدادات مشتركة لجميع العمال
  const [bulkSettings, setBulkSettings] = useState({
    startTime: "07:00",
    endTime: "15:00",
    workDays: 1.0,
    paymentType: "partial",
    paidAmount: "",
    workDescription: ""
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  // تعيين إجراء الزر العائم لحفظ الحضور
  useEffect(() => {
    const handleFloatingSave = () => {
      // محاكاة كليك زر الحفظ
      const submitButton = document.querySelector('[type="submit"]') as HTMLButtonElement;
      submitButton?.click();
    };
    
    setFloatingAction(handleFloatingSave, "حفظ الحضور");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // دالة مساعدة لحفظ قيم الإكمال التلقائي
  const saveAutocompleteValue = async (category: string, value: string | null | undefined) => {
    if (!value || typeof value !== 'string' || !value.trim()) return;
    try {
      await apiRequest("/api/autocomplete", "POST", { 
        category, 
        value: value.trim() 
      });
    } catch (error) {
      // تجاهل الأخطاء لأن هذه عملية مساعدة
      console.log(`Failed to save autocomplete value for ${category}:`, error);
    }
  };

  // Get today's attendance records
  const { data: todayAttendance = [] } = useQuery({
    queryKey: ["/api/projects", selectedProjectId, "attendance", selectedDate],
    queryFn: () => apiRequest(`/api/projects/${selectedProjectId}/attendance?date=${selectedDate}`, "GET"),
    enabled: !!selectedProjectId,
  });

  // Fetch specific attendance record for editing
  const { data: attendanceToEdit } = useQuery({
    queryKey: ["/api/worker-attendance", editId],
    queryFn: () => apiRequest(`/api/worker-attendance/${editId}`, "GET"),
    enabled: !!editId,
  });

  // Effect to populate form when editing
  useEffect(() => {
    if (attendanceToEdit && workerId) {
      const newAttendanceData = { ...attendanceData };
      newAttendanceData[workerId] = {
        isPresent: true,
        startTime: attendanceToEdit.startTime,
        endTime: attendanceToEdit.endTime,
        workDescription: attendanceToEdit.workDescription || "",
        workDays: parseFloat(attendanceToEdit.workDays || '1.0'),
        paidAmount: attendanceToEdit.paidAmount?.toString() || "",
        paymentType: attendanceToEdit.paymentType || "partial"
      };
      setAttendanceData(newAttendanceData);
    }
  }, [attendanceToEdit, workerId]);

  // Delete Attendance Mutation
  const deleteAttendanceMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-attendance/${id}`, "DELETE"),
    onSuccess: () => {
      toast({
        title: "تم الحذف",
        description: "تم حذف سجل الحضور بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "attendance"] });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف سجل الحضور",
        variant: "destructive",
      });
    }
  });

  // Edit Attendance Function
  const handleEditAttendance = (record: any) => {
    const worker = Array.isArray(workers) ? workers.find(w => w.id === record.workerId) : null;
    if (worker) {
      const newAttendanceData = { ...attendanceData };
      newAttendanceData[record.workerId] = {
        isPresent: true,
        startTime: record.startTime,
        endTime: record.endTime,
        workDescription: record.workDescription || "",
        workDays: parseFloat(record.workDays || '1.0'),
        paidAmount: record.paidAmount,
        paymentType: record.paymentType || "partial"
      };
      setAttendanceData(newAttendanceData);
    }
  };

  const { data: workers = [], isLoading: workersLoading } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: async (attendanceRecords: InsertWorkerAttendance[]) => {
      console.log("Saving attendance records:", attendanceRecords);
      
      // حفظ قيم الإكمال التلقائي قبل العملية الأساسية
      const autocompletePromises = attendanceRecords.flatMap(record => [
        saveAutocompleteValue('workDescriptions', record.workDescription),
        saveAutocompleteValue('paymentTypes', record.paymentType)
      ]).filter(Boolean);
      
      if (autocompletePromises.length > 0) {
        await Promise.all(autocompletePromises);
      }
      
      // تنفيذ العملية الأساسية
      const promises = attendanceRecords.map(record =>
        apiRequest("/api/worker-attendance", "POST", record)
      );
      await Promise.all(promises);
      return attendanceRecords;
    },
    onSuccess: async (attendanceRecords) => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });

      toast({
        title: "تم الحفظ",
        description: "تم حفظ حضور العمال بنجاح",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "attendance"] });
      // مسح البيانات بعد الحفظ
      setAttendanceData({});
    },
    onError: async (error: any, attendanceRecords) => {
      // حفظ قيم الإكمال التلقائي حتى في حالة الخطأ
      const autocompletePromises = attendanceRecords.flatMap(record => [
        saveAutocompleteValue('workDescriptions', record.workDescription),
        saveAutocompleteValue('paymentTypes', record.paymentType)
      ]).filter(Boolean);
      
      if (autocompletePromises.length > 0) {
        await Promise.all(autocompletePromises);
        // تحديث كاش autocomplete
        queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      }

      console.error("Error saving attendance:", error);
      let errorMessage = "حدث خطأ أثناء حفظ الحضور";
      
      // التحقق من رسالة الخطأ المحددة
      if (error?.response?.data?.error || error?.message) {
        const serverError = error?.response?.data?.error || error?.message;
        if (serverError.includes("تم تسجيل حضور هذا العامل مسبقاً")) {
          errorMessage = "تم تسجيل حضور هذا العامل مسبقاً في هذا التاريخ";
        } else {
          errorMessage = serverError;
        }
      }
      
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleAttendanceChange = (workerId: string, attendance: AttendanceData[string]) => {
    setAttendanceData(prev => ({
      ...prev,
      [workerId]: attendance,
    }));
  };

  // تطبيق الإعدادات المشتركة على جميع العمال المحددين
  const applyBulkSettings = () => {
    const newAttendanceData = { ...attendanceData };
    
    console.log("=== تطبيق الإعدادات المشتركة ===");
    console.log("الإعدادات المشتركة:", bulkSettings);
    
    Object.keys(newAttendanceData).forEach(workerId => {
      if (newAttendanceData[workerId].isPresent) {
        console.log(`تطبيق الإعدادات على العامل ${workerId}`);
        console.log(`المبلغ المدفوع من الإعدادات: "${bulkSettings.paidAmount}"`);
        
        newAttendanceData[workerId] = {
          ...newAttendanceData[workerId],
          startTime: bulkSettings.startTime,
          endTime: bulkSettings.endTime,
          workDays: bulkSettings.workDays,
          paymentType: bulkSettings.paymentType,
          paidAmount: bulkSettings.paidAmount,
          workDescription: bulkSettings.workDescription
        };
        
        console.log("البيانات بعد التطبيق:", newAttendanceData[workerId]);
      }
    });
    
    setAttendanceData(newAttendanceData);
    
    toast({
      title: "تم التطبيق",
      description: "تم تطبيق الإعدادات على جميع العمال المحددين",
    });
  };

  // تحديد/إلغاء تحديد جميع العمال
  const toggleAllWorkers = (isPresent: boolean) => {
    const newAttendanceData: AttendanceData = {};
    
    console.log("=== تحديد جميع العمال ===");
    console.log("حالة الحضور:", isPresent);
    console.log("الإعدادات المشتركة:", bulkSettings);
    
    workers.forEach(worker => {
      if (isPresent) {
        console.log(`إضافة العامل ${worker.name} بالمبلغ: "${bulkSettings.paidAmount}"`);
        newAttendanceData[worker.id] = {
          isPresent: true,
          startTime: bulkSettings.startTime,
          endTime: bulkSettings.endTime,
          workDays: bulkSettings.workDays,
          paymentType: bulkSettings.paymentType,
          paidAmount: bulkSettings.paidAmount,
          workDescription: bulkSettings.workDescription
        };
      } else {
        newAttendanceData[worker.id] = {
          isPresent: false
        };
      }
    });
    
    console.log("البيانات النهائية:", newAttendanceData);
    setAttendanceData(newAttendanceData);
  };

  const handleSaveAttendance = () => {
    if (!selectedProjectId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار المشروع أولاً",
        variant: "destructive",
      });
      return;
    }

    console.log("=== تصحيح الأخطاء - بيانات الحضور قبل الحفظ ===");
    console.log("attendanceData:", attendanceData);

    const attendanceRecords: InsertWorkerAttendance[] = Object.entries(attendanceData)
      .filter(([_, data]) => data.isPresent)
      .map(([workerId, data]) => {
        const worker = workers.find(w => w.id === workerId);
        const dailyWage = parseFloat(worker?.dailyWage || "0");
        const workDays = data.workDays || 1.0;
        const actualWage = dailyWage * workDays;
        const paidAmount = parseFloat(data.paidAmount || "0");
        const remainingAmount = data.paymentType === 'credit' ? actualWage : (actualWage - paidAmount);
        
        console.log(`العامل ${worker?.name}:`);
        console.log(`  - المبلغ من البيانات: "${data.paidAmount}"`);
        console.log(`  - المبلغ بعد التحويل: ${paidAmount}`);
        console.log(`  - نوع الدفع: ${data.paymentType}`);
        
        return {
          projectId: selectedProjectId,
          workerId,
          date: selectedDate,
          startTime: data.startTime || "07:00",
          endTime: data.endTime || "15:00",
          workDescription: data.workDescription || "",
          isPresent: true,
          workDays: workDays,
          dailyWage: worker?.dailyWage || "0",
          paidAmount: paidAmount.toString(),
          remainingAmount: remainingAmount.toString(),
          paymentType: data.paymentType || "partial",
        };
      });

    if (attendanceRecords.length === 0) {
      toast({
        title: "تنبيه",
        description: "لم يتم تحديد أي عامل كحاضر",
        variant: "destructive",
      });
      return;
    }

    saveAttendanceMutation.mutate(attendanceRecords);
  };

  return (
    <div className="p-4 slide-in">

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

      {/* Date Selection */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <Label className="block text-sm font-medium text-foreground mb-2">التاريخ</Label>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {/* الإعدادات المشتركة */}
      {workers.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">الإعدادات المشتركة</h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleAllWorkers(true)}
                  className="text-xs"
                >
                  تحديد الكل
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleAllWorkers(false)}
                  className="text-xs"
                >
                  إلغاء الكل
                </Button>
                <Button
                  size="sm"
                  onClick={applyBulkSettings}
                  className="text-xs"
                >
                  تطبيق على المحدد
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div>
                <Label className="text-xs text-muted-foreground">وقت البدء</Label>
                <Input
                  type="time"
                  value={bulkSettings.startTime}
                  onChange={(e) => setBulkSettings(prev => ({ ...prev, startTime: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">وقت الانتهاء</Label>
                <Input
                  type="time"
                  value={bulkSettings.endTime}
                  onChange={(e) => setBulkSettings(prev => ({ ...prev, endTime: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">عدد الأيام</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0.1"
                  max="2.0"
                  value={bulkSettings.workDays}
                  onChange={(e) => setBulkSettings(prev => ({ ...prev, workDays: parseFloat(e.target.value) || 1.0 }))}
                  className="mt-1 arabic-numbers"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">نوع الدفع</Label>
                <Select
                  value={bulkSettings.paymentType}
                  onValueChange={(value) => setBulkSettings(prev => ({ ...prev, paymentType: value }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">دفع كامل</SelectItem>
                    <SelectItem value="partial">دفع جزئي</SelectItem>
                    <SelectItem value="credit">على الحساب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {bulkSettings.paymentType !== "credit" && (
                <div>
                  <Label className="text-xs text-muted-foreground">المبلغ المدفوع</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={bulkSettings.paidAmount}
                    onChange={(e) => setBulkSettings(prev => ({ ...prev, paidAmount: e.target.value }))}
                    className="mt-1 arabic-numbers"
                  />
                </div>
              )}
              <div>
                <Label className="text-xs text-muted-foreground">وصف العمل</Label>
                <AutocompleteInput
                  value={bulkSettings.workDescription}
                  onChange={(value) => setBulkSettings(prev => ({ ...prev, workDescription: value }))}
                  placeholder="اكتب وصف العمل..."
                  category="workDescriptions"
                  className="mt-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Worker List */}
      {workersLoading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">جاري تحميل العمال...</p>
        </div>
      ) : workers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">لا توجد عمال مسجلين</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.isArray(workers) ? workers.map((worker) => (
            <EnhancedWorkerCard
              key={worker.id}
              worker={worker}
              attendance={attendanceData[worker.id] || { isPresent: false }}
              onAttendanceChange={(attendance) => handleAttendanceChange(worker.id, attendance)}
            />
          )) : null}
        </div>
      )}

      {/* Save Button */}
      {workers.length > 0 && (
        <div className="mt-6">
          <Button
            onClick={handleSaveAttendance}
            disabled={saveAttendanceMutation.isPending}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Save className="ml-2 h-4 w-4" />
            {saveAttendanceMutation.isPending ? "جاري الحفظ..." : "حفظ الحضور"}
          </Button>
        </div>
      )}

      {/* Today's Attendance List */}
      {selectedProjectId && todayAttendance.length > 0 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4">حضور اليوم المسجل ({selectedDate})</h3>
            <div className="space-y-3">
              {todayAttendance.map((record: any) => {
                const worker = workers.find(w => w.id === record.workerId);
                return (
                  <div key={record.id} className="border rounded-lg p-3 bg-card">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-foreground">{worker?.name}</span>
                          <span className="text-xs bg-success text-success-foreground px-2 py-1 rounded">حاضر</span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>الوقت: {record.startTime} - {record.endTime}</p>
                          <p>الراتب اليومي: {record.dailyWage} ر.ي</p>
                          <p>المدفوع: {record.paidAmount} ر.ي | المتبقي: {record.remainingAmount} ر.ي</p>
                          {record.workDescription && <p>الوصف: {record.workDescription}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditAttendance(record)}
                        >
                          تعديل
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteAttendanceMutation.mutate(record.id)}
                          disabled={deleteAttendanceMutation.isPending}
                        >
                          حذف
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
