import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AutocompleteInput } from "@/components/ui/autocomplete-input-database";
import { User } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { Worker } from "@shared/schema";

interface WorkerCardProps {
  worker: Worker;
  date: string;
  onAttendanceChange: (workerId: string, attendance: {
    isPresent: boolean;
    startTime?: string;
    endTime?: string;
    workDescription?: string;
  }) => void;
}

export default function WorkerCard({ worker, date, onAttendanceChange }: WorkerCardProps) {
  const [isPresent, setIsPresent] = useState(false);
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("15:00");
  const [workDescription, setWorkDescription] = useState("");

  const handleAttendanceChange = (newIsPresent: boolean) => {
    setIsPresent(newIsPresent);
    onAttendanceChange(worker.id, {
      isPresent: newIsPresent,
      startTime: newIsPresent ? startTime : undefined,
      endTime: newIsPresent ? endTime : undefined,
      workDescription: newIsPresent ? workDescription : undefined,
    });
  };

  const handleTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    if (field === 'startTime') {
      setStartTime(value);
    } else {
      setEndTime(value);
    }
    
    if (isPresent) {
      onAttendanceChange(worker.id, {
        isPresent,
        startTime: field === 'startTime' ? value : startTime,
        endTime: field === 'endTime' ? value : endTime,
        workDescription,
      });
    }
  };

  const handleDescriptionChange = (value: string) => {
    setWorkDescription(value);
    if (isPresent) {
      onAttendanceChange(worker.id, {
        isPresent,
        startTime,
        endTime,
        workDescription: value,
      });
    }
  };

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-reverse space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              worker.type === "معلم" ? "bg-primary" : "bg-secondary"
            }`}>
              <User className={`h-5 w-5 ${
                worker.type === "معلم" ? "text-primary-foreground" : "text-secondary-foreground"
              }`} />
            </div>
            <div>
              <h4 className="font-medium text-foreground">{worker.name}</h4>
              <p className="text-sm text-muted-foreground">{worker.type}</p>
            </div>
          </div>
          <div className="text-left">
            <div className="text-sm text-muted-foreground">الأجر اليومي</div>
            <div className="font-bold text-primary arabic-numbers">
              {formatCurrency(worker.dailyWage)}
            </div>
          </div>
        </div>
        
        {isPresent && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <Label className="text-sm text-muted-foreground mb-1">من الساعة</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleTimeChange('startTime', e.target.value)}
                  className="text-center"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1">إلى الساعة</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleTimeChange('endTime', e.target.value)}
                  className="text-center"
                />
              </div>
            </div>
            
            <div className="mb-3">
              <Label className="text-sm text-muted-foreground mb-1">ملاحظات العمل</Label>
              <AutocompleteInput
                value={workDescription}
                onChange={handleDescriptionChange}
                placeholder="وصف العمل المنجز..."
                category="workDescriptions"
                className="w-full"
              />
            </div>
          </>
        )}
        
        <div className="flex items-center space-x-reverse space-x-2">
          <Checkbox
            id={`present-${worker.id}`}
            checked={isPresent}
            onCheckedChange={handleAttendanceChange}
          />
          <Label htmlFor={`present-${worker.id}`} className="text-sm text-foreground">
            حاضر
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
