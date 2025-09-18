// src/app/api/project/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { projectService } from './service'

// POST - Create a new project
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // Get the session from the request
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse and validate request
    const { name, description = '' } = await request.json()
    if (!name?.trim()) {
      return new NextResponse(
        JSON.stringify({ error: 'Project name is required' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Create project using service
    const { data: project, error } = await projectService.createProject(
      {
        name: name.trim(),
        description: description?.trim() || null
      },
      session.user.id
    )

    if (error || !project) {
      console.error('Project creation error:', error)
      throw error || new Error('Failed to create project')
    }

    return NextResponse.json(project, {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error in project creation:', error)
    return new NextResponse(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// GET - Fetch user's projects
export async function GET(request: Request) {
  const supabase = createClient()
  
  // Get the session from the request
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  console.log('sessionError', sessionError)
  console.log('session', session)
  
  if (sessionError || !session?.user) {
    return new NextResponse('Unauthorized', { 
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  try {
    // Get projects for the authenticated user
    const { data: projects, error } = await projectService.getUserProjects(session.user.id)

    if (error) {
      console.error('Error fetching projects:', error)
      throw error
    }

    return NextResponse.json(projects || [], {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })

  } catch (error) {
    console.error('Error in projects GET:', error)
    return new NextResponse(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

// PUT - Update a project
export async function PUT(request: Request) {
  try {
    const supabase = createClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const { id, ...updates } = await request.json()
    
    if (!id) {
      return new NextResponse(
        JSON.stringify({ error: 'Project ID is required' }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Update project using service
    const { data: updatedProject, error } = await projectService.updateProject(
      id,
      updates,
      session.user.id
    )

    if (error || !updatedProject) {
      console.error('Error updating project:', error)
      throw error || new Error('Failed to update project')
    }

    return NextResponse.json(updatedProject, {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Error updating project:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const status = errorMessage === 'Forbidden' ? 403 : 500
    return new NextResponse(
      JSON.stringify({ error: errorMessage }), 
      { 
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

// DELETE - Remove a project
export async function DELETE(request: Request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user || !id) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }), 
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Delete project using service
    const { data: success, error } = await projectService.deleteProject(id, session.user.id)

    if (error || !success) {
      console.error('Error deleting project:', error)
      throw error || new Error('Failed to delete project')
    }

    return new NextResponse(
      JSON.stringify({ message: 'Project deleted successfully' }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Error deleting project:', error)
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    const status = errorMessage === 'Forbidden' ? 403 : 500
    return new NextResponse(
      JSON.stringify({ error: errorMessage }), 
      { 
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}