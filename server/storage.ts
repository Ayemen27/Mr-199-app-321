import type { 
  ErrorLog, 
  InsertErrorLog,
  DiagnosticCheck,
  InsertDiagnosticCheck,
  SystemMetrics,
  InsertSystemMetrics,
  AlertSettings,
  InsertAlertSettings,
  DeploymentInfo
} from "@shared/schema";

export interface IStorage {
  // Error Logs
  getErrorLogs(limit?: number, timeFilter?: string): Promise<ErrorLog[]>;
  createErrorLog(errorLog: InsertErrorLog): Promise<ErrorLog>;
  updateErrorLogStatus(id: string, status: 'active' | 'processing' | 'resolved'): Promise<ErrorLog>;
  getError502Count(timeRange?: string): Promise<number>;
  
  // Diagnostic Checks
  getDiagnosticChecks(): Promise<DiagnosticCheck[]>;
  createDiagnosticCheck(check: InsertDiagnosticCheck): Promise<DiagnosticCheck>;
  updateDiagnosticCheck(id: string, status: DiagnosticCheck['status'], result?: string, duration?: number): Promise<DiagnosticCheck>;
  
  // System Metrics
  getLatestSystemMetrics(): Promise<SystemMetrics | null>;
  createSystemMetrics(metrics: InsertSystemMetrics): Promise<SystemMetrics>;
  getSystemMetricsHistory(timeRange?: string): Promise<SystemMetrics[]>;
  
  // Alert Settings
  getAlertSettings(): Promise<AlertSettings | null>;
  updateAlertSettings(settings: Partial<InsertAlertSettings>): Promise<AlertSettings>;
  
  // Deployment Info
  getDeploymentInfo(): Promise<DeploymentInfo | null>;
  updateDeploymentInfo(info: Partial<DeploymentInfo>): Promise<DeploymentInfo>;
}

class MemStorage implements IStorage {
  private errorLogs: ErrorLog[] = [];
  private diagnosticChecks: DiagnosticCheck[] = [];
  private systemMetrics: SystemMetrics[] = [];
  private alertSettings: AlertSettings | null = null;
  private deploymentInfo: DeploymentInfo | null = null;

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Initialize with default alert settings
    this.alertSettings = {
      id: "default-settings",
      emailAlerts: true,
      smsAlerts: false,
      slackAlerts: true,
      alertThreshold: 5,
      updatedAt: new Date().toISOString(),
    };

    // Initialize deployment info
    this.deploymentInfo = {
      id: "deployment-info",
      lastDeploy: "2 ساعات",
      branch: "main",
      buildId: "abc123def",
      region: "us-east-1",
      status: "deployed",
      updatedAt: new Date().toISOString(),
    };

