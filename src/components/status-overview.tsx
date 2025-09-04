import { Card } from "@/components/ui/card";
import { CheckCircle, TriangleAlert, Gauge, Activity } from "lucide-react";
import type { SystemMetrics } from "@shared/schema";

interface StatusOverviewProps {
  metrics?: SystemMetrics;
  isLoading?: boolean;
}

export default function StatusOverview({ metrics, isLoading }: StatusOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-20 bg-muted rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  const formatNumber = (num?: number) => {
    if (num === undefined) return "0";
    return new Intl.NumberFormat('ar-SA').format(num);
  };

  const getUptimeColor = (uptime?: number) => {
    if (!uptime) return "text-gray-500";
    if (uptime >= 99) return "text-green-500";
    if (uptime >= 95) return "text-yellow-500";
    return "text-red-500";
  };

  const getResponseTimeColor = (responseTime?: number) => {
    if (!responseTime) return "text-gray-500";
    if (responseTime <= 200) return "text-green-500";
    if (responseTime <= 500) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-testid="status-overview">
      {/* Service Status */}
      <Card className="p-6 border border-border metric-card" data-testid="service-status-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">حالة الخدمة</p>
            <p className={`text-2xl font-bold ${metrics?.serviceStatus === 'متاحة' ? 'text-green-500' : 'text-red-500'}`} data-testid="service-status-value">
              {metrics?.serviceStatus || 'غير محدد'}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${metrics?.serviceStatus === 'متاحة' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <CheckCircle className={`text-xl ${metrics?.serviceStatus === 'متاحة' ? 'text-green-500' : 'text-red-500'}`} />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className={getUptimeColor(metrics?.uptime)}>
            ↗ {metrics?.uptime?.toFixed(1) || '0'}%
          </span>
          <span className="text-muted-foreground mr-2">وقت التشغيل</span>
        </div>
      </Card>

      {/* 502 Errors */}
      <Card className="p-6 border border-border metric-card" data-testid="error-502-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">أخطاء 502</p>
            <p className="text-2xl font-bold text-red-500" data-testid="error-502-count">
              {formatNumber(metrics?.error502Count)}
            </p>
          </div>
          <div className="bg-red-500/10 p-3 rounded-lg">
            <TriangleAlert className="text-red-500 text-xl" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-red-500">↑ +{Math.floor((metrics?.error502Count || 0) * 0.5)}</span>
          <span className="text-muted-foreground mr-2">آخر 24 ساعة</span>
        </div>
      </Card>

      {/* Response Time */}
      <Card className="p-6 border border-border metric-card" data-testid="response-time-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">زمن الاستجابة</p>
            <p className={`text-2xl font-bold ${getResponseTimeColor(metrics?.responseTime)}`} data-testid="response-time-value">
              {formatNumber(metrics?.responseTime)}ms
            </p>
          </div>
          <div className="bg-blue-500/10 p-3 rounded-lg">
            <Gauge className="text-blue-500 text-xl" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-green-500">↓ -15ms</span>
          <span className="text-muted-foreground mr-2">متوسط</span>
        </div>
      </Card>

      {/* Active Requests */}
      <Card className="p-6 border border-border metric-card" data-testid="active-requests-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">الطلبات النشطة</p>
            <p className="text-2xl font-bold" data-testid="active-requests-value">
              {formatNumber(metrics?.activeRequests)}
            </p>
          </div>
          <div className="bg-purple-500/10 p-3 rounded-lg">
            <Activity className="text-purple-500 text-xl" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-blue-500">→ مستقر</span>
          <span className="text-muted-foreground mr-2">معدل</span>
        </div>
      </Card>
    </div>
  );
}
