import { createClient } from '@/lib/supabase'
import { Database } from '@/lib/types/database'

type Project = Database['public']['Tables']['projects']['Row']
type ProjectInsert = Database['public']['Tables']['projects']['Insert']
type ProjectUpdate = Partial<Omit<Project, 'id' | 'created_at'>>;

type ServiceResponse<T> = {
  data: T | null
  error: Error | null
}

class ProjectService {
  private supabase = createClient()

  async createProject(project: Omit<ProjectInsert, 'owner_id'>, userId: string): Promise<ServiceResponse<Project>> {
    try {
      const projectData: ProjectInsert = {
        ...project,
        owner_id: userId,
        status: 'active' as const
      }

      const { data, error } = await (this.supabase
        .from('projects') as any)
        .insert([projectData])
        .select()
        .single()

      if (error) throw error
      if (!data) throw new Error('No data returned from create project')

      // Add creator as project member
      await this.addProjectMember(data.id, userId, 'owner')

      return { data, error: null }
    } catch (error) {
      console.error('Error in createProject:', error)
      return { data: null, error: error as Error }
    }
  }

  async getProjectById(id: string): Promise<ServiceResponse<Project>> {
    try {
      const { data, error } = await (this.supabase
        .from('projects') as any)
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error in getProjectById:', error)
      return { data: null, error: error as Error }
    }
  }

  async getUserProjects(userId: string): Promise<ServiceResponse<Project[]>> {
    try {
      const { data, error } = await (this.supabase
        .from('projects') as any)
        .select('*')
        .eq('owner_id', userId)

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error in getUserProjects:', error)
      return { data: null, error: error as Error }
    }
  }

  async updateProject(
    id: string, 
    updates: ProjectUpdate,
    userId: string
  ): Promise<ServiceResponse<Project>> {
    try {
      // Verify ownership
      const { data: project, error: fetchError } = await (this.supabase
        .from('projects') as any)
        .select('owner_id')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (!project) throw new Error('Project not found')
      if (project.owner_id !== userId) throw new Error('Forbidden')

      const { data: updatedProject, error: updateError } = await (this.supabase
        .from('projects') as any)
        .update(updates as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      return { data: updatedProject, error: null }
    } catch (error) {
      console.error('Error in updateProject:', error)
      return { data: null, error: error as Error }
    }
  }

  async deleteProject(id: string, userId: string): Promise<ServiceResponse<boolean>> {
    try {
      // Verify ownership
      const { data: project, error: fetchError } = await (this.supabase
        .from('projects') as any)
        .select('owner_id')
        .eq('id', id)
        .single()

      if (fetchError) throw fetchError
      if (!project) throw new Error('Project not found')
      if (project.owner_id !== userId) throw new Error('Forbidden')

      const { error } = await (this.supabase
        .from('projects') as any)
        .delete()
        .eq('id', id)

      if (error) throw error
      return { data: true, error: null }
    } catch (error) {
      console.error('Error in deleteProject:', error)
      return { data: false, error: error as Error }
    }
  }

  private async addProjectMember(
    projectId: string, 
    userId: string, 
    role: 'owner' | 'admin' | 'member'
  ): Promise<ServiceResponse<boolean>> {
    try {
      const memberData = {
        project_id: projectId,
        user_id: userId,
        role,
        joined_at: new Date().toISOString()
      }

      const { error } = await (this.supabase
        .from('project_members') as any)
        .insert([memberData])

      if (error) throw error
      return { data: true, error: null }
    } catch (error) {
      console.error('Error in addProjectMember:', error)
      return { data: false, error: error as Error }
    }
  }
}

export const projectService = new ProjectService()