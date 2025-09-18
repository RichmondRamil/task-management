'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useTasks } from '@/lib/contexts/TaskContext';
import { Task } from '@/lib/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {  Trash2, Edit, Check } from 'lucide-react';
import { toast } from 'sonner';

type TaskFilter = 'all' | 'my-tasks';

export default function Tasks() {
  const { user } = useAuth();
  const { 
    tasks: allTasks, 
    updateTask, 
    deleteTask,
    loading: tasksLoading,
    error: tasksError
  } = useTasks();
  
  // State for task filtering
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');

  // State for task management
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  // Filter tasks based on selected filter and status
  const filteredTasks = allTasks.filter(task => 
    taskFilter === 'all' || task.assignee_id === user?.id
  );

  // Filter tasks by status
  const todoTasks = filteredTasks.filter(task => task.status === 'todo');
  const inProgressTasks = filteredTasks.filter(task => task.status === 'in_progress');
  const doneTasks = filteredTasks.filter(task => task.status === 'done');

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

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success('Task deleted successfully');
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  // Render task item
  const renderTaskItem = (task: Task) => (
    <Card key={task.id} className="mb-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleTaskStatus(task)}
              className={`rounded-full ${
                task.status === 'done' ? 'bg-green-100 text-green-600' : ''
              }`}
            >
              <Check className="h-4 w-4" />
            </Button>
            <div>
              <h3 className="font-medium">{task.title}</h3>
              {task.description && (
                <p className="text-sm text-gray-500">{task.description}</p>
              )}
              <div className="flex items-center mt-1 space-x-2 text-xs text-gray-500">
                {task.due_date && (
                  <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                )}
                <span className={`px-2 py-1 rounded-full text-xs ${
                  task.priority === 'high' ? 'bg-red-100 text-red-800' :
                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {task.priority}
                </span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setEditingTask(task)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setTaskToDelete(task.id);
                setIsDeleteModalOpen(true);
              }}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (tasksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (tasksError) {
    return (
      <div className="p-4 text-red-500">
        Error loading tasks: {tasksError}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Tasks</h1>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant={taskFilter === 'all' ? 'default' : 'outline'} 
            onClick={() => setTaskFilter('all')}
          >
            All Tasks
          </Button>
          <Button 
            variant={taskFilter === 'my-tasks' ? 'default' : 'outline'} 
            onClick={() => setTaskFilter('my-tasks')}
          >
            My Tasks
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* To Do Column */}
        <div>
          <h2 className="text-lg font-semibold mb-4">To Do ({todoTasks.length})</h2>
          <div className="space-y-2">
            {todoTasks.length > 0 ? (
              todoTasks.map(renderTaskItem)
            ) : (
              <p className="text-sm text-gray-500">No tasks in this column</p>
            )}
          </div>
        </div>

        {/* In Progress Column */}
        <div>
          <h2 className="text-lg font-semibold mb-4">In Progress ({inProgressTasks.length})</h2>
          <div className="space-y-2">
            {inProgressTasks.length > 0 ? (
              inProgressTasks.map(renderTaskItem)
            ) : (
              <p className="text-sm text-gray-500">No tasks in this column</p>
            )}
          </div>
        </div>

        {/* Done Column */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Done ({doneTasks.length})</h2>
          <div className="space-y-2">
            {doneTasks.length > 0 ? (
              doneTasks.map(renderTaskItem)
            ) : (
              <p className="text-sm text-gray-500">No tasks in this column</p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && taskToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <Card>
            <CardHeader>
              <CardTitle>Delete Task</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">Are you sure you want to delete this task? This action cannot be undone.</p>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeleteTask(taskToDelete)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
