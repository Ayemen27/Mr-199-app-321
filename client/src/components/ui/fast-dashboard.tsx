import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Receipt, ShoppingCart, BarChart, ArrowRight } from "lucide-react";
import { useSelectedProject } from "@/hooks/use-selected-project";
import ProjectSelector from "@/components/project-selector";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { formatCurrency } from "@/lib/utils";
import type { Project } from "@shared/schema";

// Dashboard مبسط مع أقل عدد من الطلبات
export default function FastDashboard() {
  const [, setLocation] = useLocation();
  const { selectedProjectId, selectProject } = useSelectedProject();

  // تحميل المشاريع فقط
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    staleTime: 1000 * 60 * 30, // 30 دقيقة
  });

  const selectedProject = Array.isArray(projects) ? projects.find(p => p.id === selectedProjectId) : undefined;

  const quickActions = [
    {
      icon: Clock,
      label: "تسجيل حضور",
      bgColor: "bg-primary",
      hoverColor: "hover:bg-primary/90",
      textColor: "text-primary-foreground",
      action: () => setLocation("/worker-attendance"),
    },
    {
      icon: Receipt,
      label: "مصروفات يومية", 
      bgColor: "bg-secondary",
      hoverColor: "hover:bg-secondary/90",
      textColor: "text-secondary-foreground",
      action: () => setLocation("/daily-expenses"),
    },
    {
      icon: ShoppingCart,
      label: "شراء مواد",
      bgColor: "bg-success",
      hoverColor: "hover:bg-success/90", 
      textColor: "text-success-foreground",
      action: () => setLocation("/material-purchase"),
    },
    {
      icon: BarChart,
      label: "التقارير",
      bgColor: "bg-purple-600",
      hoverColor: "hover:bg-purple-700",
      textColor: "text-white",
      action: () => setLocation("/reports"),
    },
    {
      icon: ArrowRight,
      label: "ترحيل أموال",
      bgColor: "bg-orange-600", 
      hoverColor: "hover:bg-orange-700",
      textColor: "text-white",
      action: () => setLocation("/project-transfers"),
    },
  ];

  if (projectsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center space-y-3">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground text-sm">جاري تحميل المشاريع...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* اختيار المشروع */}
      <ProjectSelector
        selectedProjectId={selectedProjectId}
        onProjectChange={(projectId, projectName) => selectProject(projectId, projectName)}
      />

      {/* معلومات المشروع المبسطة */}
      {selectedProject && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">{selectedProject.name}</h3>
              <Badge variant="secondary" className="bg-success text-success-foreground">
                نشط
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              اضغط على "التقارير" لعرض الإحصائيات التفصيلية والبيانات المالية
            </p>
          </CardContent>
        </Card>
      )}

      {/* الإجراءات السريعة */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-lg font-bold text-foreground mb-4">إجراءات سريعة</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  onClick={action.action}
                  className={`${action.bgColor} ${action.hoverColor} ${action.textColor} p-4 h-auto flex-col space-y-2 transition-colors quick-load`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-sm font-medium">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* روابط سريعة */}
      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          className="h-12 border-2 border-blue-300 hover:bg-blue-50"
          onClick={() => setLocation("/projects")}
        >
          <span className="text-blue-700 font-medium">إدارة المشاريع</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="h-12 border-2 border-green-300 hover:bg-green-50"
          onClick={() => setLocation("/workers")}
        >
          <span className="text-green-700 font-medium">إدارة العمال</span>
        </Button>
      </div>
    </div>
  );
}