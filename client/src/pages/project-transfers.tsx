import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertProjectFundTransferSchema } from "@shared/schema";
import type { InsertProjectFundTransfer, ProjectFundTransfer, Project } from "@shared/schema";
import { Plus, ArrowRight, Calendar, User, FileText, Edit, Banknote, Building, Trash2, ChartGantt, DollarSign, TrendingUp } from "lucide-react";
import { StatsCard, StatsGrid } from "@/components/ui/stats-card";
import ProjectSelector from "@/components/project-selector";
import { useSelectedProject } from "@/hooks/use-selected-project";
import { z } from "zod";
import { useFloatingButton } from "@/components/layout/floating-button-context";

type TransferFormData = z.infer<typeof insertProjectFundTransferSchema>;

export default function ProjectTransfers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<ProjectFundTransfer | null>(null);
  const { setFloatingAction } = useFloatingButton();
  const { selectedProjectId, selectProject } = useSelectedProject();

  // تعيين إجراء الزر العائم لإضافة تحويل جديد
  useEffect(() => {
    const handleAddTransfer = () => {
      setShowForm(true);
      setEditingTransfer(null);
    };
    
    setFloatingAction(handleAddTransfer, "إضافة عملية ترحيل");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // دالة مساعدة لحفظ القيم في autocomplete_data
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

  // جلب قائمة المشاريع
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // جلب قائمة عمليات الترحيل
  const { data: transfers = [], isLoading: transfersLoading } = useQuery<ProjectFundTransfer[]>({
    queryKey: ["/api/project-fund-transfers"],
  });

  // إنشاء أو تحديث عملية ترحيل
  const createTransferMutation = useMutation({
    mutationFn: async (data: InsertProjectFundTransfer) => {
      // حفظ القيم في autocomplete_data قبل العملية الأساسية
      await Promise.all([
        saveAutocompleteValue('transferReasons', data.transferReason),
        saveAutocompleteValue('projectTransferDescriptions', data.description)
      ]);
      
      if (editingTransfer) {
        return apiRequest(`/api/project-fund-transfers/${editingTransfer.id}`, "PUT", data);
      }
      return apiRequest("/api/project-fund-transfers", "POST", data);
    },
    onSuccess: async (newTransfer, variables) => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      // تحديث فوري للقائمة بدلاً من إعادة التحميل
      queryClient.setQueryData(["/api/project-fund-transfers"], (oldData: any[]) => {
        if (!oldData) return [newTransfer];
        
        if (editingTransfer) {
          // تحديث العنصر الموجود
          return oldData.map(transfer => 
            transfer.id === editingTransfer.id ? newTransfer : transfer
          );
        } else {
          // إضافة عنصر جديد
          return [newTransfer, ...oldData];
        }
      });
      
      // تحديث إحصائيات المشاريع في الخلفية
      queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
      
      toast({
        title: "تم بنجاح",
        description: editingTransfer ? "تم تحديث عملية ترحيل الأموال بنجاح" : "تم إنشاء عملية ترحيل الأموال بنجاح",
      });
      setShowForm(false);
      setEditingTransfer(null);
      form.reset();
    },
    onError: async (error: any, variables) => {
      // حفظ القيم في autocomplete_data حتى في حالة الخطأ
      await Promise.all([
        saveAutocompleteValue('transferReasons', variables.transferReason),
        saveAutocompleteValue('projectTransferDescriptions', variables.description)
      ]);
      
      // تحديث كاش autocomplete
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      toast({
        title: "خطأ",
        description: error.message || "فشل في حفظ عملية الترحيل",
        variant: "destructive",
      });
    },
  });

  // حذف عملية ترحيل
  const deleteTransferMutation = useMutation({
    mutationFn: (transferId: string) =>
      apiRequest(`/api/project-fund-transfers/${transferId}`, "DELETE"),
    onSuccess: (_, transferId) => {
      // حذف فوري من القائمة
      queryClient.setQueryData(["/api/project-fund-transfers"], (oldData: any[]) => {
        if (!oldData) return [];
        return oldData.filter(transfer => transfer.id !== transferId);
      });
      
      // تحديث إحصائيات المشاريع في الخلفية
      queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
      
      toast({
        title: "تم الحذف",
        description: "تم حذف عملية ترحيل الأموال بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في حذف عملية الترحيل",
        variant: "destructive",
      });
    },
  });

  // إعداد النموذج
  const form = useForm<TransferFormData>({
    resolver: zodResolver(insertProjectFundTransferSchema),
    defaultValues: {
      fromProjectId: "",
      toProjectId: "",
      amount: "",
      transferReason: "",
      transferDate: new Date().toISOString().split('T')[0],
      description: "",
    },
  });

  const onSubmit = (data: TransferFormData) => {
    createTransferMutation.mutate(data);
  };

  // بدء تعديل عملية ترحيل
  const startEdit = (transfer: ProjectFundTransfer) => {
    setEditingTransfer(transfer);
    form.reset({
      fromProjectId: transfer.fromProjectId,
      toProjectId: transfer.toProjectId,
      amount: transfer.amount,
      transferReason: transfer.transferReason || "",
      transferDate: transfer.transferDate,
      description: transfer.description || "",
    });
    setShowForm(true);
  };

  // إلغاء التعديل
  const cancelEdit = () => {
    setEditingTransfer(null);
    setShowForm(false);
    form.reset();
  };

  // حذف عملية ترحيل مع تأكيد
  const handleDelete = (transferId: string, fromProject: string, toProject: string) => {
    if (confirm(`هل أنت متأكد من حذف عملية الترحيل من ${fromProject} إلى ${toProject}؟`)) {
      deleteTransferMutation.mutate(transferId);
    }
  };

  // دالة لجلب اسم المشروع
  const getProjectName = (projectId: string) => {
    const project = projects.find((p: Project) => p.id === projectId);
    return project?.name || "غير محدد";
  };

  // فلترة عمليات الترحيل حسب المشروع المحدد
  const filteredTransfers = selectedProjectId && selectedProjectId !== 'all' 
    ? transfers.filter(transfer => 
        transfer.fromProjectId === selectedProjectId || transfer.toProjectId === selectedProjectId
      )
    : transfers;

  // حساب الإحصائيات
  const transferStats = {
    totalTransfers: filteredTransfers.length,
    totalAmount: filteredTransfers.reduce((sum, transfer) => sum + (parseFloat(transfer.amount?.toString() || '0') || 0), 0),
    outgoingTransfers: filteredTransfers.filter(t => t.fromProjectId === selectedProjectId).length,
    incomingTransfers: filteredTransfers.filter(t => t.toProjectId === selectedProjectId).length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' ريال';
  };

  return (
    <div className="container mx-auto py-6 px-4" dir="rtl">
      
      {/* مكون اختيار المشروع */}
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

      {/* إحصائيات عمليات الترحيل */}
      {selectedProjectId && selectedProjectId !== 'all' && (
        <StatsGrid>
          <StatsCard
            title="إجمالي العمليات"
            value={transferStats.totalTransfers.toString()}
            icon={ArrowRight}
            color="blue"
          />
          <StatsCard
            title="إجمالي المبالغ"
            value={formatCurrency(transferStats.totalAmount)}
            icon={DollarSign}
            color="green"
          />
          <StatsCard
            title="العمليات الصادرة"
            value={transferStats.outgoingTransfers.toString()}
            icon={TrendingUp}
            color="orange"
          />
          <StatsCard
            title="العمليات الواردة"
            value={transferStats.incomingTransfers.toString()}
            icon={TrendingUp}
            color="purple"
          />
        </StatsGrid>
      )}

      {/* نموذج إضافة عملية ترحيل جديدة */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>إضافة عملية ترحيل جديدة</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* المشروع المرسل */}
                  <FormField
                    control={form.control}
                    name="fromProjectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المشروع المرسل</FormLabel>
                        <FormControl>
                          <Select 
                            value={field.value} 
                            onValueChange={field.onChange}
                            data-testid="select-from-project"
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المشروع المرسل" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((project: Project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* المشروع المستلم */}
                  <FormField
                    control={form.control}
                    name="toProjectId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المشروع المستلم</FormLabel>
                        <FormControl>
                          <Select 
                            value={field.value} 
                            onValueChange={field.onChange}
                            data-testid="select-to-project"
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المشروع المستلم" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((project: Project) => (
                                <SelectItem key={project.id} value={project.id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* المبلغ */}
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المبلغ (ر.ي)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="أدخل المبلغ"
                            {...field}
                            data-testid="input-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* تاريخ الترحيل */}
                  <FormField
                    control={form.control}
                    name="transferDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ الترحيل</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            data-testid="input-transfer-date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* سبب الترحيل */}
                  <FormField
                    control={form.control}
                    name="transferReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سبب الترحيل</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="أدخل سبب الترحيل"
                            {...field}
                            value={field.value || ""}
                            data-testid="input-transfer-reason"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* وصف الترحيل */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وصف الترحيل (اختياري)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="أدخل وصف للترحيل"
                            {...field}
                            value={field.value || ""}
                            data-testid="textarea-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={createTransferMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-submit-transfer"
                  >
                    {createTransferMutation.isPending ? "جاري الحفظ..." : (editingTransfer ? "تحديث عملية الترحيل" : "حفظ عملية الترحيل")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={cancelEdit}
                    data-testid="button-cancel"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* قائمة عمليات الترحيل */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            سجل عمليات الترحيل
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transfersLoading ? (
            <div className="text-center py-8">
              <p>جاري تحميل عمليات الترحيل...</p>
            </div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {selectedProjectId && selectedProjectId !== 'all' 
                  ? "لا توجد عمليات ترحيل للمشروع المحدد"
                  : "لا توجد عمليات ترحيل مسجلة"
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransfers.map((transfer: ProjectFundTransfer) => (
                <Card key={transfer.id} className="relative overflow-hidden bg-gradient-to-r from-green-50 to-green-100 border-r-4 border-green-500 hover:shadow-lg transition-all duration-200" data-testid={`card-transfer-${transfer.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      {/* المحتوى الرئيسي */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* أيقونة دائرية */}
                        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                          ت
                        </div>
                        
                        {/* المعلومات */}
                        <div className="flex-1 min-w-0">
                          <div className="mb-1">
                            <h3 className="font-bold text-gray-800 text-xs break-words">
                              {getProjectName(transfer.fromProjectId)} → {getProjectName(transfer.toProjectId)}
                            </h3>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-500" />
                              <span className="text-gray-600">تاريخ التحويل</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Banknote className="w-3 h-3 text-green-600" />
                              <span className="text-gray-600">المبلغ المحول</span>
                            </div>
                            
                            <div className="font-medium text-gray-800 text-xs">
                              {new Date(transfer.transferDate).toLocaleDateString('en-GB')}
                            </div>
                            <div className="font-bold text-green-600 text-sm">
                              {parseFloat(transfer.amount).toLocaleString()} ر.ي
                            </div>
                          </div>
                          
                          {(transfer.transferReason || transfer.description) && (
                            <div className="mt-2 text-xs text-gray-600">
                              {transfer.transferReason && (
                                <div>السبب: {transfer.transferReason}</div>
                              )}
                              {transfer.description && (
                                <div className="truncate">ملاحظات: {transfer.description}</div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">
                              ID: {transfer.id.slice(0, 8)}
                            </span>
                            
                            {/* أزرار العمليات */}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => startEdit(transfer)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 w-7 h-7 p-0 border"
                                data-testid={`button-edit-${transfer.id}`}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(
                                  transfer.id, 
                                  getProjectName(transfer.fromProjectId), 
                                  getProjectName(transfer.toProjectId)
                                )}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 w-7 h-7 p-0 border"
                                disabled={deleteTransferMutation.isPending}
                                data-testid={`button-delete-${transfer.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}