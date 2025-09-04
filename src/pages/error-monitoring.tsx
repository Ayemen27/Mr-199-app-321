import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import StatusOverview from "@/components/status-overview";
import ErrorDiagnostic from "@/components/error-diagnostic";
import ErrorLogTable from "@/components/error-log-table";
import MonitoringSidebar from "@/components/monitoring-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SystemMetrics } from "@shared/schema";

export default function ErrorMonitoringPage() {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch current system metrics
  const { data: metrics, refetch: refetchMetrics, isLoading: metricsLoading } = useQuery<SystemMetrics>({
    queryKey: ['/api/metrics/current'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/metrics/update', { method: 'POST' });
      await refetchMetrics();
      toast({
        title: "تم التحديث",
        description: "تم تحديث البيانات بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ في التحديث",
        description: "فشل في تحديث البيانات",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="error-monitoring-page">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <div className="bg-primary text-primary-foreground w-10 h-10 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold" data-testid="page-title">مراقب الأخطاء المتقدم</h1>
                <p className="text-sm text-muted-foreground">تشخيص وإصلاح أخطاء 502</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={handleRefreshData}
                disabled={isRefreshing}
                className="bg-secondary text-secondary-foreground hover:bg-accent"
                data-testid="refresh-data-button"
              >
                <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                تحديث البيانات
              </Button>
              <div className="flex items-center gap-2 bg-secondary px-3 py-2 rounded-md">
                <div className="w-2 h-2 bg-green-500 rounded-full pulse-dot"></div>
                <span className="text-sm" data-testid="connection-status">متصل</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Overview */}
        <StatusOverview metrics={metrics} isLoading={metricsLoading} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Content - Diagnostics and Error Logs */}
          <div className="lg:col-span-2 space-y-8">
            <ErrorDiagnostic />
            <ErrorLogTable />
          </div>

          {/* Right Sidebar - Monitoring Tools */}
          <div className="lg:col-span-1">
            <MonitoringSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
