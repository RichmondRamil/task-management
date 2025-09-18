'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTasks } from '@/lib/contexts/TaskContext';
import { getStatusColor, formatStatus } from '@/lib/utils/projectUtils';
import { TaskStatus, TaskPriority } from '@/lib/types/database';
import { useProjects } from '@/lib/contexts/ProjectContext';
import { useProfiles } from '@/lib/contexts/ProfileContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Task, Project, ProjectStatus } from '@/lib/types/database';
import { TaskModal } from './TaskModal';
import { ProjectModal } from './ProjectModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Edit, Check, X, ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';

export default function Dashboard() {
  // Auth and data hooks
  const { user, loading: authLoading, createProfile, fetchProfile, profile: userProfile } = useAuth();
  const {
    projects,
    loading: projectsLoading,
    createProject,
    updateProject,
    deleteProject
  } = useProjects();

  const {
    tasks: allTasks,
    updateTask,
    deleteTask,
    getProjectTasks,
    createTask: createTaskFromContext
  } = useTasks();
  
  const { profiles } = useProfiles();

  // State management
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  // Delete modal states
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [isDeleteTaskModalOpen, setIsDeleteTaskModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; type: 'project' | 'task' } | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectTasks, setProjectTasks] = useState<Record<string, Task[]>>({});
  const hasCheckedProfile = useRef(false);

  // Check and create profile if it doesn't exist
  useEffect(() => {
    const checkAndCreateProfile = async () => {
      if (!user || hasCheckedProfile.current) return;
      hasCheckedProfile.current = true;

      // Check if profile exists in the profiles array
      const profileExists = profiles.some(profile => profile.id === user.id);
      
      if (!profileExists) {
        try {
          await createProfile(
            user.id, 
            user.email || '', 
            user.user_metadata?.display_name || user.email?.split('@')[0] || 'User'
          );
          console.log('Profile created successfully');
        } catch (error) {
          console.error('Error creating profile:', error);
        }
      } else {
        console.log('Profile exists');
      }
    };

    checkAndCreateProfile();
  }, [user, profiles, createProfile]);
  const [sortConfig, setSortConfig] = useState<{
    key: 'priority' | 'dueDate' | 'title' | 'status';
    direction: 'asc' | 'desc';
  }>({ key: 'dueDate', direction: 'asc' });

  // Get priority color class
  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status color class
  const getStatusColor = (status: string) => {
    if (status === 'done') return 'bg-green-100 text-green-800';
    if (status === 'in_progress') return 'bg-blue-100 text-blue-800';
    if (status === 'todo') return 'bg-gray-100 text-gray-800';
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'completed') return 'bg-blue-100 text-blue-800';
    if (status === 'archived') return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No due date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Toggle task status
  const toggleTaskStatus = async (task: Task) => {
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      await updateTask(task.id, { status: newStatus });
      toast.success(`Task marked as ${newStatus === 'done' ? 'completed' : 'incomplete'}`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  // Project operations
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !user?.id) return;

    try {
      await createProject({
        name: projectName,
        description: null,
        status: 'active',
        owner_id: user.id
      } as Omit<Project, 'id' | 'created_at' | 'updated_at'>);
      setProjectName('');
      toast.success('Project created successfully');
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  const handleProjectSubmit = async (projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> => {
    try {
      let result: Project;
      if (editingProject) {
        result = await updateProject(editingProject.id, {
          name: projectData.name,
          description: projectData.description,
          status: projectData.status
        });
        toast.success('Project updated successfully');
      } else if (user?.id) {
        const projectToCreate = {
          ...projectData,
          owner_id: user.id
        };
        result = await createProject(projectToCreate);
        toast.success('Project created successfully');
      } else {
        throw new Error('User not authenticated');
      }
      return result!;
    } catch (error) {
      console.error('Error saving project:', error);
      toast.error(`Failed to ${editingProject ? 'update' : 'create'} project`);
      throw error;
    } finally {
      setIsProjectModalOpen(false);
      setEditingProject(null);
    }
  };

  // Fetch tasks for a project
  const fetchProjectTasks = useCallback(async (projectId: string) => {
    try {
      const tasks = await getProjectTasks(projectId);
      setProjectTasks(prev => ({
        ...prev,
        [projectId]: tasks
      }));
      return tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
      return [];
    }
  }, [getProjectTasks]);

  // Task operations
  type CreateTaskData = {
    title: string;
    description?: string | null;
    status?: TaskStatus;
    project_id?: string;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
    createdAt?: string;
    updatedAt?: string;
    priority?: TaskPriority;
    dueDate?: string | null;
    assigneeId?: string | null;
  };

  const createTask = async (taskData: CreateTaskData) => {
    if (!user) {
      toast.error('You must be logged in to create a task');
      return;
    }

    try {
      const now = new Date().toISOString();
      const dueDate = taskData.dueDate || null;
      const projectId = selectedProjectId;
      const assigneeId = taskData.assigneeId || null;
      const createdBy = user.id;

      if (!projectId) {
        throw new Error('No project selected');
      }

      const taskToCreate = {
        title: taskData.title,
        description: taskData.description || null,
        status: taskData.status || 'todo',
        priority: taskData.priority || 'medium',
        due_date: dueDate,
        project_id: projectId,
        assignee_id: assigneeId,
        created_by: createdBy,
        created_at: now,
        updated_at: now,

        // Frontend fields (camelCase)
        dueDate: dueDate,
        projectId: projectId,
        assigneeId: assigneeId,
        createdBy: createdBy,
        createdAt: now,
        updatedAt: now,
      };

      // Use the createTask function from TaskContext
      await createTaskFromContext(taskToCreate);
      toast.success('Task created successfully');
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTask = async (taskId: string, taskData: Partial<Omit<Task, 'id' | 'project_id' | 'created_by' | 'created_at' | 'updated_at'>>) => {
    try {
      await updateTask(taskId, taskData);
      toast.success('Task updated successfully');
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  // Handle project deletion
  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      toast.success('Project deleted successfully');
      setSelectedProjectId(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    } finally {
      setItemToDelete(null);
      setIsDeleteProjectModalOpen(false);
    }
  };

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success('Task deleted successfully');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    } finally {
      setItemToDelete(null);
      setIsDeleteTaskModalOpen(false);
    }
  };

  // Sort tasks based on sortConfig
  const sortTasks = (tasks: Task[]) => {
    if (!sortConfig) return tasks;

    return [...tasks].sort((a, b) => {
      let aValue: any, bValue: any;

      if (sortConfig.key === 'dueDate') {
        aValue = a.due_date ? new Date(a.due_date).getTime() : Number.MAX_SAFE_INTEGER;
        bValue = b.due_date ? new Date(b.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      } else if (sortConfig.key === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      } else if (sortConfig.key === 'status') {
        const statusOrder = { todo: 1, in_progress: 2, done: 3 };
        aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
        bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
      } else {
        aValue = a[sortConfig.key as keyof Task];
        bValue = b[sortConfig.key as keyof Task];
      }

      if (aValue === bValue) return 0;
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  };

  // UI helpers
  const getProjectStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  type StatusStyle = {
    bg: string;
    text: string;
    border: string;
    icon: string;
  };

  const getTaskStatusStyle = (status: TaskStatus): StatusStyle => {
    switch (status) {
      case 'done':
        return { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', icon: '✓' };
      case 'in_progress':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: '⟳' };
      case 'todo':
        return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: '○' };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', icon: '?' };
    }
  };

  const getPriorityStyle = (priority: TaskPriority): StatusStyle => {
    switch (priority) {
      case 'high':
        return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', icon: '' };
      case 'medium':
        return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100', icon: '' };
      case 'low':
        return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', icon: '' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', icon: '' };
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      case 'todo':
        return 'To Do';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const getPriorityLabel = (priority: TaskPriority) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  // Fallback for any existing usage of the old function
  const getTaskStatusColor = (status: TaskStatus) => getTaskStatusStyle(status).text + ' ' + getTaskStatusStyle(status).bg;

  const startEditing = (project: Project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  // Load tasks when component mounts and when projects change
  useEffect(() => {
    const loadTasks = async () => {
      if (projects && projects.length > 0) {
        await Promise.all(projects.map(project => fetchProjectTasks(project.id)));
      }
    };
    loadTasks();
  }, [projects, fetchProjectTasks]);

  // Handle project deletion confirmation
  const handleDeleteProjectClick = (projectId: string) => {
    setItemToDelete({ id: projectId, type: 'project' });
    setIsDeleteProjectModalOpen(true);
  };

  // Handle task deletion confirmation
  const handleDeleteTaskClick = (taskId: string) => {
    setItemToDelete({ id: taskId, type: 'task' });
    setIsDeleteTaskModalOpen(true);
  };

  // Handle confirmed deletion
  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      if (itemToDelete.type === 'project') {
        await deleteProject(itemToDelete.id);
        toast.success('Project deleted successfully');
        setSelectedProjectId(null);
        setIsDeleteProjectModalOpen(false);
      } else {
        await deleteTask(itemToDelete.id);
        toast.success('Task deleted successfully');
        
        // Refresh tasks for the current project
        if (selectedProjectId) {
          const tasks = await getProjectTasks(selectedProjectId);
          setProjectTasks(prev => ({
            ...prev,
            [selectedProjectId]: tasks
          }));
        }
        setIsDeleteTaskModalOpen(false);
      }
    } catch (error) {
      console.error(`Error deleting ${itemToDelete.type}:`, error);
      toast.error(`Failed to delete ${itemToDelete.type}`);
    } finally {
      setItemToDelete(null);
    }
  };

  // Show loading state
  if (authLoading || projectsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Task Manager</h1>
        <Button
          onClick={() => {
            setEditingProject(null);
            setIsProjectModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col h-full">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold">{project.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>{projectTasks[project.id]?.length || 0} {projectTasks[project.id]?.length === 1 ? 'task' : 'tasks'}</span>
                      <span>•</span>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusColor(project.status)}`}>
                        {formatStatus(project.status)}
                      </span>
                      <span>•</span>
                      <span>{new Date(project.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingProject(project);
                        setIsProjectModalOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteProjectClick(project.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="space-y-2 flex-1">
                  <Button
                    variant="outline"
                    className="w-full mb-4"
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setEditingTask(null);
                      setIsTaskModalOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                  {projectTasks[project.id] && sortTasks(projectTasks[project.id]).map((task) => (
                    <div key={task.id} className="p-3 border rounded-lg mb-2 hover:bg-gray-50 relative">
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => toggleTaskStatus(task)}
                          className={`mt-1 flex-shrink-0 h-4 w-4 rounded border ${task.status === 'done'
                              ? 'bg-green-500 border-green-600 text-white'
                              : 'border-gray-300 hover:border-gray-400'
                            } flex items-center justify-center`}
                        >
                          {task.status === 'done' && <Check className="h-3 w-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${task.status === 'done' ? 'line-through text-gray-400' : ''}`}>
                                {task.title}
                              </span>
                              {task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done' && (
                                <span className="text-xs text-red-500">(Overdue)</span>
                              )}
                            </div>
                            {task.assignee_id && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Avatar className="h-6 w-6 text-xs">
                                      <AvatarFallback>
                                        {profiles.find(p => p.id === task.assignee_id)?.full_name
                                          ?.split(' ')
                                          .map(n => n[0])
                                          .join('') || '?'}
                                      </AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Assigned to: {profiles.find(p => p.id === task.assignee_id)?.full_name || 'Unknown'}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          {task.description && (
                            <p
                              className={`text-sm mt-1 ${task.status === 'done' ? 'text-gray-400' : 'text-gray-600'
                                }`}
                            >
                              {task.description}
                            </p>
                          )}

                          {/* Bottom row with due date on left and status/priority on right */}
                          <div className="flex items-center justify-between mt-3 w-full gap-3">
                            {/* Due date section */}
                            <div className="flex-shrink-0 min-w-0">
                              {task.due_date && (
                                <div className="text-xs text-gray-500 flex items-center">
                                  <span className={task.status === 'done' ? 'line-through' : ''}>
                                    {formatDate(task.due_date)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Status and priority badges */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Priority badge */}
                              <div className={`
                                              flex items-center justify-center 
                                              min-w-[80px] px-2.5 py-1 
                                              rounded-full border 
                                              ${getPriorityStyle(task.priority as TaskPriority).border} 
                                              ${getPriorityStyle(task.priority as TaskPriority).bg} 
                                              ${getPriorityStyle(task.priority as TaskPriority).text} 
                                              text-xs font-medium
                                            `}>
                                <span className="mr-1.5 leading-none">
                                  {getPriorityStyle(task.priority as TaskPriority).icon}
                                </span>
                                <span className="truncate leading-none">
                                  {getPriorityLabel(task.priority as TaskPriority)}
                                </span>
                              </div>

                              {/* Status badge */}
                              <div className={`
                                            flex items-center justify-center 
                                            min-w-[90px] px-2.5 py-1 
                                            rounded-full border 
                                            ${getTaskStatusStyle(task.status as TaskStatus).border} 
                                            ${getTaskStatusStyle(task.status as TaskStatus).bg} 
                                            ${getTaskStatusStyle(task.status as TaskStatus).text} 
                                            text-xs font-medium
                                          `}>
                                <span className="mr-1.5 leading-none">
                                  {getTaskStatusStyle(task.status as TaskStatus).icon}
                                </span>
                                <span className="truncate leading-none">
                                  {getStatusLabel(task.status as TaskStatus)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTask(task);
                              setIsTaskModalOpen(true);
                            }}
                            className="text-blue-400 hover:text-blue-600 p-1 transition-colors"
                            title="Edit task"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTaskClick(task.id);
                            }}
                            className="text-red-400 hover:text-red-600 p-1 transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">Team Members:</div>
                    <div className="flex -space-x-2">
                      {Array.from(new Set(
                        projectTasks[project.id]?.flatMap(task => 
                          task.assignee_id ? [task.assignee_id] : []
                        ) || []
                      )).slice(0, 5).map((assigneeId) => {
                        const profile = profiles.find(p => p.id === assigneeId);
                        if (!profile) return null;
                        
                        return (
                          <TooltipProvider key={assigneeId}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Avatar className="h-8 w-8 border-2 border-white dark:border-gray-800 hover:z-10 transition-transform hover:scale-110">
                                  <AvatarFallback className="text-xs">
                                    {profile.full_name
                                      ?.split(' ')
                                      .map(n => n[0])
                                      .join('') || '?'}
                                  </AvatarFallback>
                                </Avatar>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{profile.full_name || 'Unknown'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                      {new Set(
                        projectTasks[project.id]?.flatMap(task => 
                          task.assignee_id ? [task.assignee_id] : []
                        ) || []
                      ).size > 5 && (
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                          +{new Set(
                            projectTasks[project.id]?.flatMap(task => 
                              task.assignee_id ? [task.assignee_id] : []
                            ) || []
                          ).size - 5}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium">No projects yet</h3>
          <p className="text-gray-500 mt-1">Create your first project to get started</p>
        </div>
      )}

      {user?.id && (
        <TaskModal
          open={isTaskModalOpen}
          onOpenChange={(open) => {
            setIsTaskModalOpen(open);
            if (!open) setEditingTask(null);
          }}
          projectId={editingTask?.project_id || selectedProjectId || ''}
          userId={user.id}
          task={editingTask}
          profiles={profiles}
          onSubmit={async (formData) => {
            try {
              // Ensure we have a project ID (should always be true due to the UI flow)
              const projectId = editingTask?.project_id || selectedProjectId;
              if (!projectId) {
                throw new Error('No project selected');
              }

              // Prepare task data for create/update
              const taskData = {
                title: formData.title,
                description: formData.description || null,
                due_date: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
                priority: formData.priority,
                status: formData.status,
                project_id: projectId,
                created_by: user.id,
                assignee_id: formData.assigneeId,  // Use the assigneeId from form data
                // Include camelCase versions for frontend compatibility
                dueDate: formData.dueDate,
                projectId: projectId,
                createdBy: user.id,
                assigneeId: formData.assigneeId    // Use the assigneeId from form data
              };

              if (editingTask) {
                // Update existing task
                await updateTask(editingTask.id, taskData);
                toast.success('Task updated successfully');
              } else {
                // Create new task with all required fields
                const newTask: Omit<Task, 'id'> = {
                  title: taskData.title,
                  description: taskData.description,
                  due_date: taskData.due_date,
                  dueDate: taskData.due_date,
                  priority: taskData.priority,
                  status: taskData.status,
                  project_id: taskData.project_id,
                  projectId: taskData.project_id,
                  created_by: taskData.created_by,
                  createdBy: taskData.created_by,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  assignee_id: taskData.assignee_id,
                  assigneeId: taskData.assignee_id,
                  // These will be populated by the database
                  assignee: null,
                  creator: null,
                  project: null
                };
                await createTaskFromContext(newTask);
                toast.success('Task created successfully');
              }
              
              // Refresh tasks for the current project
              const currentProjectId = editingTask?.project_id || selectedProjectId;
              if (currentProjectId) {
                const tasks = await getProjectTasks(currentProjectId);
                setProjectTasks((prev) => ({ ...prev, [currentProjectId]: tasks }));
              }
              
              setIsTaskModalOpen(false);
              setEditingTask(null);
            } catch (error) {
              console.error('Error saving task:', error);
              toast.error('Failed to save task');
            }
          }}
        />
      )}

      {/* Delete Project Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteProjectModalOpen}
        onOpenChange={setIsDeleteProjectModalOpen}
        onConfirm={() => itemToDelete && handleDeleteProject(itemToDelete.id)}
        title="Delete Project"
        description="Are you sure you want to delete this project? All tasks in this project will also be deleted. This action cannot be undone."
        confirmButtonText="Delete Project"
        variant="destructive"
      />

      {/* Delete Task Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteTaskModalOpen}
        onOpenChange={setIsDeleteTaskModalOpen}
        onConfirm={() => itemToDelete && handleDeleteTask(itemToDelete.id)}
        title="Delete Task"
        description="Are you sure you want to delete this task? This action cannot be undone."
        confirmButtonText="Delete Task"
        variant="destructive"
      />

      <ProjectModal
        open={isProjectModalOpen}
        onOpenChange={(open) => {
          setIsProjectModalOpen(open);
          if (!open) setEditingProject(null);
        }}
        project={editingProject}
        onSubmit={handleProjectSubmit}
        userId={user?.id || ''}
      />
    </div>
  );
};
