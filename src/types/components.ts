// client/src/types/components.ts
export type ProjectId = string;

export interface Project {
  id: ProjectId;
  name: string;
  status: 'active' | 'completed' | 'paused';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProjectSelectorProps {
  selectedId?: ProjectId;
  onProjectChange: (id: ProjectId) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

// انواع اضافية مشتركة
export interface SelectOption {
  id: string;
  name: string;
}

export interface BaseFormProps {
  onSubmit: (data: any) => void;
  onCancel?: () => void;
  disabled?: boolean;
}