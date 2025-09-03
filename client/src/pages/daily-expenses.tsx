/**
 * الوصف: صفحة إدارة المصاريف اليومية والتحويلات المالية
 * المدخلات: تاريخ محدد ومعرف المشروع
 * المخرجات: عرض وإدارة جميع المصاريف والتحويلات اليومية
 * المالك: عمار
 * آخر تعديل: 2025-08-20
 * الحالة: نشط - الصفحة الأساسية لإدارة المصاريف
 */

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, Save, Users, Car, Plus, Edit2, Trash2, ChevronDown, ChevronUp, ArrowLeftRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import ExpenseSummary from "@/components/expense-summary";
import WorkerMiscExpenses from "./worker-misc-expenses";
import { getCurrentDate, formatCurrency, formatDate } from "@/lib/utils";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { apiRequest } from "@/lib/queryClient";
import { useFloatingButton } from "@/components/layout/floating-button-context";
import type { 
  WorkerAttendance, 
  TransportationExpense, 
  FundTransfer,
  MaterialPurchase,
  WorkerTransfer,
  Worker,
  Project,
  InsertFundTransfer,
  InsertTransportationExpense,
  InsertDailyExpenseSummary,
  ProjectFundTransfer 
} from "@shared/schema";

// Error Boundary Component
function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 m-4">
      <div className="flex items-center mb-3">
        <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center ml-2">
          <span className="text-red-600 text-sm">!</span>
        </div>
        <h3 className="font-medium">حدث خطأ في تحميل الصفحة</h3>
      </div>
      <details className="mb-3">
        <summary className="cursor-pointer text-sm">تفاصيل الخطأ</summary>
        <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">{error.message}</pre>
      </details>
      <Button onClick={resetErrorBoundary} size="sm" variant="outline" className="border-red-300">
        <RefreshCw className="h-4 w-4 ml-1" />
        إعادة المحاولة
      </Button>
    </div>
  );
}

class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} resetErrorBoundary={() => this.setState({ hasError: false, error: null })} />;
    }

    return this.props.children;
  }
}

