import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { User, Clock, DollarSign, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Worker } from "@shared/schema";

interface AttendanceData {
  isPresent: boolean;
  startTime?: string;
  endTime?: string;
  workDescription?: string;
  workDays?: number;
  paidAmount?: string;
  paymentType?: string;
}

interface EnhancedWorkerCardProps {
  worker: Worker;
  attendance: AttendanceData;
  onAttendanceChange: (attendance: AttendanceData) => void;
}

export default function EnhancedWorkerCard({ 
  worker, 
  attendance, 
  onAttendanceChange 
}: EnhancedWorkerCardProps) {
  const [localAttendance, setLocalAttendance] = useState<AttendanceData>(attendance);

  // تحديث الحالة المحلية عند تغيير props
  useEffect(() => {
    setLocalAttendance(attendance);
  }, [attendance]);

  const updateAttendance = (updates: Partial<AttendanceData>) => {
    const newAttendance = { ...localAttendance, ...updates };
    setLocalAttendance(newAttendance);
    onAttendanceChange(newAttendance);
  };

  const handleAttendanceToggle = (checked: boolean) => {
    updateAttendance({
      isPresent: checked,
      startTime: checked ? (localAttendance.startTime || "07:00") : undefined,
      endTime: checked ? (localAttendance.endTime || "15:00") : undefined,
      workDescription: checked ? localAttendance.workDescription : undefined,
      workDays: checked ? (localAttendance.workDays || 1.0) : undefined,
      paidAmount: checked ? localAttendance.paidAmount : undefined,
      paymentType: checked ? (localAttendance.paymentType || "partial") : undefined,
    });
  };

  const calculateActualWage = () => {
    const workDays = localAttendance.workDays || 1.0;
    return parseFloat(worker.dailyWage) * workDays;
  };

  return (
    <Card className="mb-4 shadow-sm border-r-4 border-r-primary/20 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        {/* رأس البطاقة - معلومات العامل */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
          <div className="flex items-center space-x-reverse space-x-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
              worker.type === "معلم" ? "bg-gradient-to-br from-primary to-primary/80" : 
              worker.type === "حداد" ? "bg-gradient-to-br from-orange-500 to-orange-600" :
              worker.type === "بلاط" ? "bg-gradient-to-br from-blue-500 to-blue-600" :
              worker.type === "دهان" ? "bg-gradient-to-br from-green-500 to-green-600" :
              "bg-gradient-to-br from-gray-500 to-gray-600"
            }`}>
              <User className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-foreground">{worker.name}</h4>
              <div className="flex items-center space-x-reverse space-x-2 text-sm text-muted-foreground">
                <span className="bg-secondary px-2 py-1 rounded-md">{worker.type}</span>
                <span className="text-primary font-semibold arabic-numbers">
                  {formatCurrency(worker.dailyWage)}/يوم
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-reverse space-x-3">
            <Label htmlFor={`present-${worker.id}`} className="text-sm font-medium text-foreground cursor-pointer">
              حاضر
            </Label>
            <Checkbox
              id={`present-${worker.id}`}
              checked={localAttendance.isPresent}
              onCheckedChange={handleAttendanceToggle}
              className="w-5 h-5"
            />
          </div>
        </div>
        
        {/* تفاصيل الحضور */}
        {localAttendance.isPresent && (
          <div className="space-y-4">
            {/* أوقات العمل */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center space-x-reverse space-x-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>من الساعة</span>
                </Label>
                <Input
                  type="time"
                  value={localAttendance.startTime || "07:00"}
                  onChange={(e) => updateAttendance({ startTime: e.target.value })}
                  className="text-center font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center space-x-reverse space-x-2 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>إلى الساعة</span>
                </Label>
                <Input
                  type="time"
                  value={localAttendance.endTime || "15:00"}
                  onChange={(e) => updateAttendance({ endTime: e.target.value })}
                  className="text-center font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center space-x-reverse space-x-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  <span>أيام العمل</span>
                </Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0.1"
                  max="2.0"
                  value={localAttendance.workDays || 1.0}
                  onChange={(e) => updateAttendance({ workDays: parseFloat(e.target.value) || 1.0 })}
                  className="text-center arabic-numbers"
                />
              </div>
            </div>

            {/* وصف العمل مع الإكمال التلقائي */}
            <div className="space-y-2">
              <Label className="flex items-center space-x-reverse space-x-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>وصف العمل</span>
              </Label>
              <AutocompleteInput
                value={localAttendance.workDescription || ""}
                onChange={(value) => updateAttendance({ workDescription: value })}
                placeholder="اكتب وصف العمل المنجز..."
                category="workDescriptions"
                className="w-full"
              />
            </div>

            {/* معلومات الدفع */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">نوع الدفع</Label>
                <Select
                  value={localAttendance.paymentType || "partial"}
                  onValueChange={(value) => updateAttendance({ paymentType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">دفع كامل</SelectItem>
                    <SelectItem value="partial">دفع جزئي</SelectItem>
                    <SelectItem value="credit">على الحساب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {localAttendance.paymentType !== "credit" && (
                <div className="space-y-2">
                  <Label className="flex items-center space-x-reverse space-x-2 text-sm font-medium text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    <span>المبلغ المدفوع</span>
                  </Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={localAttendance.paidAmount || ""}
                    onChange={(e) => updateAttendance({ paidAmount: e.target.value })}
                    className="text-center arabic-numbers"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">الأجر المستحق</Label>
                <div className="h-10 px-3 py-2 bg-secondary/50 rounded-md flex items-center justify-center">
                  <span className="font-bold text-primary arabic-numbers">
                    {formatCurrency(calculateActualWage())}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}