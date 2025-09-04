import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Download, 
  Check, 
  X, 
  AlertTriangle, 
  Loader2 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DiagnosticCheck } from "@shared/schema";

export default function ErrorDiagnostic() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch diagnostic checks
  const { data: diagnosticChecks = [], isLoading } = useQuery<DiagnosticCheck[]>({
    queryKey: ['/api/diagnostics/checks'],
  });

  // Fetch suggestions
  const { data: suggestionsData } = useQuery<{suggestions: string[]}>({
    queryKey: ['/api/diagnostics/suggestions'],
  });

  // Run diagnostics mutation
  const runDiagnosticsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/diagnostics/run', { method: 'POST' });
      if (!response.ok) throw new Error('Failed to run diagnostics');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diagnostics/checks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/diagnostics/suggestions'] });
      toast({
        title: "تم التشخيص",
        description: "تم تشغيل التشخيص بنجاح",
      });
    },
    onError: () => {
      toast({
        title: "خطأ في التشخيص",
        description: "فشل في تشغيل التشخيص",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <Check className="text-white text-sm" />;
      case 'failure':
        return <X className="text-white text-sm" />;
      case 'warning':
        return <AlertTriangle className="text-white text-sm" />;
      case 'running':
        return <Loader2 className="text-white text-sm animate-spin" />;
      default:
        return <Loader2 className="text-white text-sm" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-500';
      case 'failure':
        return 'bg-red-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'running':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success':
        return 'نجح';
      case 'failure':
        return 'فشل';
      case 'warning':
        return 'تحذير';
      case 'running':
        return 'قيد التشغيل';
      default:
        return 'غير محدد';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-500';
      case 'failure':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      case 'running':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="border border-border" data-testid="error-diagnostic-card">
      <CardHeader className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold" data-testid="diagnostic-title">تشخيص خطأ 502</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => runDiagnosticsMutation.mutate()}
              disabled={runDiagnosticsMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="run-diagnostic-button"
            >
              {runDiagnosticsMutation.isPending ? (
                <Loader2 className="h-4 w-4 ml-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 ml-1" />
              )}
              تشغيل التشخيص
            </Button>
            <Button
              variant="secondary"
              className="bg-secondary text-secondary-foreground hover:bg-accent"
              data-testid="export-diagnostic-button"
            >
              <Download className="h-4 w-4 ml-1" />
              تصدير
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4" data-testid="diagnostic-checks-list">
            {diagnosticChecks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                لا توجد فحوصات تشخيصية متاحة
              </div>
            ) : (
              diagnosticChecks.map((check, index) => (
                <div
                  key={check.id}
                  className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg"
                  data-testid={`diagnostic-check-${index}`}
                >
                  <div className={`w-8 h-8 ${getStatusColor(check.status)} rounded-full flex items-center justify-center`}>
                    {getStatusIcon(check.status)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium" data-testid={`check-name-${index}`}>{check.name}</h3>
                    <p className="text-sm text-muted-foreground" data-testid={`check-description-${index}`}>
                      {check.description}
                    </p>
                    {check.result && (
                      <p className="text-sm mt-1" data-testid={`check-result-${index}`}>
                        {check.result}
                      </p>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${getStatusTextColor(check.status)}`} data-testid={`check-status-${index}`}>
                    {check.status === 'success' && '✓'} 
                    {check.status === 'failure' && '✗'} 
                    {check.status === 'warning' && '⚠'} 
                    {check.status === 'running' && '⏳'} 
                    {getStatusText(check.status)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Suggested Actions */}
        {suggestionsData?.suggestions && suggestionsData.suggestions.length > 0 && (
          <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg" data-testid="suggested-actions">
            <h4 className="font-medium text-destructive mb-2">الإجراءات المقترحة:</h4>
            <ul className="text-sm space-y-1 text-destructive">
              {suggestionsData.suggestions.map((suggestion: string, index: number) => (
                <li key={index} data-testid={`suggestion-${index}`}>• {suggestion}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
