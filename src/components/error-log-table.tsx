import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from "lucide-react";
import type { ErrorLog } from "@shared/schema";

export default function ErrorLogTable() {
  const [timeFilter, setTimeFilter] = useState('24h');

  // Fetch error logs
  const { data: errorLogs = [], isLoading } = useQuery<ErrorLog[]>({
    queryKey: ['/api/error-logs', { timeFilter }],
    queryFn: async () => {
      const response = await fetch(`/api/error-logs?timeFilter=${timeFilter}&limit=50`);
      if (!response.ok) throw new Error('Failed to fetch error logs');
      return response.json();
    },
  });

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-500/10 text-green-500';
      case 'processing':
        return 'bg-yellow-500/10 text-yellow-500';
      case 'active':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'تم الحل';
      case 'processing':
        return 'قيد المعالجة';
      case 'active':
        return 'نشط';
      default:
        return 'غير محدد';
    }
  };

  return (
    <Card className="border border-border" data-testid="error-log-table-card">
      <CardHeader className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" data-testid="error-log-title">سجل الأخطاء التفصيلي</h2>
          <div className="flex gap-2">
            <Select value={timeFilter} onValueChange={setTimeFilter}>
              <SelectTrigger className="w-32" data-testid="time-filter-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">آخر ساعة</SelectItem>
                <SelectItem value="24h">آخر 24 ساعة</SelectItem>
                <SelectItem value="7d">آخر أسبوع</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="secondary"
              className="bg-secondary text-secondary-foreground hover:bg-accent"
              data-testid="filter-button"
            >
              <Filter className="h-4 w-4 ml-1" />
              تصفية
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto" data-testid="error-log-table">
            <table className="w-full">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-right p-4 text-sm font-medium">الوقت</th>
                  <th className="text-right p-4 text-sm font-medium">النوع</th>
                  <th className="text-right p-4 text-sm font-medium">المسار</th>
                  <th className="text-right p-4 text-sm font-medium">الخطأ</th>
                  <th className="text-right p-4 text-sm font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {errorLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      لا توجد أخطاء في الفترة المحددة
                    </td>
                  </tr>
                ) : (
                  errorLogs.map((log, index) => (
                    <tr
                      key={log.id}
                      className="border-b border-border hover:bg-muted/20 transition-colors"
                      data-testid={`error-log-row-${index}`}
                    >
                      <td className="p-4 text-sm code-font" data-testid={`log-time-${index}`}>
                        {formatTime(log.timestamp)}
                      </td>
                      <td className="p-4" data-testid={`log-type-${index}`}>
                        <Badge className="bg-red-500/10 text-red-500">
                          {log.statusCode}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm code-font" data-testid={`log-path-${index}`}>
                        {log.path}
                      </td>
                      <td className="p-4 text-sm" data-testid={`log-error-${index}`}>
                        {log.error}
                      </td>
                      <td className="p-4" data-testid={`log-status-${index}`}>
                        <Badge className={`text-xs ${getStatusColor(log.status)}`}>
                          {getStatusText(log.status)}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