    // Initialize system metrics
    const currentMetrics: SystemMetrics = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      serviceStatus: "متاحة",
      uptime: 99.8,
      error502Count: 23,
      responseTime: 234,
      activeRequests: 1247,
      requestsPerSecond: 47.2,
      cpuUsage: 23,
      memoryUsage: 67,
    };
    this.systemMetrics.push(currentMetrics);
  }

  // Error Logs Methods
  async getErrorLogs(limit = 50, timeFilter = '24h'): Promise<ErrorLog[]> {
    const cutoffTime = new Date();
    switch (timeFilter) {
      case '1h':
        cutoffTime.setHours(cutoffTime.getHours() - 1);
        break;
      case '24h':
        cutoffTime.setDate(cutoffTime.getDate() - 1);
        break;
      case '7d':
        cutoffTime.setDate(cutoffTime.getDate() - 7);
        break;
    }

    return this.errorLogs
      .filter(log => new Date(log.timestamp) >= cutoffTime)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  async createErrorLog(errorLog: InsertErrorLog): Promise<ErrorLog> {
    const newLog: ErrorLog = {
      ...errorLog,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    this.errorLogs.push(newLog);
    return newLog;
  }

  async updateErrorLogStatus(id: string, status: 'active' | 'processing' | 'resolved'): Promise<ErrorLog> {
    const logIndex = this.errorLogs.findIndex(log => log.id === id);
    if (logIndex === -1) {
      throw new Error('Error log not found');
    }
    
    this.errorLogs[logIndex].status = status;
    return this.errorLogs[logIndex];
  }

  async getError502Count(timeRange = '24h'): Promise<number> {
    const logs = await this.getErrorLogs(1000, timeRange);
    return logs.filter(log => log.statusCode === 502).length;
  }

  // Diagnostic Checks Methods
  async getDiagnosticChecks(): Promise<DiagnosticCheck[]> {
    return this.diagnosticChecks.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async createDiagnosticCheck(check: InsertDiagnosticCheck): Promise<DiagnosticCheck> {
    const newCheck: DiagnosticCheck = {
      ...check,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    this.diagnosticChecks.push(newCheck);
    return newCheck;
  }

  async updateDiagnosticCheck(
    id: string, 
    status: DiagnosticCheck['status'], 
    result?: string, 
    duration?: number
  ): Promise<DiagnosticCheck> {
    const checkIndex = this.diagnosticChecks.findIndex(check => check.id === id);
    if (checkIndex === -1) {
      throw new Error('Diagnostic check not found');
    }
    
    this.diagnosticChecks[checkIndex].status = status;
    if (result !== undefined) this.diagnosticChecks[checkIndex].result = result;
    if (duration !== undefined) this.diagnosticChecks[checkIndex].duration = duration;
    
    return this.diagnosticChecks[checkIndex];
  }

  // System Metrics Methods
  async getLatestSystemMetrics(): Promise<SystemMetrics | null> {
    if (this.systemMetrics.length === 0) return null;
    return this.systemMetrics[this.systemMetrics.length - 1];
  }

  async createSystemMetrics(metrics: InsertSystemMetrics): Promise<SystemMetrics> {
    const newMetrics: SystemMetrics = {
      ...metrics,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    this.systemMetrics.push(newMetrics);
    
    // Keep only last 1000 entries
    if (this.systemMetrics.length > 1000) {
      this.systemMetrics = this.systemMetrics.slice(-1000);
    }
    
    return newMetrics;
  }

  async getSystemMetricsHistory(timeRange = '24h'): Promise<SystemMetrics[]> {
    const cutoffTime = new Date();
    switch (timeRange) {
      case '1h':
        cutoffTime.setHours(cutoffTime.getHours() - 1);
        break;
      case '24h':
        cutoffTime.setDate(cutoffTime.getDate() - 1);
        break;
      case '7d':
        cutoffTime.setDate(cutoffTime.getDate() - 7);
        break;
    }

    return this.systemMetrics
      .filter(metrics => new Date(metrics.timestamp) >= cutoffTime)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  // Alert Settings Methods
  async getAlertSettings(): Promise<AlertSettings | null> {
    return this.alertSettings;
  }

  async updateAlertSettings(settings: Partial<InsertAlertSettings>): Promise<AlertSettings> {
    if (!this.alertSettings) {
      this.alertSettings = {
        id: "default-settings",
        emailAlerts: true,
        smsAlerts: false,
        slackAlerts: true,
        alertThreshold: 5,
        updatedAt: new Date().toISOString(),
      };
    }

    this.alertSettings = {
      ...this.alertSettings,
      ...settings,
      updatedAt: new Date().toISOString(),
    };

    return this.alertSettings;
  }

  // Deployment Info Methods
  async getDeploymentInfo(): Promise<DeploymentInfo | null> {
    return this.deploymentInfo;
  }

  async updateDeploymentInfo(info: Partial<DeploymentInfo>): Promise<DeploymentInfo> {
    if (!this.deploymentInfo) {
      this.deploymentInfo = {
        id: "deployment-info",
        lastDeploy: "غير محدد",
        branch: "main",
        buildId: "غير محدد",
        region: "us-east-1",
        status: "unknown",
        updatedAt: new Date().toISOString(),
      };
    }

    this.deploymentInfo = {
      ...this.deploymentInfo,
      ...info,
      updatedAt: new Date().toISOString(),
    };

    return this.deploymentInfo;
  }
}

export const storage: IStorage = new MemStorage();
