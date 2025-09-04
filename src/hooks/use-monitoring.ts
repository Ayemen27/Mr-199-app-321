import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { SystemMetrics, ErrorLog, DiagnosticCheck } from "@shared/schema";

export function useMonitoring() {
  const queryClient = useQueryClient();

  // System metrics
  const {
    data: metrics,
    isLoading: metricsLoading,
    refetch: refetchMetrics,
  } = useQuery<SystemMetrics>({
    queryKey: ['/api/metrics/current'],
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Error logs
  const {
    data: errorLogs = [],
    isLoading: logsLoading,
  } = useQuery<ErrorLog[]>({
    queryKey: ['/api/error-logs'],
    refetchInterval: 60000, // Auto-refresh every minute
  });

  // Diagnostic checks
  const {
    data: diagnosticChecks = [],
    isLoading: diagnosticsLoading,
  } = useQuery<DiagnosticCheck[]>({
    queryKey: ['/api/diagnostics/checks'],
  });

  // Mutations
  const updateMetricsMutation = useMutation({
    mutationFn: () => fetch('/api/metrics/update', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/metrics/current'] });
    },
  });

  const runDiagnosticsMutation = useMutation({
    mutationFn: () => fetch('/api/diagnostics/run', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/diagnostics/checks'] });
    },
  });

  return {
    // Data
    metrics,
    errorLogs,
    diagnosticChecks,
    
    // Loading states
    metricsLoading,
    logsLoading,
    diagnosticsLoading,
    
    // Actions
    refetchMetrics,
    updateMetrics: updateMetricsMutation.mutate,
    runDiagnostics: runDiagnosticsMutation.mutate,
    
    // Mutation states
    isUpdatingMetrics: updateMetricsMutation.isPending,
    isRunningDiagnostics: runDiagnosticsMutation.isPending,
  };
}
