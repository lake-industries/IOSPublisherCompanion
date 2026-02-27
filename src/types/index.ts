export interface IOSProject {
  id: string;
  name: string;
  bundleId: string;
  teamId: string;
  version: string;
  code: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectContextType {
  projects: IOSProject[];
  addProject: (project: Omit<IOSProject, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProject: (id: string, updates: Partial<IOSProject>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  getProjectById: (id: string) => IOSProject | undefined;
  loading: boolean;
  error: string | null;
}

export interface NavigationProps {
  navigation: any;
  route: any;
}
