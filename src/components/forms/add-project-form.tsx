import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertProject } from "@shared/schema";

interface AddProjectFormProps {
  onSuccess?: () => void;
}

export default function AddProjectForm({ onSuccess }: AddProjectFormProps) {
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
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

  const addProjectMutation = useMutation({
    mutationFn: async (data: InsertProject) => {
      // حفظ اسم المشروع في autocomplete_data قبل العملية الأساسية
      await saveAutocompleteValue('projectNames', data.name);
      
      return apiRequest("/api/projects", "POST", data);
    },
    onSuccess: async () => {
      // تحديث كاش autocomplete للتأكد من ظهور البيانات الجديدة
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      toast({
        title: "تم الحفظ",
        description: "تم إضافة المشروع بنجاح",
      });
      setName("");
      setStatus("active");
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects/with-stats"] });
      onSuccess?.();
    },
    onError: async (error: any, variables) => {
      // حفظ اسم المشروع في autocomplete_data حتى في حالة الخطأ
      await saveAutocompleteValue('projectNames', variables.name);
      
      // تحديث كاش autocomplete
      queryClient.invalidateQueries({ queryKey: ["/api/autocomplete"] });
      
      const errorMessage = error?.message || "حدث خطأ أثناء إضافة المشروع";
      toast({
        title: "فشل في إضافة المشروع",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم المشروع",
        variant: "destructive",
      });
      return;
    }

    addProjectMutation.mutate({
      name: name.trim(),
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="project-name" className="block text-sm font-medium text-foreground mb-2">
          اسم المشروع
        </Label>
        <Input
          id="project-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="أدخل اسم المشروع..."
          required
        />
      </div>

      <div>
        <Label htmlFor="project-status" className="block text-sm font-medium text-foreground mb-2">
          حالة المشروع
        </Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="اختر حالة المشروع..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="paused">متوقف</SelectItem>
            <SelectItem value="completed">مكتمل</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        disabled={addProjectMutation.isPending}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {addProjectMutation.isPending ? "جاري الإضافة..." : "إضافة المشروع"}
      </Button>
    </form>
  );
}