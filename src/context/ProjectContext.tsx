import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-community/async-storage';
import { IOSProject, ProjectContextType } from '../types';
import { uuid } from '../utils/uuid';

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const STORAGE_KEY = '@ios_publisher_projects';

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<IOSProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load projects from AsyncStorage on mount
  useEffect(() => {
    loadProjects();
  }, []);

  // Auto-save projects to AsyncStorage whenever they change
  useEffect(() => {
    if (!loading) {
      saveProjects(projects);
    }
  }, [projects]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProjects(JSON.parse(stored));
      }
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load projects';
      setError(errorMsg);
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveProjects = async (projectsToSave: IOSProject[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(projectsToSave));
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save projects';
      setError(errorMsg);
      console.error('Error saving projects:', err);
    }
  };

  const addProject = async (projectData: Omit<IOSProject, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newProject: IOSProject = {
        ...projectData,
        id: uuid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setProjects(prev => [...prev, newProject]);
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add project';
      setError(errorMsg);
      throw err;
    }
  };

  const updateProject = async (id: string, updates: Partial<IOSProject>) => {
    try {
      setProjects(prev =>
        prev.map(project =>
          project.id === id
            ? { ...project, ...updates, updatedAt: Date.now() }
            : project
        )
      );
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update project';
      setError(errorMsg);
      throw err;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      setProjects(prev => prev.filter(project => project.id !== id));
      setError(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete project';
      setError(errorMsg);
      throw err;
    }
  };

  const getProjectById = (id: string): IOSProject | undefined => {
    return projects.find(project => project.id === id);
  };

  const value: ProjectContextType = {
    projects,
    addProject,
    updateProject,
    deleteProject,
    getProjectById,
    loading,
    error,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjects must be used within ProjectProvider');
  }
  return context;
};
