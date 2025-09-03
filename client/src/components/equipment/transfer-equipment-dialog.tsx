import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Equipment } from "@shared/schema";
import { ArrowUpDown } from "lucide-react";

const transferSchema = z.object({
  toProjectId: z.string().nullable(),
  reason: z.string().min(1, "سبب النقل مطلوب"),
  performedBy: z.string().min(1, "اسم من قام بالنقل مطلوب"),
  notes: z.string().optional(),
});

type TransferFormData = z.infer<typeof transferSchema>;

interface TransferEquipmentDialogProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: any[];
}

export function TransferEquipmentDialog({ equipment, open, onOpenChange, projects }: TransferEquipmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      toProjectId: null,
      reason: "",
      performedBy: "",
      notes: "",
    },
  });

  const transferMutation = useMutation({
    mutationFn: (data: TransferFormData) => 
      apiRequest(`/api/equipment/${equipment?.id}/transfer`, "POST", data),
    onSuccess: () => {
      // إعادة تحميل جميع البيانات المتعلقة بالمعدات
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'equipment'
      });
      queryClient.invalidateQueries({ 
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === 'equipment-movements'
      });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      
      toast({
        title: "نجح النقل",
        description: "تم نقل المعدة بنجاح",
        variant: "default",
      });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || "فشل في نقل المعدة",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransferFormData) => {
    transferMutation.mutate({
      ...data,
      toProjectId: data.toProjectId || null,
    });
  };

  const getCurrentLocationName = () => {
    if (!equipment) return "";
    if (!equipment.currentProjectId) return "المستودع";
    const project = Array.isArray(projects) ? projects.find(p => p.id === equipment.currentProjectId) : undefined;
    return project ? project.name : "مشروع غير معروف";
  };

  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            نقل المعدة
          </DialogTitle>
          <DialogDescription>
            نقل المعدة "{equipment.name}" إلى موقع جديد
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Location Info */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">الموقع الحالي:</p>
                  <p className="font-medium" data-testid="text-current-location">{getCurrentLocationName()}</p>
                </div>
                <ArrowUpDown className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">الموقع الجديد:</p>
                  <p className="font-medium text-blue-600" data-testid="text-new-location">
                    {form.watch('toProjectId') && form.watch('toProjectId') !== 'warehouse'
                      ? projects.find(p => p.id === form.watch('toProjectId'))?.name || 'المستودع'
                      : 'المستودع'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Destination Project */}
            <FormField
              control={form.control}
              name="toProjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المشروع المقصود</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "warehouse" ? null : value)}
                    defaultValue={field.value || "warehouse"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-destination-project">
                        <SelectValue placeholder="اختر المشروع المقصود" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="warehouse">المستودع</SelectItem>
                      {projects
                        .filter(p => p.id !== equipment.currentProjectId)
                        .map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    اختر المشروع الذي تريد نقل المعدة إليه، أو اتركه فارغاً للنقل إلى المستودع
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Transfer Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سبب النقل *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="مثال: انتهاء العمل في المشروع السابق"
                      {...field} 
                      data-testid="input-transfer-reason"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Performed By */}
            <FormField
              control={form.control}
              name="performedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تم بواسطة *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="اسم الشخص المسؤول عن النقل"
                      {...field} 
                      data-testid="input-performed-by"
                    />
                  </FormControl>
                  <FormDescription>
                    أدخل اسم الشخص المسؤول عن تنفيذ عملية النقل
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات إضافية</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="ملاحظات أو تفاصيل إضافية حول النقل..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                      data-testid="textarea-transfer-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Buttons */}
            <div className="flex justify-end space-x-2 space-x-reverse pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-transfer"
              >
                إلغاء
              </Button>
              <Button 
                type="submit" 
                disabled={transferMutation.isPending}
                data-testid="button-confirm-transfer"
              >
                {transferMutation.isPending ? "جاري النقل..." : "تأكيد النقل"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}