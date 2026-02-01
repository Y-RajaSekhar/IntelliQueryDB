export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          created_at: string | null
          date: string
          id: string
          status: string
          student_id: string
          subject: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          status: string
          student_id: string
          subject: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          status?: string
          student_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      certifications: {
        Row: {
          created_at: string | null
          credential_id: string | null
          credential_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string
          issuer: string
          name: string
          student_id: string
        }
        Insert: {
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date: string
          issuer: string
          name: string
          student_id: string
        }
        Update: {
          created_at?: string | null
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string
          issuer?: string
          name?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certifications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      data_records: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          record_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          id?: string
          record_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          record_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      grades: {
        Row: {
          academic_year: string
          created_at: string | null
          credits: number
          grade: number
          id: string
          semester: string
          student_id: string
          subject: string
        }
        Insert: {
          academic_year: string
          created_at?: string | null
          credits: number
          grade: number
          id?: string
          semester: string
          student_id: string
          subject: string
        }
        Update: {
          academic_year?: string
          created_at?: string | null
          credits?: number
          grade?: number
          id?: string
          semester?: string
          student_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          end_date: string | null
          github_url: string | null
          id: string
          live_url: string | null
          start_date: string | null
          status: string | null
          student_id: string
          technologies: string[] | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          github_url?: string | null
          id?: string
          live_url?: string | null
          start_date?: string | null
          status?: string | null
          student_id: string
          technologies?: string[] | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          github_url?: string | null
          id?: string
          live_url?: string | null
          start_date?: string | null
          status?: string | null
          student_id?: string
          technologies?: string[] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      query_history: {
        Row: {
          created_at: string
          execution_count: number
          id: string
          is_favorite: boolean
          last_executed_at: string
          query_text: string
          selected_tables: string[]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          execution_count?: number
          id?: string
          is_favorite?: boolean
          last_executed_at?: string
          query_text: string
          selected_tables: string[]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          execution_count?: number
          id?: string
          is_favorite?: boolean
          last_executed_at?: string
          query_text?: string
          selected_tables?: string[]
          user_id?: string | null
        }
        Relationships: []
      }
      saved_analytics: {
        Row: {
          analysis_type: string
          config: Json | null
          created_at: string
          description: string | null
          field1: string
          field2: string | null
          id: string
          name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_type: string
          config?: Json | null
          created_at?: string
          description?: string | null
          field1: string
          field2?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_type?: string
          config?: Json | null
          created_at?: string
          description?: string | null
          field1?: string
          field2?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      student_skills: {
        Row: {
          category: string
          created_at: string | null
          id: string
          proficiency_level: number
          skill_name: string
          student_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          proficiency_level: number
          skill_name: string
          student_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          proficiency_level?: number
          skill_name?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_skills_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          created_at: string | null
          date_of_birth: string | null
          department: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          student_id: string
          updated_at: string | null
          year: number
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone?: string | null
          student_id: string
          updated_at?: string | null
          year: number
        }
        Update: {
          address?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          department?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          student_id?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      promote_to_admin: { Args: { user_email: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
