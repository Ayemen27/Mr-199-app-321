import { useState, useEffect, useCallback } from "react";

const SELECTED_PROJECT_KEY = "construction-app-selected-project";
const SELECTED_PROJECT_NAME_KEY = "construction-app-selected-project-name";

export function useSelectedProject() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedProjectName, setSelectedProjectName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);

  // تحميل المشروع المحفوظ عند بدء التطبيق
  useEffect(() => {
    try {
      const savedProjectId = localStorage.getItem(SELECTED_PROJECT_KEY);
      const savedProjectName = localStorage.getItem(SELECTED_PROJECT_NAME_KEY);
      

      
      if (savedProjectId && savedProjectId !== "undefined" && savedProjectId !== "null") {
        setSelectedProjectId(savedProjectId);
        if (savedProjectName) {
          setSelectedProjectName(savedProjectName);
        }
      }
    } catch (error) {

      // في حالة وجود خطأ، قم بمسح البيانات الفاسدة
      localStorage.removeItem(SELECTED_PROJECT_KEY);
      localStorage.removeItem(SELECTED_PROJECT_NAME_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // حفظ المشروع في localStorage عند تغييره
  const selectProject = useCallback((projectId: string, projectName?: string) => {

    
    setSelectedProjectId(projectId);
    
    if (projectName) {
      setSelectedProjectName(projectName);
    }
    
    try {
      if (projectId && projectId !== "undefined" && projectId !== "null") {
        localStorage.setItem(SELECTED_PROJECT_KEY, projectId);
        if (projectName) {
          localStorage.setItem(SELECTED_PROJECT_NAME_KEY, projectName);
        }

      } else {
        localStorage.removeItem(SELECTED_PROJECT_KEY);
        localStorage.removeItem(SELECTED_PROJECT_NAME_KEY);
        setSelectedProjectName("");

      }
    } catch (error) {

    }
  }, []);

  // دالة لمسح الاختيار الحالي
  const clearProject = useCallback(() => {

    selectProject("", "");
  }, [selectProject]);

  // دالة للتحقق من وجود مشروع محفوظ
  const hasStoredProject = useCallback(() => {
    try {
      const storedId = localStorage.getItem(SELECTED_PROJECT_KEY);
      return storedId && storedId !== "undefined" && storedId !== "null";
    } catch {
      return false;
    }
  }, []);

  return {
    selectedProjectId,
    selectedProjectName,
    isLoading,
    selectProject,
    clearProject,
    hasStoredProject,
    projects,
  };
}