function DailyExpensesContent() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject } = useSelectedProject();
  const [selectedDate, setSelectedDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [carriedForward, setCarriedForward] = useState<string>("0");
  const [showProjectTransfers, setShowProjectTransfers] = useState<boolean>(true);
  
  // Fund transfer form
  const [fundAmount, setFundAmount] = useState<string>("");
  const [senderName, setSenderName] = useState<string>("");
  const [transferNumber, setTransferNumber] = useState<string>("");
  const [transferType, setTransferType] = useState<string>("");
  const [editingFundTransferId, setEditingFundTransferId] = useState<string | null>(null);
  
  // Transportation expense form
  const [transportDescription, setTransportDescription] = useState<string>("");
  const [transportAmount, setTransportAmount] = useState<string>("");
  const [transportNotes, setTransportNotes] = useState<string>("");
  const [editingTransportationId, setEditingTransportationId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { setFloatingAction } = useFloatingButton();

  // دالة مساعدة لحفظ قيم الإكمال التلقائي
  const saveAutocompleteValue = async (field: string, value: string) => {
    if (!value || value.trim().length < 2) return;
    
    try {
      // التحقق من أن endpoint autocomplete موجود قبل المحاولة
      const response = await fetch('/api/autocomplete', { method: 'HEAD' });
      if (!response.ok) {
        console.warn(`Autocomplete endpoint not available for ${field}`);
        return;
      }
      
      await apiRequest('/api/autocomplete', 'POST', {
        category: field,
        value: value.trim(),
        usageCount: 1
      });
      console.log(`✅ تم حفظ قيمة الإكمال التلقائي: ${field} = ${value.trim()}`);
    } catch (error) {
      console.warn(`Failed to save autocomplete value for ${field}:`, error);
      // تجاهل الخطأ دون مقاطعة التطبيق
    }
  };

  // تعيين إجراء الزر العائم لحفظ المصاريف
  useEffect(() => {
    const handleSaveExpenses = () => {
      // محاكاة كليك زر الحفظ
      const saveButton = document.querySelector('[type="submit"]') as HTMLButtonElement;
      if (saveButton) {
        saveButton.click();
      }
    };
    
    setFloatingAction(handleSaveExpenses, "حفظ المصاريف");
    return () => setFloatingAction(null);
  }, [setFloatingAction]);

  // دالة لحفظ جميع قيم الإكمال التلقائي للحولة
  const saveAllFundTransferAutocompleteValues = async () => {
    const promises = [];
    
    if (senderName && senderName.trim().length >= 2) {
      promises.push(saveAutocompleteValue('senderNames', senderName));
    }
    
    if (transferNumber && transferNumber.trim().length >= 1) {
      promises.push(saveAutocompleteValue('transferNumbers', transferNumber));
    }
    
    if (transferType && transferType.trim().length >= 2) {
      promises.push(saveAutocompleteValue('transferTypes', transferType));
    }
    
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  };

  const { data: workers = [] } = useQuery<Worker[]>({
    queryKey: ["/api/workers"],
  });

  // جلب قائمة المشاريع لعرض أسماء المشاريع في ترحيل الأموال
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: todayAttendance = [] } = useQuery<WorkerAttendance[]>({
    queryKey: ["/api/projects", selectedProjectId, "attendance", selectedDate],
    queryFn: async () => {
      const response = await apiRequest(`/api/projects/${selectedProjectId}/attendance?date=${selectedDate}`, "GET");
      return Array.isArray(response) ? response as WorkerAttendance[] : [];
    },
    enabled: !!selectedProjectId,
  });

  const { data: todayTransportation = [] } = useQuery<TransportationExpense[]>({
    queryKey: ["/api/projects", selectedProjectId, "transportation-expenses", selectedDate],
    queryFn: async () => {
      const response = await apiRequest(`/api/projects/${selectedProjectId}/transportation-expenses?date=${selectedDate}`, "GET");
      return Array.isArray(response) ? response as TransportationExpense[] : [];
    },
    enabled: !!selectedProjectId,
  });

  const { data: todayMaterialPurchases = [], refetch: refetchMaterialPurchases } = useQuery({
    queryKey: ["/api/projects", selectedProjectId, "material-purchases", selectedDate],
    queryFn: async () => {
      const response = await apiRequest(`/api/projects/${selectedProjectId}/material-purchases?dateFrom=${selectedDate}&dateTo=${selectedDate}`, "GET");
      console.log("Material purchases response:", response);
      return Array.isArray(response) ? response as any[] : [];
    },
    enabled: !!selectedProjectId,
  });

  // جلب معلومات المواد مع معالجة آمنة للأخطاء
  const { data: materials = [] } = useQuery({
    queryKey: ["/api/materials"],
    queryFn: async () => {
      try {
        const response = await apiRequest("/api/materials", "GET");
        // التأكد من أن النتيجة مصفوفة
        if (response && response.data && Array.isArray(response.data)) {
          return response.data;
        }
        // إذا لم تكن مصفوفة، أرجع مصفوفة فارغة
        return [];
      } catch (error) {
        console.warn('⚠️ لم يتمكن من جلب المواد، استخدام قائمة فارغة:', error);
        return [];
      }
    },
    staleTime: 300000, // 5 دقائق
    gcTime: 600000, // 10 دقائق
  });

  const { data: todayWorkerTransfers = [], refetch: refetchWorkerTransfers } = useQuery({
    queryKey: ["/api/worker-transfers", selectedProjectId, selectedDate],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/worker-transfers?projectId=${selectedProjectId}&date=${selectedDate}`, "GET");
        return Array.isArray(response) ? response as WorkerTransfer[] : [];
      } catch (error) {
        console.error("Error fetching worker transfers:", error);
        return [];
      }
    },
    enabled: !!selectedProjectId,
  });

  const { data: todayMiscExpenses = [] } = useQuery({
    queryKey: ["/api/worker-misc-expenses", selectedProjectId, selectedDate],
    queryFn: async () => {
      try {
        const response = await apiRequest(`/api/worker-misc-expenses?projectId=${selectedProjectId}&date=${selectedDate}`, "GET");
        return Array.isArray(response) ? response : [];
      } catch (error) {
        console.error("Error fetching misc expenses:", error);
        return [];
      }
    },
    enabled: !!selectedProjectId,
  });

  // جلب عمليات ترحيل الأموال بين المشاريع مع أسماء المشاريع
  const { data: projectTransfers = [] } = useQuery<(ProjectFundTransfer & { fromProjectName?: string; toProjectName?: string })[]>({
    queryKey: ["/api/project-fund-transfers", selectedProjectId, selectedDate],
    queryFn: async () => {
      const response = await apiRequest(`/api/project-fund-transfers?date=${selectedDate}`, "GET");
      if (!Array.isArray(response)) return [];
      
      const filteredTransfers = response.filter((transfer: ProjectFundTransfer) => 
        transfer.fromProjectId === selectedProjectId || transfer.toProjectId === selectedProjectId
      );
      
      // إضافة أسماء المشاريع
      return filteredTransfers.map((transfer: ProjectFundTransfer) => ({
        ...transfer,
        fromProjectName: projects.find(p => p.id === transfer.fromProjectId)?.name || 'مشروع غير معروف',
        toProjectName: projects.find(p => p.id === transfer.toProjectId)?.name || 'مشروع غير معروف'
      }));
    },
    enabled: !!selectedProjectId && showProjectTransfers && projects.length > 0,
    staleTime: 60000, // البيانات صالحة لدقيقة واحدة
    gcTime: 300000, // الاحتفاظ بالذاكرة لـ 5 دقائق
  });

  const { data: todayFundTransfers = [], refetch: refetchFundTransfers, isLoading: fundTransfersLoading } = useQuery({
    queryKey: ["/api/projects", selectedProjectId, "fund-transfers", selectedDate],
    queryFn: async () => {
      if (!selectedProjectId || !selectedDate) {
        return [];
      }
      
      const response = await apiRequest(`/api/projects/${selectedProjectId}/fund-transfers?date=${selectedDate}`, "GET");
      return Array.isArray(response) ? response as FundTransfer[] : [];
    },
    enabled: !!selectedProjectId && !!selectedDate,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 30000, // البيانات صالحة لـ30 ثانية
    gcTime: 60000, // الاحتفاظ بالذاكرة لدقيقة واحدة
  });

  // جلب الرصيد المتبقي من اليوم السابق
  const { data: previousBalance } = useQuery({
    queryKey: ["/api/projects", selectedProjectId, "previous-balance", selectedDate],
    queryFn: async () => {
      const response = await apiRequest(`/api/projects/${selectedProjectId}/previous-balance/${selectedDate}`, "GET");
      return response?.balance || "0";
    },
    enabled: !!selectedProjectId && !!selectedDate,
  });

  // تحديث المبلغ المرحل تلقائياً عند جلب الرصيد السابق
  useEffect(() => {
    if (previousBalance) {
      setCarriedForward(previousBalance);
    }
  }, [previousBalance]);

  // تهيئة قيم الإكمال التلقائي الافتراضية لنوع التحويل
  useEffect(() => {
    const initializeDefaultTransferTypes = async () => {
      const defaultTypes = ['حولة بنكية', 'تسليم يدوي', 'صراف آلي', 'تحويل داخلي', 'شيك', 'نقدية'];
      
      for (const type of defaultTypes) {
        try {
          await saveAutocompleteValue('transferTypes', type);
        } catch (error) {
          // تجاهل الأخطاء بهدوء
          console.log(`Type ${type} initialization skipped:`, error);
        }
      }
    };

    // تهيئة القيم مرة واحدة فقط عند تحميل المكون
    initializeDefaultTransferTypes();
  }, []);

  const addFundTransferMutation = useMutation({
    mutationFn: async (data: InsertFundTransfer) => {
      // حفظ جميع قيم الإكمال التلقائي قبل العملية الأساسية
      await saveAllFundTransferAutocompleteValues();
      
      // تنفيذ العملية الأساسية
      return apiRequest("/api/fund-transfers", "POST", data);
    },
    onSuccess: async (newTransfer) => {
      // تحديث فوري للقائمة
      queryClient.setQueryData(["/api/projects", selectedProjectId, "fund-transfers", selectedDate], (oldData: any[]) => {
        if (!oldData) return [newTransfer];
        return [newTransfer, ...oldData];
      });
      
      toast({
        title: "تم إضافة العهدة",
        description: "تم إضافة تحويل العهدة بنجاح",
      });
      
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      // تنظيف النموذج
      setFundAmount("");
      setSenderName("");
      setTransferNumber("");
      setTransferType("");
    },
    onError: async (error: any) => {
      // حفظ جميع قيم الإكمال التلقائي حتى في حالة الخطأ
      await saveAllFundTransferAutocompleteValues();
      
      // تحديث كاش autocomplete
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      console.error("خطأ في إضافة الحولة:", error);
      
      let errorMessage = "حدث خطأ أثناء إضافة الحولة";
      
      // معالجة أنواع مختلفة من الأخطاء
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: "فشل في إضافة الحولة",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const addTransportationMutation = useMutation({
    mutationFn: async (data: InsertTransportationExpense) => {
      // حفظ قيم الإكمال التلقائي قبل العملية الأساسية
      await Promise.all([
        saveAutocompleteValue('transportDescriptions', transportDescription),
        saveAutocompleteValue('notes', transportNotes)
      ]);
      
      // تنفيذ العملية الأساسية
      return apiRequest("/api/transportation-expenses", "POST", data);
    },
    onSuccess: async (newExpense) => {
      // تحديث فوري للقائمة
      queryClient.setQueryData(["/api/projects", selectedProjectId, "transportation-expenses", selectedDate], (oldData: any[]) => {
        if (!oldData) return [newExpense];
        return [newExpense, ...oldData];
      });
      
      toast({
        title: "تم إضافة المواصلات",
        description: "تم إضافة مصروف المواصلات بنجاح",
      });
      
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      // تنظيف النموذج
      setTransportDescription("");
      setTransportAmount("");
      setTransportNotes("");
    },
    onError: async (error) => {
      // حفظ قيم الإكمال التلقائي حتى في حالة الخطأ
      await Promise.all([
        saveAutocompleteValue('transportDescriptions', transportDescription),
        saveAutocompleteValue('notes', transportNotes)
      ]);
      
      // تحديث كاش autocomplete
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      toast({
        title: "خطأ في إضافة المواصلات",
        description: error?.message || "حدث خطأ أثناء إضافة مصروف المواصلات",
        variant: "destructive",
      });
    },
  });

  const saveDailySummaryMutation = useMutation({
    mutationFn: (data: InsertDailyExpenseSummary) => apiRequest("/api/daily-expense-summaries", "POST", data),
    onSuccess: () => {
      toast({
        title: "تم الحفظ",
        description: "تم حفظ ملخص المصروفات اليومية بنجاح",
      });
      
      // تحديث ملخص اليوم
      queryClient.invalidateQueries({ 
        queryKey: ["/api/projects", selectedProjectId, "daily-summary", selectedDate] 
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ الملخص",
        variant: "destructive",
      });
    },
  });

  // Delete mutations
  const deleteFundTransferMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/fund-transfers/${id}`, "DELETE"),
    onSuccess: (_, id) => {
      // حذف فوري من القائمة
      queryClient.setQueryData(["/api/projects", selectedProjectId, "fund-transfers", selectedDate], (oldData: any[]) => {
        if (!oldData) return [];
        return oldData.filter(transfer => transfer.id !== id);
      });
      toast({ title: "تم الحذف", description: "تم حذف العهدة بنجاح" });
    },
    onError: (error: any) => {
      console.error("خطأ في حذف الحولة:", error);
      
      let errorMessage = "حدث خطأ أثناء حذف الحولة";
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({ 
        title: "فشل في حذف الحولة", 
        description: errorMessage, 
        variant: "destructive" 
      });
    }
  });

  const deleteTransportationMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/transportation-expenses/${id}`, "DELETE"),
    onSuccess: (_, id) => {
      // حذف فوري من القائمة
      queryClient.setQueryData(["/api/projects", selectedProjectId, "transportation-expenses", selectedDate], (oldData: any[]) => {
        if (!oldData) return [];
        return oldData.filter(expense => expense.id !== id);
      });
      toast({ title: "تم الحذف", description: "تم حذف مصروف المواصلات بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "حدث خطأ أثناء حذف المصروف", variant: "destructive" });
    }
  });

  const deleteMaterialPurchaseMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/material-purchases/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "material-purchases"] });
      toast({ title: "تم الحذف", description: "تم حذف شراء المواد بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "حدث خطأ أثناء حذف الشراء", variant: "destructive" });
    }
  });

  const deleteWorkerAttendanceMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/worker-attendance/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", selectedProjectId, "attendance"] });
      toast({ title: "تم الحذف", description: "تم حذف حضور العامل بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ", description: "حدث خطأ أثناء حذف الحضور", variant: "destructive" });
    }
  });

  // Fund Transfer Update Mutation
  const updateFundTransferMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/fund-transfers/${id}`, "PUT", data),
    onSuccess: async (updatedTransfer, { id }) => {
      // تحديث فوري للقائمة
      queryClient.setQueryData(["/api/projects", selectedProjectId, "fund-transfers", selectedDate], (oldData: any[]) => {
        if (!oldData) return [updatedTransfer];
        return oldData.map(transfer => transfer.id === id ? updatedTransfer : transfer);
      });
      
      // حفظ قيم الإكمال التلقائي
      if (senderName) await saveAutocompleteValue('senderNames', senderName);
      if (transferNumber) await saveAutocompleteValue('transferNumbers', transferNumber);
      
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      resetFundTransferForm();
      toast({
        title: "تم التحديث",
        description: "تم تحديث العهدة بنجاح",
      });
    },
    onError: (error: any) => {
      console.error("خطأ في تحديث الحولة:", error);
      
      let errorMessage = "حدث خطأ أثناء تحديث الحولة";
      
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "فشل في تحديث الحولة",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const resetFundTransferForm = () => {
    setFundAmount("");
    setSenderName("");
    setTransferNumber("");
    setTransferType("");
    setEditingFundTransferId(null);
  };

  const handleEditFundTransfer = (transfer: FundTransfer) => {
    setFundAmount(transfer.amount);
    setSenderName(transfer.senderName || "");
    setTransferNumber(transfer.transferNumber || "");
    setTransferType(transfer.transferType);
    setEditingFundTransferId(transfer.id);
  };

  const handleAddFundTransfer = () => {
    // التحقق من البيانات المطلوبة
    if (!selectedProjectId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار المشروع أولاً",
        variant: "destructive",
      });
      return;
    }

    if (!fundAmount || fundAmount.trim() === "" || parseFloat(fundAmount) <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    if (!transferType || transferType.trim() === "") {
      toast({
        title: "خطأ",
        description: "يرجى اختيار نوع التحويل",
        variant: "destructive",
      });
      return;
    }

    const transferData = {
      projectId: selectedProjectId,
      amount: fundAmount.toString(),
      senderName: senderName.trim() || "غير محدد",
      transferNumber: transferNumber.trim() || null,
      transferType: transferType,
      transferDate: new Date(selectedDate + 'T12:00:00.000Z'),
      notes: "",
    };

    if (editingFundTransferId) {
      updateFundTransferMutation.mutate({
        id: editingFundTransferId,
        data: transferData
      });
    } else {
      addFundTransferMutation.mutate(transferData);
    }
  };

  // Transportation Update Mutation
  const updateTransportationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/transportation-expenses/${id}`, "PUT", data),
    onSuccess: async (updatedExpense, { id }) => {
      // تحديث فوري للقائمة
      queryClient.setQueryData(["/api/projects", selectedProjectId, "transportation-expenses", selectedDate], (oldData: any[]) => {
        if (!oldData) return [updatedExpense];
        return oldData.map(expense => expense.id === id ? updatedExpense : expense);
      });
      
      // حفظ قيم الإكمال التلقائي
      if (transportDescription) await saveAutocompleteValue('transportDescriptions', transportDescription);
      if (transportNotes) await saveAutocompleteValue('notes', transportNotes);
      
      resetTransportationForm();
      toast({
        title: "تم التحديث",
        description: "تم تحديث مصروف المواصلات بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المصروف",
        variant: "destructive",
      });
    }
  });

  const resetTransportationForm = () => {
    setTransportDescription("");
    setTransportAmount("");
    setTransportNotes("");
    setEditingTransportationId(null);
  };

  const handleEditTransportation = (expense: TransportationExpense) => {
    setTransportDescription(expense.description);
    setTransportAmount(expense.amount);
    setTransportNotes(expense.notes || "");
    setEditingTransportationId(expense.id);
  };

  const handleAddTransportation = () => {
    if (!selectedProjectId || !transportDescription || !transportAmount) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const transportData = {
      projectId: selectedProjectId,
      amount: transportAmount,
      description: transportDescription,
      date: selectedDate,
      notes: transportNotes,
    };

    if (editingTransportationId) {
      updateTransportationMutation.mutate({
        id: editingTransportationId,
        data: transportData
      });
    } else {
      addTransportationMutation.mutate(transportData);
    }
  };

  const calculateTotals = () => {
    // إنشاء متغيرات آمنة لجميع البيانات
    const safeAttendance = Array.isArray(todayAttendance) ? todayAttendance : [];
    const safeTransportation = Array.isArray(todayTransportation) ? todayTransportation : [];
    const safeMaterialPurchases = Array.isArray(todayMaterialPurchases) ? todayMaterialPurchases : [];
    const safeWorkerTransfers = Array.isArray(todayWorkerTransfers) ? todayWorkerTransfers : [];
    const safeMiscExpenses = Array.isArray(todayMiscExpenses) ? todayMiscExpenses : [];
    const safeFundTransfers = Array.isArray(todayFundTransfers) ? todayFundTransfers : [];
    const safeProjectTransfers = Array.isArray(projectTransfers) ? projectTransfers : [];

    const totalWorkerWages = safeAttendance.reduce(
      (sum, attendance) => sum + parseFloat(attendance.paidAmount || "0"), 
      0
    );
    
    const totalTransportation = safeTransportation.reduce(
      (sum, expense) => sum + parseFloat(expense.amount || "0"), 
      0
    );
    
    // حساب المشتريات النقدية فقط
    const totalMaterialCosts = safeMaterialPurchases
      .filter(purchase => purchase.purchaseType === "نقد")
      .reduce((sum, purchase) => sum + parseFloat(purchase.totalAmount || "0"), 0);
    
    const totalWorkerTransfers = safeWorkerTransfers.reduce(
      (sum, transfer) => sum + parseFloat(transfer.amount || "0"), 0);
    
    const totalMiscExpenses = safeMiscExpenses.reduce(
      (sum, expense) => sum + parseFloat(expense.amount || "0"), 0);
    
    const totalFundTransfers = safeFundTransfers.reduce(
      (sum, transfer) => sum + parseFloat(transfer.amount || "0"), 0);
    
    // حساب الأموال الواردة والصادرة من ترحيل المشاريع
    const incomingProjectTransfers = safeProjectTransfers
      .filter(transfer => transfer.toProjectId === selectedProjectId)
      .reduce((sum, transfer) => sum + parseFloat(transfer.amount || "0"), 0);
    
    const outgoingProjectTransfers = safeProjectTransfers
      .filter(transfer => transfer.fromProjectId === selectedProjectId)
      .reduce((sum, transfer) => sum + parseFloat(transfer.amount || "0"), 0);
    
    const carriedAmount = parseFloat(carriedForward) || 0;
    
    const totalIncome = carriedAmount + totalFundTransfers + incomingProjectTransfers;
    const totalExpenses = totalWorkerWages + totalTransportation + totalMaterialCosts + 
                          totalWorkerTransfers + totalMiscExpenses + outgoingProjectTransfers;
    const remainingBalance = totalIncome - totalExpenses;

    return {
      totalWorkerWages,
      totalTransportation,
      totalMaterialCosts,
      totalWorkerTransfers,
      totalMiscExpenses,
      totalFundTransfers,
      incomingProjectTransfers,
      outgoingProjectTransfers,
      totalIncome,
      totalExpenses,
      remainingBalance,
    };
  };

  const handleSaveSummary = () => {
    if (!selectedProjectId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار المشروع أولاً",
        variant: "destructive",
      });
      return;
    }

    const totals = calculateTotals();

    saveDailySummaryMutation.mutate({
      projectId: selectedProjectId,
      date: selectedDate,
      carriedForwardAmount: carriedForward,
      totalFundTransfers: totals.totalFundTransfers.toString(),
      totalWorkerWages: totals.totalWorkerWages.toString(),
      totalMaterialCosts: totals.totalMaterialCosts.toString(),
      totalTransportationCosts: totals.totalTransportation.toString(),

      totalIncome: totals.totalIncome.toString(),
      totalExpenses: totals.totalExpenses.toString(),
      remainingBalance: totals.remainingBalance.toString(),
    });
  };

  const totals = calculateTotals();

  // حساب مؤشرات البيانات المتوفرة
  const dataIndicators = {
    fundTransfers: todayFundTransfers.length > 0,
    attendance: todayAttendance.length > 0,
    transportation: todayTransportation.length > 0,
    materials: Array.isArray(todayMaterialPurchases) && todayMaterialPurchases.length > 0,
    workerTransfers: Array.isArray(todayWorkerTransfers) && todayWorkerTransfers.length > 0,
    miscExpenses: Array.isArray(todayMiscExpenses) && todayMiscExpenses.length > 0
  };

  const totalDataSections = Object.keys(dataIndicators).length;
  const sectionsWithData = Object.values(dataIndicators).filter(Boolean).length;

  return (
    <div className="p-4 slide-in">

      <ProjectSelector
        selectedProjectId={selectedProjectId}
        onProjectChange={(projectId, projectName) => selectProject(projectId, projectName)}
      />

      {/* Data Overview Indicator */}
      {selectedProjectId && (
        <Card className={`mb-3 border-l-4 ${
          sectionsWithData === 0 
            ? 'border-l-amber-400 bg-amber-50/30' 
            : sectionsWithData === totalDataSections 
              ? 'border-l-green-500 bg-green-50/30' 
              : 'border-l-blue-500 bg-blue-50/30'
        }`}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${
                  sectionsWithData === 0 
                    ? 'bg-amber-400' 
                    : sectionsWithData === totalDataSections 
                      ? 'bg-green-500' 
                      : 'bg-blue-500'
                }`}></div>
                <span className="text-sm font-medium">
                  بيانات يوم {formatDate(selectedDate)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-lg arabic-numbers">{sectionsWithData}</span>
                  <span className="text-muted-foreground">/{totalDataSections}</span>
                </div>
                {sectionsWithData === 0 && (
                  <span className="text-amber-700 bg-amber-100 px-3 py-1 rounded-full text-xs font-medium">
                    لا توجد بيانات
                  </span>
                )}
                {sectionsWithData > 0 && sectionsWithData < totalDataSections && (
                  <span className="text-blue-700 bg-blue-100 px-3 py-1 rounded-full text-xs font-medium">
                    بيانات جزئية
                  </span>
                )}
                {sectionsWithData === totalDataSections && (
                  <span className="text-green-700 bg-green-100 px-3 py-1 rounded-full text-xs font-medium">
                    بيانات كاملة ✓
                  </span>
                )}
              </div>
            </div>
            {sectionsWithData > 0 && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {dataIndicators.fundTransfers && (
                  <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">عهدة</span>
                )}
                {dataIndicators.attendance && (
                  <span className="bg-success/10 text-success text-xs px-2 py-1 rounded">حضور</span>
                )}
                {dataIndicators.transportation && (
                  <span className="bg-secondary/10 text-secondary text-xs px-2 py-1 rounded">نقل</span>
                )}
                {dataIndicators.materials && (
                  <span className="bg-green-500/10 text-green-600 text-xs px-2 py-1 rounded">مواد</span>
                )}
                {dataIndicators.workerTransfers && (
                  <span className="bg-orange-500/10 text-orange-600 text-xs px-2 py-1 rounded">حوالات</span>
                )}
                {dataIndicators.miscExpenses && (
                  <span className="bg-purple-500/10 text-purple-600 text-xs px-2 py-1 rounded">متنوعة</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Date and Balance Info */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="block text-sm font-medium text-foreground mb-1">التاريخ</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="block text-sm font-medium text-foreground mb-1">المبلغ المتبقي السابق</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={carriedForward}
                onChange={(e) => setCarriedForward(e.target.value)}
                placeholder="0"
                className="text-center arabic-numbers"
              />
            </div>
          </div>
          
          {/* Fund Transfer Section */}
          <div className="border-t pt-3">
            <h4 className="font-medium text-foreground mb-2">تحويل عهدة جديدة</h4>
            <div className="grid grid-cols-2 gap-3 mb-2">
              <Input
                type="number"
                inputMode="decimal"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="المبلغ *"
                className="text-center arabic-numbers"
                min="0"
                step="0.01"
              />
              <AutocompleteInput
                value={senderName}
                onChange={setSenderName}
                category="senderNames"
                placeholder="اسم المرسل"
              />
            </div>
            <AutocompleteInput
              type="number"
              inputMode="numeric"
              value={transferNumber}
              onChange={setTransferNumber}
              category="transferNumbers"
              placeholder="رقم الحولة"
              className="w-full mb-2 arabic-numbers"
            />
            <div className="flex gap-2">
              <AutocompleteInput
                value={transferType}
                onChange={setTransferType}
                category="transferTypes"
                placeholder="نوع التحويل *"
                className="flex-1"
              />
              <Button 
                onClick={handleAddFundTransfer} 
                size="sm" 
                className="bg-primary"
                disabled={addFundTransferMutation.isPending || updateFundTransferMutation.isPending}
              >
                {addFundTransferMutation.isPending || updateFundTransferMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : editingFundTransferId ? (
                  <Save className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
              {editingFundTransferId && (
                <Button onClick={resetFundTransferForm} size="sm" variant="outline">
                  إلغاء
                </Button>
              )}
            </div>
            
            {/* عرض العهد المضافة لهذا اليوم */}
            <div className="mt-3 pt-3 border-t">
              <h5 className="text-sm font-medium text-muted-foreground mb-2">العهد المضافة اليوم:</h5>

              {fundTransfersLoading ? (
                <div className="text-center text-muted-foreground">جاري التحميل...</div>
              ) : Array.isArray(todayFundTransfers) && todayFundTransfers.length > 0 ? (
                <div className="space-y-2">
                  {todayFundTransfers.map((transfer, index) => (
                    <div key={transfer.id || index} className="flex justify-between items-center p-2 bg-muted rounded">
                      <div className="text-sm flex-1">
                        <div>{transfer.senderName || 'غير محدد'}</div>
                        <div className="text-xs text-muted-foreground">{transfer.transferType}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium arabic-numbers">{formatCurrency(transfer.amount)}</span>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => handleEditFundTransfer(transfer)}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteFundTransferMutation.mutate(transfer.id)}
                            disabled={deleteFundTransferMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-left pt-2 border-t">
                    <span className="text-sm text-muted-foreground">إجمالي العهد: </span>
                    <span className="font-bold text-primary arabic-numbers">
                      {formatCurrency(totals.totalFundTransfers)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <DollarSign className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 mb-1">
                    لا توجد تحويلات عهد للتاريخ {selectedDate}
                  </p>
                  <p className="text-xs text-gray-500">
                    يمكنك إضافة تحويل جديد أو اختيار تاريخ آخر
                  </p>

                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Worker Wages */}
      <Card className="mb-3">
        <CardContent className="p-4">
          <h4 className="font-medium text-foreground mb-3 flex items-center">
            <Users className="text-primary ml-2 h-5 w-5" />
            أجور العمال
          </h4>
          {todayAttendance.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">لا يوجد حضور عمال للتاريخ {selectedDate}</p>
              <p className="text-xs text-gray-500 mt-1">اذهب إلى صفحة حضور العمال لتسجيل الحضور</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayAttendance.map((attendance, index) => {
                const worker = workers.find(w => w.id === attendance.workerId);
                return (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm">{worker?.name || `عامل ${index + 1}`}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium arabic-numbers">{formatCurrency(attendance.paidAmount)}</span>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            onClick={() => {
                              // توجيه إلى صفحة حضور العمال مع معرف العامل والتاريخ للتعديل
                              setLocation(`/worker-attendance?edit=${attendance.id}&worker=${attendance.workerId}&date=${selectedDate}`);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteWorkerAttendanceMutation.mutate(attendance.id)}
                            disabled={deleteWorkerAttendanceMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                );
              })}
              <div className="text-left mt-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">إجمالي أجور العمال: </span>
                <span className="font-bold text-primary arabic-numbers">
                  {formatCurrency(totals.totalWorkerWages)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transportation */}
      <Card className="mb-3">
        <CardContent className="p-4">
          <h4 className="font-medium text-foreground mb-3 flex items-center">
            <Car className="text-secondary ml-2 h-5 w-5" />
            أجور المواصلات
          </h4>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <AutocompleteInput
                value={transportDescription}
                onChange={setTransportDescription}
                category="transportDescriptions"
                placeholder="الوصف"
              />
              <Input
                type="number"
                inputMode="decimal"
                value={transportAmount}
                onChange={(e) => setTransportAmount(e.target.value)}
                placeholder="المبلغ"
                className="text-center arabic-numbers"
              />
            </div>
            <div className="flex gap-2">
              <AutocompleteInput
                value={transportNotes}
                onChange={setTransportNotes}
                category="notes"
                placeholder="ملاحظات"
                className="flex-1"
              />
              <Button onClick={handleAddTransportation} size="sm" className="bg-secondary">
                {editingTransportationId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </Button>
              {editingTransportationId && (
                <Button onClick={resetTransportationForm} size="sm" variant="outline">
                  إلغاء
                </Button>
              )}
            </div>
            
            {/* Show existing transportation expenses */}
            {todayTransportation.length === 0 ? (
              <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 mt-3">
                <Car className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">لا توجد مصاريف نقل للتاريخ {selectedDate}</p>
                <p className="text-xs text-gray-500 mt-1">أضف مصاريف جديدة أو اختر تاريخ آخر</p>
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {todayTransportation.map((expense, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm flex-1">{expense.description}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium arabic-numbers">{formatCurrency(expense.amount)}</span>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleEditTransportation(expense)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => deleteTransportationMutation.mutate(expense.id)}
                          disabled={deleteTransportationMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="text-left mt-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">إجمالي النقل: </span>
                  <span className="font-bold text-secondary arabic-numbers">
                    {formatCurrency(totals.totalTransportation)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Materials */}
      <Card className="mb-3">
        <CardContent className="p-4">
          <h4 className="font-medium text-foreground mb-3 flex items-center">
            <Package className="text-success ml-2 h-5 w-5" />
            شراء مواد
          </h4>
          {!Array.isArray(todayMaterialPurchases) || todayMaterialPurchases.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <Package className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">لا توجد مشتريات مواد للتاريخ {selectedDate}</p>
              <p className="text-xs text-gray-500 mt-1">اذهب إلى شراء المواد لإضافة مشتريات جديدة</p>
            </div>
          ) : (
            <div className="space-y-2 mb-3">
              {todayMaterialPurchases.map((purchase, index) => {
                const material = purchase.material || (Array.isArray(materials) ? materials.find((m: any) => m.id === purchase.materialId) : null);
                return (
                <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                  <div className="text-sm flex-1">
                    <div className="font-medium">{material?.name || 'مادة غير محددة'}</div>
                    <div className="text-xs text-muted-foreground">
                      {purchase.quantity} {material?.unit || 'وحدة'} × {formatCurrency(purchase.unitPrice)}
                    </div>
                    {purchase.supplierName && (
                      <div className="text-xs text-muted-foreground">المورد: {purchase.supplierName}</div>
                    )}
                    {purchase.purchaseType && (
                      <div className={`text-xs font-medium ${purchase.purchaseType === 'آجل' ? 'text-orange-600' : 'text-green-600'}`}>
                        {purchase.purchaseType === 'آجل' ? '⏰ آجل' : '💵 نقد'}
                      </div>
                    )}
                    {material?.category && (
                      <div className="text-xs text-muted-foreground">الفئة: {material.category}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium arabic-numbers ${purchase.purchaseType === 'آجل' ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(purchase.totalAmount)}
                    </span>
                    <div className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          // توجيه إلى صفحة شراء المواد مع معرف الشراء للتعديل
                          setLocation(`/material-purchase?edit=${purchase.id}`);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteMaterialPurchaseMutation.mutate(purchase.id)}
                        disabled={deleteMaterialPurchaseMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                );
              })}
              <div className="text-left mt-2 pt-2 border-t space-y-1">
                <div>
                  <span className="text-sm text-muted-foreground">المشتريات النقدية (تؤثر على الرصيد): </span>
                  <span className="font-bold text-success arabic-numbers">
                    {formatCurrency(totals.totalMaterialCosts)}
                  </span>
                </div>
                {(() => {
                  const deferredAmount = Array.isArray(todayMaterialPurchases) ? 
                    todayMaterialPurchases
                      .filter(purchase => purchase.purchaseType === "آجل")
                      .reduce((sum, purchase) => sum + parseFloat(purchase.totalAmount || "0"), 0) : 0;
                  return deferredAmount > 0 ? (
                    <div>
                      <span className="text-sm text-muted-foreground">المشتريات الآجلة (لا تؤثر على الرصيد): </span>
                      <span className="font-bold text-orange-600 arabic-numbers">
                        {formatCurrency(deferredAmount)}
                      </span>
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => setLocation("/material-purchase")}
            className="w-full border-2 border-dashed"
          >
            <Plus className="ml-2 h-4 w-4" />
            إضافة شراء مواد
          </Button>
        </CardContent>
      </Card>

      {/* Worker Transfers */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <h4 className="font-medium text-foreground mb-3 flex items-center">
            <DollarSign className="text-warning ml-2 h-5 w-5" />
            حولة من حساب العمال
          </h4>
          {!Array.isArray(todayWorkerTransfers) || todayWorkerTransfers.length === 0 ? (
            <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <ArrowLeftRight className="mx-auto h-8 w-8 text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">لا توجد حوالات عمال للتاريخ {selectedDate}</p>
              <p className="text-xs text-gray-500 mt-1">اذهب إلى صفحة العمال لإدارة الحوالات</p>
            </div>
          ) : (
            <div className="space-y-2 mb-3">
              {todayWorkerTransfers.map((transfer, index) => {
                const worker = workers.find(w => w.id === transfer.workerId);
                return (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted rounded border-r-4 border-warning">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {worker?.name || 'عامل غير معروف'}
                        </span>
                        <span className="font-bold text-warning arabic-numbers">{formatCurrency(transfer.amount)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <span>المستلم: {transfer.recipientName}</span>
                        {transfer.recipientPhone && (
                          <span className="mr-3">الهاتف: {transfer.recipientPhone}</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        طريقة التحويل: {transfer.transferMethod === "hawaleh" ? "حولة" : transfer.transferMethod === "bank" ? "تحويل بنكي" : "نقداً"}
                      </div>
                    </div>
                    <div className="flex gap-1 mr-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => {
                          // توجيه إلى صفحة حسابات العمال مع معرف التحويل للتعديل
                          setLocation(`/worker-accounts?edit=${transfer.id}&worker=${transfer.workerId}`);
                        }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          toast({ title: "قريباً", description: "سيتم إضافة ميزة الحذف" });
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <div className="text-left mt-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">إجمالي الحوالات: </span>
                <span className="font-bold text-warning arabic-numbers">
                  {formatCurrency(totals.totalWorkerTransfers)}
                </span>
              </div>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => setLocation("/worker-accounts")}
            className="w-full border-2 border-dashed"
          >
            <Plus className="ml-2 h-4 w-4" />
            إرسال حولة جديدة
          </Button>
        </CardContent>
      </Card>

      {/* Worker Miscellaneous Expenses */}
      {selectedProjectId && (
        <WorkerMiscExpenses 
          projectId={selectedProjectId} 
          selectedDate={selectedDate} 
        />
      )}

      {/* Project Fund Transfers Section */}
      <Card className="bg-background border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-foreground">ترحيل الأموال بين المشاريع</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowProjectTransfers(!showProjectTransfers)}
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              {showProjectTransfers ? (
                <>
                  <ChevronUp className="h-4 w-4 ml-1" />
                  إخفاء
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 ml-1" />
                  إظهار
                </>
              )}
            </Button>
          </div>

          {showProjectTransfers && (
            <div className="space-y-3">
              {projectTransfers.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  لا توجد عمليات ترحيل أموال لهذا التاريخ
                </div>
              ) : (
                <div className="space-y-2">
                  {projectTransfers.map((transfer) => (
                    <div 
                      key={transfer.id} 
                      className={`p-3 rounded border-r-4 ${
                        transfer.toProjectId === selectedProjectId 
                          ? 'bg-green-50 border-green-500' 
                          : 'bg-red-50 border-red-500'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {transfer.toProjectId === selectedProjectId ? (
                                <span className="text-green-700">أموال واردة من: {transfer.fromProjectName}</span>
                              ) : (
                                <span className="text-red-700">أموال صادرة إلى: {transfer.toProjectName}</span>
                              )}
                            </span>
                            <span className={`font-bold arabic-numbers ${
                              transfer.toProjectId === selectedProjectId ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transfer.toProjectId === selectedProjectId ? '+' : '-'}{formatCurrency(transfer.amount)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <div>السبب: {transfer.transferReason || 'ترحيل أموال'}</div>
                            {transfer.description && (
                              <div className="mt-1">الوصف: {transfer.description}</div>
                            )}
                            <div className="mt-1">التاريخ: {formatDate(transfer.transferDate)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="mt-4 pt-3 border-t">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/project-transfers")}
                  className="w-full border-2 border-dashed border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <ArrowLeftRight className="ml-2 h-4 w-4" />
                  إدارة عمليات ترحيل الأموال
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Total Summary */}
      <ExpenseSummary
        totalIncome={totals.totalIncome}
        totalExpenses={totals.totalExpenses}
        remainingBalance={totals.remainingBalance}
      />

      {/* Save Button */}
      <div className="mt-4">
        <Button
          onClick={handleSaveSummary}
          disabled={saveDailySummaryMutation.isPending}
          className="w-full bg-success hover:bg-success/90 text-success-foreground"
        >
          <Save className="ml-2 h-4 w-4" />
          {saveDailySummaryMutation.isPending ? "جاري الحفظ..." : "حفظ المصروفات"}
        </Button>
      </div>
    </div>
  );
}

// Export default مع Error Boundary
export default function DailyExpenses() {
  return (
    <ErrorBoundary>
      <DailyExpensesContent />
    </ErrorBoundary>
  );
}
