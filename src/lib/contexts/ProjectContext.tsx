'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase';
import { Database } from '@/lib/types/database';

type ProjectWithTasks = Database['public']['Tables']['projects']['Row'] & {
  tasks?: Database['public']['Tables']['tasks']['Row'][];
};

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

interface ProjectContextType {
  projects: ProjectWithTasks[] | null;
  loading: boolean;
  error: string | null;
  createProject: (project: Omit<ProjectInsert, 'owner_id'>) => Promise<Project>;
  updateProject: (id: string, updates: ProjectUpdate) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
  getProject: (id: string) => Project | undefined;
  addProjectMember: (projectId: string, userId: string, role?: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      // First, get all project IDs where the user is a member
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', session.user.id);

      if (memberError) throw memberError;
      
      // Get all project IDs where user is either owner or member
      const projectIds = [
        ...(memberProjects?.map(p => p.project_id) || [])
      ];

      // If no projects found and not an owner, return empty array
      if (projectIds.length === 0) {
        setProjects([]);
        return;
      }

      // Fetch projects where user is either owner or member
      let query = supabase
        .from('projects')
        .select(`
          *,
          tasks (*)
        `);
      
      // If user has member projects, add them to the query
      if (projectIds.length > 0) {
        query = query.or(`id.in.(${projectIds.join(',')}),owner_id.eq.${session.user.id}`);
      } else {
        // If no member projects, only get owned projects
        query = query.eq('owner_id', session.user.id);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (project: Omit<ProjectInsert, 'owner_id'>): Promise<Project> => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('Not authenticated');
      }

      // Start a transaction to ensure both operations succeed or fail together
      const { data, error } = await supabase
        .from('projects')
        .insert([{ ...project, owner_id: session.user.id }])
        .select()
        .single();

      if (error) throw error;
      
      // Add the creator as an owner of the project
      const { error: memberError } = await supabase
        .from('project_members')
        .insert([
          { 
            project_id: data.id, 
            user_id: session.user.id, 
            role: 'owner' 
          }
        ]);

      if (memberError) throw memberError;
      
      setProjects(prev => prev ? [data, ...prev] : [data]);
      return data;
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (id: string, updates: ProjectUpdate): Promise<Project> => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      await fetchProjects();
      return data;
    } catch (err) {
      console.error('Error updating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to update project');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      setLoading(true);
      
      // First, delete all project members
      const { error: deleteMembersError } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', id);
        
      if (deleteMembersError) throw deleteMembersError;
      
      // Then delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setProjects(prev => prev?.filter(project => project.id !== id) || []);
      
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getProject = (id: string) => {
    return projects?.find(project => project.id === id);
  };

  const addProjectMember = async (projectId: string, userId: string, role: string = 'member'): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase
        .from('project_members')
        .insert([
          { 
            project_id: projectId, 
            user_id: userId, 
            role: role as 'owner' | 'admin' | 'member'
          }
        ]);

      if (error) throw error;
      
      // Refresh the projects to reflect the new member
      await fetchProjects();
    } catch (err) {
      console.error('Error adding project member:', err);
      setError(err instanceof Error ? err.message : 'Failed to add project member');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchProjects();
  }, []);

  const value = {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    fetchProjects,
    getProject,
    addProjectMember,
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjects must be used within a ProjectProvider');
  }
  return context;
};
