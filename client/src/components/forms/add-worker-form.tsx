import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus } from "lucide-react";
import type { InsertWorker } from "@shared/schema";

interface Worker {
  id: string;
  name: string;
  type: string;
  dailyWage: string;
  isActive: boolean;
  createdAt: string;
}

interface AddWorkerFormProps {
  worker?: Worker;
  onSuccess?: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

interface WorkerType {
  id: string;
  name: string;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
}

export default function AddWorkerForm({ worker, onSuccess, onCancel, submitLabel = "إضافة العامل" }: AddWorkerFormProps) {
  const [name, setName] = useState(worker?.name || "");
  const [type, setType] = useState(worker?.type || "");
  const [dailyWage, setDailyWage] = useState(worker ? worker.dailyWage : "");
  const [showAddTypeDialog, setShowAddTypeDialog] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

    }
  };

  // جلب أنواع العمال من قاعدة البيانات
  const { data: workerTypes = [] } = useQuery<WorkerType[]>({
    queryKey: ["/api/worker-types"],
  });

  const addWorkerMutation = useMutation({
    mutationFn: async (data: InsertWorker) => {
      // حفظ القيم في autocomplete_data قبل العملية الأساسية
      await Promise.all([
        saveAutocompleteValue('workerNames', data.name),
        saveAutocompleteValue('workerTypes', data.type)
      ]);
      
      if (worker) {
        return apiRequest(`/api/workers/${worker.id}`, "PUT", data);
      } else {
        return apiRequest("/api/workers", "POST", data);
      }
    },
    onSuccess: async (newWorker, variables) => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      toast({
        title: "تم الحفظ",
        description: worker ? "تم تعديل العامل بنجاح" : "تم إضافة العامل بنجاح",
      });
      if (!worker) {
        setName("");
        setType("");
        setDailyWage("");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/workers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/worker-types"] });
      onSuccess?.();
    },
    onError: async (error: any, variables) => {
      // حفظ القيم في autocomplete_data حتى في حالة الخطأ
      await Promise.all([
        saveAutocompleteValue('workerNames', variables.name),
        saveAutocompleteValue('workerTypes', variables.type)
      ]);
      
      // تحديث كاش autocomplete
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      const errorMessage = error?.message || (worker ? "حدث خطأ أثناء تعديل العامل" : "حدث خطأ أثناء إضافة العامل");
      toast({
        title: worker ? "فشل في تعديل العامل" : "فشل في إضافة العامل",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // إضافة نوع عامل جديد
  const addWorkerTypeMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      // حفظ قيمة نوع العامل الجديد في autocomplete قبل العملية الأساسية
      await saveAutocompleteValue('workerTypes', data.name);
      
      return apiRequest("/api/worker-types", "POST", data);
    },
    onSuccess: async (newType, variables) => {
      // تحديث كاش autocomplete
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      toast({
        title: "تم الحفظ",
        description: "تم إضافة نوع العامل بنجاح",
      });
      setType(newType.name);
      setNewTypeName("");
      setShowAddTypeDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/worker-types"] });
    },
    onError: async (error: any, variables) => {
      // حفظ قيمة نوع العامل حتى في حالة الخطأ
      await saveAutocompleteValue('workerTypes', variables.name);
      
      // تحديث كاش autocomplete
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      const errorMessage = error?.message || "حدث خطأ أثناء إضافة نوع العامل";
      toast({
        title: "فشل في إضافة نوع العامل",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !type || !dailyWage) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع البيانات المطلوبة",
        variant: "destructive",
      });
      return;
    }

    const parsedWage = parseFloat(dailyWage);
    
    if (isNaN(parsedWage) || parsedWage <= 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال مبلغ صحيح للأجر اليومي",
        variant: "destructive",
      });
      return;
    }

    addWorkerMutation.mutate({
      name: name.trim(),
      type,
      dailyWage: parsedWage.toString(),
      isActive: true,
    });
  };

  const handleAddNewType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم نوع العامل",
        variant: "destructive",
      });
      return;
    }

    addWorkerTypeMutation.mutate({
      name: newTypeName.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="worker-name" className="block text-sm font-medium text-foreground mb-2">
          اسم العامل
        </Label>
        <Input
          id="worker-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="أدخل اسم العامل..."
          required
        />
      </div>

      <div>
        <Label htmlFor="worker-type" className="block text-sm font-medium text-foreground mb-2">
          نوع العامل
        </Label>
        <div className="flex gap-2">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="اختر نوع العامل..." />
            </SelectTrigger>
            <SelectContent>
              {Array.isArray(workerTypes) && workerTypes.map((workerType) => (
                <SelectItem key={workerType.id} value={workerType.name}>
                  {workerType.name}
                </SelectItem>
              ))}
              {workerTypes.length === 0 && (
                <>
                  <SelectItem value="معلم">معلم</SelectItem>
                  <SelectItem value="عامل">عامل</SelectItem>
                  <SelectItem value="حداد">حداد</SelectItem>
                  <SelectItem value="نجار">نجار</SelectItem>
                  <SelectItem value="سائق">سائق</SelectItem>
                  <SelectItem value="كهربائي">كهربائي</SelectItem>
                  <SelectItem value="سباك">سباك</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          
          <Dialog open={showAddTypeDialog} onOpenChange={setShowAddTypeDialog}>
            <DialogTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="shrink-0" title="إضافة نوع جديد">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>إضافة نوع عامل جديد</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddNewType} className="space-y-4">
                <div>
                  <Label htmlFor="new-type-name" className="block text-sm font-medium text-foreground mb-2">
                    اسم نوع العامل
                  </Label>
                  <Input
                    id="new-type-name"
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    placeholder="مثال: كهربائي، سباك، حداد..."
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="submit"
                    disabled={addWorkerTypeMutation.isPending}
                    className="flex-1"
                  >
                    {addWorkerTypeMutation.isPending ? "جاري الإضافة..." : "إضافة"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddTypeDialog(false);
                      setNewTypeName("");
                    }}
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div>
        <Label htmlFor="daily-wage" className="block text-sm font-medium text-foreground mb-2">
          الأجر اليومي (ر.ي)
        </Label>
        <Input
          id="daily-wage"
          type="number"
          inputMode="decimal"
          value={dailyWage}
          onChange={(e) => setDailyWage(e.target.value)}
          placeholder="0"
          className="text-center arabic-numbers"
          required
        />
      </div>

      <div className="flex gap-2">
        <Button 
          type="submit" 
          className="flex-1" 
          disabled={addWorkerMutation.isPending}
        >
          {addWorkerMutation.isPending ? "جاري الحفظ..." : submitLabel}
        </Button>
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="flex-1"
          >
            إلغاء
          </Button>
        )}
      </div>
    </form>
  );
}