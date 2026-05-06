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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      board_events: {
        Row: {
          color: string | null
          created_at: string
          event_type: string
          id: string
          points: Json | null
          sender: string
          session_id: string
          size: number | null
          stroke_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          event_type?: string
          id?: string
          points?: Json | null
          sender: string
          session_id: string
          size?: number | null
          stroke_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          event_type?: string
          id?: string
          points?: Json | null
          sender?: string
          session_id?: string
          size?: number | null
          stroke_id?: string | null
        }
        Relationships: []
      }
      call_requests: {
        Row: {
          accepted_by_name: string | null
          accepted_by_staff_id: string | null
          created_at: string | null
          doubt_text: string | null
          id: string
          mode: string
          question_image_url: string | null
          session_id: string | null
          status: string
          student_college: string
          student_department: string
          student_name: string
          student_reg_no: string
          student_year: number
          subject_name: string
          updated_at: string | null
        }
        Insert: {
          accepted_by_name?: string | null
          accepted_by_staff_id?: string | null
          created_at?: string | null
          doubt_text?: string | null
          id?: string
          mode?: string
          question_image_url?: string | null
          session_id?: string | null
          status?: string
          student_college: string
          student_department: string
          student_name: string
          student_reg_no: string
          student_year: number
          subject_name: string
          updated_at?: string | null
        }
        Update: {
          accepted_by_name?: string | null
          accepted_by_staff_id?: string | null
          created_at?: string | null
          doubt_text?: string | null
          id?: string
          mode?: string
          question_image_url?: string | null
          session_id?: string | null
          status?: string
          student_college?: string
          student_department?: string
          student_name?: string
          student_reg_no?: string
          student_year?: number
          subject_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      colleges: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          id: string
          name: string
          year_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          year_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          year_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "years"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_board_sessions: {
        Row: {
          canvas_data: Json | null
          code_content: string | null
          college_name: string
          department: string
          doubt_text: string | null
          ended_at: string | null
          id: string
          mode: string
          started_at: string | null
          status: string
          student_name: string
          student_reg_no: string
          student_year: number
          subject_name: string
          teacher_locked: boolean | null
          teacher_name: string
          teacher_staff_id: string
        }
        Insert: {
          canvas_data?: Json | null
          code_content?: string | null
          college_name: string
          department: string
          doubt_text?: string | null
          ended_at?: string | null
          id?: string
          mode?: string
          started_at?: string | null
          status?: string
          student_name: string
          student_reg_no: string
          student_year: number
          subject_name: string
          teacher_locked?: boolean | null
          teacher_name: string
          teacher_staff_id: string
        }
        Update: {
          canvas_data?: Json | null
          code_content?: string | null
          college_name?: string
          department?: string
          doubt_text?: string | null
          ended_at?: string | null
          id?: string
          mode?: string
          started_at?: string | null
          status?: string
          student_name?: string
          student_reg_no?: string
          student_year?: number
          subject_name?: string
          teacher_locked?: boolean | null
          teacher_name?: string
          teacher_staff_id?: string
        }
        Relationships: []
      }
      doubt_helpful: {
        Row: {
          created_at: string
          doubt_id: string
          id: string
          student_reg_no: string
        }
        Insert: {
          created_at?: string
          doubt_id: string
          id?: string
          student_reg_no: string
        }
        Update: {
          created_at?: string
          doubt_id?: string
          id?: string
          student_reg_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubt_helpful_doubt_id_fkey"
            columns: ["doubt_id"]
            isOneToOne: false
            referencedRelation: "doubts"
            referencedColumns: ["id"]
          },
        ]
      }
      doubts: {
        Row: {
          answer: string | null
          answer_image_url: string | null
          answer_image_urls: Json | null
          answered_at: string | null
          answered_by: string | null
          claimed_by: string | null
          created_at: string
          handling_teacher: string | null
          helpful_count: number
          id: string
          ocr_text: string | null
          question: string
          question_image_url: string | null
          status: string
          student_college: string
          student_department: string
          student_name: string
          student_reg_no: string
          student_year: number
          subject_name: string
          viewed_by_student: boolean
        }
        Insert: {
          answer?: string | null
          answer_image_url?: string | null
          answer_image_urls?: Json | null
          answered_at?: string | null
          answered_by?: string | null
          claimed_by?: string | null
          created_at?: string
          handling_teacher?: string | null
          helpful_count?: number
          id?: string
          ocr_text?: string | null
          question: string
          question_image_url?: string | null
          status?: string
          student_college: string
          student_department: string
          student_name: string
          student_reg_no: string
          student_year: number
          subject_name: string
          viewed_by_student?: boolean
        }
        Update: {
          answer?: string | null
          answer_image_url?: string | null
          answer_image_urls?: Json | null
          answered_at?: string | null
          answered_by?: string | null
          claimed_by?: string | null
          created_at?: string
          handling_teacher?: string | null
          helpful_count?: number
          id?: string
          ocr_text?: string | null
          question?: string
          question_image_url?: string | null
          status?: string
          student_college?: string
          student_department?: string
          student_name?: string
          student_reg_no?: string
          student_year?: number
          subject_name?: string
          viewed_by_student?: boolean
        }
        Relationships: []
      }
      saved_doubts: {
        Row: {
          created_at: string
          doubt_id: string
          id: string
          student_reg_no: string
        }
        Insert: {
          created_at?: string
          doubt_id: string
          id?: string
          student_reg_no: string
        }
        Update: {
          created_at?: string
          doubt_id?: string
          id?: string
          student_reg_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_doubts_doubt_id_fkey"
            columns: ["doubt_id"]
            isOneToOne: false
            referencedRelation: "doubts"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          college_name: string
          created_at: string
          department: string
          dob: string
          email: string | null
          id: string
          name: string
          registration_number: string
          year: number
        }
        Insert: {
          college_name: string
          created_at?: string
          department: string
          dob: string
          email?: string | null
          id?: string
          name: string
          registration_number: string
          year: number
        }
        Update: {
          college_name?: string
          created_at?: string
          department?: string
          dob?: string
          email?: string | null
          id?: string
          name?: string
          registration_number?: string
          year?: number
        }
        Relationships: []
      }
      subjects: {
        Row: {
          created_at: string
          department_id: string
          id: string
          name: string
          semester: string
        }
        Insert: {
          created_at?: string
          department_id: string
          id?: string
          name: string
          semester: string
        }
        Update: {
          created_at?: string
          department_id?: string
          id?: string
          name?: string
          semester?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_status: {
        Row: {
          college_name: string
          current_session_id: string | null
          id: string
          is_busy: boolean
          is_online: boolean
          last_seen_at: string | null
          staff_id: string
          subject_name: string
          teacher_name: string
          updated_at: string | null
        }
        Insert: {
          college_name: string
          current_session_id?: string | null
          id?: string
          is_busy?: boolean
          is_online?: boolean
          last_seen_at?: string | null
          staff_id: string
          subject_name: string
          teacher_name: string
          updated_at?: string | null
        }
        Update: {
          college_name?: string
          current_session_id?: string | null
          id?: string
          is_busy?: boolean
          is_online?: boolean
          last_seen_at?: string | null
          staff_id?: string
          subject_name?: string
          teacher_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      teachers: {
        Row: {
          college_name: string
          created_at: string
          dob: string
          email: string | null
          id: string
          name: string
          staff_id: string
          subject_name: string
        }
        Insert: {
          college_name: string
          created_at?: string
          dob: string
          email?: string | null
          id?: string
          name: string
          staff_id: string
          subject_name: string
        }
        Update: {
          college_name?: string
          created_at?: string
          dob?: string
          email?: string | null
          id?: string
          name?: string
          staff_id?: string
          subject_name?: string
        }
        Relationships: []
      }
      video_files: {
        Row: {
          file_name: string
          file_type: string
          file_url: string
          id: string
          uploaded_at: string
          video_id: string
        }
        Insert: {
          file_name: string
          file_type: string
          file_url: string
          id?: string
          uploaded_at?: string
          video_id: string
        }
        Update: {
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          uploaded_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_files_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          added_at: string
          id: string
          subject_id: string
          title: string
          url: string
        }
        Insert: {
          added_at?: string
          id?: string
          subject_id: string
          title: string
          url: string
        }
        Update: {
          added_at?: string
          id?: string
          subject_id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      years: {
        Row: {
          college_id: string
          created_at: string
          id: string
          year_number: number
        }
        Insert: {
          college_id: string
          created_at?: string
          id?: string
          year_number: number
        }
        Update: {
          college_id?: string
          created_at?: string
          id?: string
          year_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "years_college_id_fkey"
            columns: ["college_id"]
            isOneToOne: false
            referencedRelation: "colleges"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
