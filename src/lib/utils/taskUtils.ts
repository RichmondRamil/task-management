// lib/utils/taskUtils.ts
import { Task } from '@/lib/types/database'

export function transformTaskData(task: any): Task {
  return {
    ...task,
    // Ensure all required fields exist with proper casing
    dueDate: task.due_date || task.dueDate || null,
    projectId: task.project_id || task.projectId || null,
    assigneeId: task.assignee_id || task.assigneeId || null,
    createdBy: task.created_by || task.createdBy || '',
    createdAt: task.created_at || task.createdAt || new Date().toISOString(),
    updatedAt: task.updated_at || task.updatedAt || new Date().toISOString(),
    // Add empty objects for relations if they don't exist
    project: task.project || null,
    creator: task.creator || null,
    assignee: task.assignee || null,
  }
}

export function prepareTaskForApi(task: Partial<Task>): any {
  return {
    ...task,
    // Ensure snake_case fields are set from camelCase if needed
    due_date: task.dueDate || task.due_date || null,
    project_id: task.projectId || task.project_id || null,
    assignee_id: task.assigneeId || task.assignee_id || null,
    created_by: task.createdBy || task.created_by || '',
    created_at: task.createdAt || task.created_at || new Date().toISOString(),
    updated_at: task.updatedAt || task.updated_at || new Date().toISOString(),
  }
}
