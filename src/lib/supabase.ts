import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions
export type Company = { id: string; name: string; created_at: string }
export type Project = { id: string; company_id: string; name: string; created_at: string }
export type SubProject = { id: string; project_id: string; name: string; created_at: string }
export type WorkLog = {
  id: string
  date: string
  company_id: string
  project_id: string
  sub_project_id: string | null
  description: string
  manager: string | null
  created_at: string
  // Joined
  companies?: { name: string }
  projects?: { name: string }
  sub_projects?: { name: string }
}
