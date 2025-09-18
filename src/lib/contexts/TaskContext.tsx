'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { Task } from '@/lib/types/database'
import { RealtimeChannel } from '@supabase/supabase-js'

type SortField = 'priority' | 'due_date' | 'createdAt';
type SortOrder = 'asc' | 'desc';

type TaskContextType = {
  tasks: Task[]
  loading: boolean
  error: string | null
  createTask: (task: Omit<Task, 'id'>) => Promise<Task>
  updateTask: (id: string, updates: Partial<Task>) => Promise<Task>
  deleteTask: (id: string) => Promise<void>
  getProjectTasks: (projectId: string, sortBy?: SortField, sortOrder?: SortOrder) => Task[]
  sortTasks: (tasks: Task[], sortBy: SortField, sortOrder: SortOrder) => Task[]
}

const TaskContext = createContext<TaskContextType | undefined>(undefined)

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  
  // Sort tasks by priority and due date
  const sortTasks = useCallback((tasks: Task[], sortBy: SortField = 'priority', sortOrder: SortOrder = 'desc'): Task[] => {
    return [...tasks].sort((a, b) => {
      // Priority sorting (High > Medium > Low)
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      
      if (sortBy === 'priority') {
        const aPriority = priorityOrder[a.priority.toLowerCase() as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.priority.toLowerCase() as keyof typeof priorityOrder] || 0;
        return sortOrder === 'desc' ? bPriority - aPriority : aPriority - bPriority;
      }
      
      // Due date sorting
      if (sortBy === 'due_date') {
        const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
        const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
        return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
      }
      
      return 0;
    });
  }, []);

  // Memoize the task formatter to prevent recreation on each render
  // Type for raw task data from the database (snake_case)
  type DatabaseTask = Omit<Task, 'dueDate' | 'projectId' | 'assigneeId' | 'createdBy' | 'createdAt' | 'updatedAt'> & {
    due_date: string | null;
    project_id: string | null;
    assignee_id: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
  };

  const formatTask = useCallback((task: DatabaseTask): Task => ({
    ...task,
    due_date: task.due_date,
    project_id: task.project_id,
    assignee_id: task.assignee_id,
    created_by: task.created_by,
    created_at: task.created_at,
    updated_at: task.updated_at,
    dueDate: task.due_date,
    projectId: task.project_id,
    assigneeId: task.assignee_id,
    createdBy: task.created_by,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
    creator: task.creator,
    assignee: task.assignee,
    project: task.project
  }), []);

  // Fetch all tasks on mount
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select(`
          *,
          creator:profiles!tasks_created_by_fkey(*),
          assignee:profiles!tasks_assignee_id_fkey(*),
          project:projects!tasks_project_id_fkey(id, name, status)
        `);
      
      if (error) throw error;

      const formattedTasks = tasks.map(formatTask);
      setTasks(formattedTasks);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [formatTask]);

  // Create a stable reference to the supabase client
  const supabaseRef = useRef(supabase);
  
  // Set up realtime subscription and initial fetch
  useEffect(() => {
    let isMounted = true;
    let subscription: RealtimeChannel | null = null;

    const setupSubscription = () => {
      subscription = supabaseRef.current
        .channel('tasks')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'tasks' 
          },
          (payload) => {
            if (!isMounted) return;
            
            setTasks(prevTasks => {
              if (payload.eventType === 'INSERT') {
                return [formatTask(payload.new as DatabaseTask), ...prevTasks];
              } 
              if (payload.eventType === 'UPDATE') {
                return prevTasks.map(task => 
                  task.id === payload.new.id ? formatTask({ ...task, ...payload.new }) : task
                );
              }
              if (payload.eventType === 'DELETE') {
                return prevTasks.filter(task => task.id !== payload.old.id);
              }
              return prevTasks;
            });
          }
        )
        .subscribe();
    };

    // Initial data fetch
    const initialize = async () => {
      await fetchTasks();
      if (isMounted) {
        setupSubscription();
      }
    };

    initialize();

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [fetchTasks, formatTask]);

  const createTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      
      const assigneeId = task.assignee_id || task.assigneeId;
      const projectId = task.project_id || task.projectId;
      
      // If there's an assignee and a project, ensure they're a member
      if (assigneeId && projectId) {
        try {
          // First, check if the assignee is already a member
          const { data: existingMember, error: memberCheckError } = await supabase
            .from('project_members')
            .select('id')
            .eq('project_id', projectId)
            .eq('user_id', assigneeId)
            .maybeSingle();
            
          if (memberCheckError) throw memberCheckError;
          
          // If not a member, add them as a member with 'member' role
          if (!existingMember) {
            const { error: addMemberError } = await supabase
              .from('project_members')
              .insert([
                { 
                  project_id: projectId, 
                  user_id: assigneeId, 
                  role: 'member' 
                }
              ]);
              
            if (addMemberError) throw addMemberError;
            console.log(`Added user ${assigneeId} as member to project ${projectId}`);
          }
        } catch (memberError) {
          console.error('Error managing project member:', memberError);
          // Don't fail the task creation if member addition fails
          // Just log the error and continue
        }
      }
      
      // Prepare task data for database (using snake_case)
      const taskData = {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date || task.dueDate || null,
        project_id: projectId,
        assignee_id: assigneeId,
        created_by: task.created_by || task.createdBy
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select('*')
        .single();
      
      if (error) throw error;

      // Format the task with both snake_case and camelCase properties
      const newTask: Task = {
        ...data,
        // Original snake_case
        due_date: data.due_date,
        project_id: data.project_id,
        assignee_id: data.assignee_id,
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: data.updated_at,
        // camelCase aliases
        dueDate: data.due_date,
        projectId: data.project_id,
        assigneeId: data.assignee_id,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        // Include relations if they exist
        project: task.project,
        creator: task.creator,
        assignee: task.assignee
      };

      setTasks(prev => [...prev, newTask]);
      return newTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
      console.error('Error creating task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  const updateTask = async (id: string, updates: Partial<Task>): Promise<Task> => {
    try {
      setLoading(true);
      
      // Convert camelCase to snake_case for database
      const updateData = { ...updates };
      
      // Handle field name conversions
      if ('dueDate' in updates) {
        updateData.due_date = updates.dueDate;
        delete updateData.dueDate;
      }
      if ('projectId' in updates) {
        updateData.project_id = updates.projectId;
        delete updateData.projectId;
      }
      if ('assigneeId' in updates) {
        updateData.assignee_id = updates.assigneeId;
        delete updateData.assigneeId;
      }
      if ('createdBy' in updates) {
        updateData.created_by = updates.createdBy;
        delete updateData.createdBy;
      }
      if ('createdAt' in updates) {
        updateData.created_at = updates.createdAt;
        delete updateData.createdAt;
      }
      if ('updatedAt' in updates) {
        updateData.updated_at = updates.updatedAt;
        delete updateData.updatedAt;
      }

      // Always ensure we have the latest updated_at timestamp
      if (!('updated_at' in updateData)) {
        updateData.updated_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          creator:profiles!tasks_created_by_fkey(*),
          assignee:profiles!tasks_assignee_id_fkey(*),
          project:projects!tasks_project_id_fkey(id, name, status)
        `)
        .single();
      
      if (error) throw error;

      // Format the updated task with both snake_case and camelCase properties
      const updatedTask = {
        ...data,
        dueDate: data.due_date,
        projectId: data.project_id,
        assigneeId: data.assignee_id,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        creator: data.creator,
        assignee: data.assignee,
        project: data.project
      };

      // Update local state with the updated task
      setTasks(prev => 
        prev.map(task => task.id === id ? updatedTask : task)
      );

      return updatedTask;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task');
      console.error('Error updating task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  const deleteTask = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      
      // 1. First, get the task to be deleted
      const { data: taskToDelete, error: fetchError } = await supabase
        .from('tasks')
        .select('id, project_id, assignee_id')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      if (!taskToDelete) {
        throw new Error('Task not found');
      }
      
      const { project_id: projectId, assignee_id: assigneeId } = taskToDelete;
      
      // 2. Delete the task
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // 3. If the task had an assignee, check if they should be removed from project members
      if (assigneeId && projectId) {
        try {
          // Check if the assignee has any other tasks in this project
          const { count, error: countError } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .eq('assignee_id', assigneeId)
            .neq('id', id); // Exclude the task being deleted
            
          if (countError) throw countError;
          
          // If no other tasks found for this assignee in the project, remove them from project members
          if (count === 0) {
            const { error: deleteMemberError } = await supabase
              .from('project_members')
              .delete()
              .eq('project_id', projectId)
              .eq('user_id', assigneeId);
              
            if (deleteMemberError) {
              console.error('Error removing project member:', deleteMemberError);
              // Don't fail the task deletion if member removal fails
            } else {
              console.log(`Removed user ${assigneeId} from project ${projectId} members`);
            }
          }
        } catch (memberError) {
          console.error('Error managing project member during task deletion:', memberError);
          // Don't fail the task deletion if member check/removal fails
        }
      }
      
      // 4. Update local state by removing the deleted task
      setTasks(prevTasks => prevTasks.filter(task => task.id !== id));
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      console.error('Error deleting task:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getProjectTasks = useCallback((projectId: string, sortBy: SortField = 'createdAt', sortOrder: SortOrder = 'desc'): Task[] => {
    // Filter tasks by project ID
    const filteredTasks = tasks.filter(task => task.projectId === projectId);
    
    // Apply sorting if needed
    if (sortBy) {
      return sortTasks(filteredTasks, sortBy, sortOrder);
    }
    
    return filteredTasks;
  }, [tasks, sortTasks]);

  return (
    <TaskContext.Provider value={{
      tasks,
      loading,
      error,
      createTask,
      updateTask,
      deleteTask,
      getProjectTasks,
      sortTasks
    }}>
      {children}
    </TaskContext.Provider>
  )
}

export const useTasks = (): TaskContextType => {
  const context = useContext(TaskContext)
  if (context === undefined) {
    throw new Error('useTasks must be used within a TaskProvider')
  }
  return context
}
