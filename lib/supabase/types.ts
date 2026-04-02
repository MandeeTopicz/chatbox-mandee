export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'student' | 'teacher'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: UserRole
          display_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          role?: UserRole
          display_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: UserRole
          display_name?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'users_id_fkey'
            columns: ['id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'conversations_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system' | 'tool'
          content: string
          tool_calls: Json | null
          tool_results: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system' | 'tool'
          content: string
          tool_calls?: Json | null
          tool_results?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant' | 'system' | 'tool'
          content?: string
          tool_calls?: Json | null
          tool_results?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
        ]
      }
      plugins: {
        Row: {
          id: string
          name: string
          url: string
          tool_schemas: Json
          allowed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          url: string
          tool_schemas: Json
          allowed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          url?: string
          tool_schemas?: Json
          allowed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      app_sessions: {
        Row: {
          id: string
          conversation_id: string
          plugin_id: string
          state_blob: Json
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          plugin_id: string
          state_blob?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          plugin_id?: string
          state_blob?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'app_sessions_conversation_id_fkey'
            columns: ['conversation_id']
            isOneToOne: false
            referencedRelation: 'conversations'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'app_sessions_plugin_id_fkey'
            columns: ['plugin_id']
            isOneToOne: false
            referencedRelation: 'plugins'
            referencedColumns: ['id']
          },
        ]
      }
      chess_profiles: {
        Row: {
          user_id: string
          wins: number
          losses: number
          draws: number
          streak: number
          rating: number
          updated_at: string
        }
        Insert: {
          user_id: string
          wins?: number
          losses?: number
          draws?: number
          streak?: number
          rating?: number
          updated_at?: string
        }
        Update: {
          user_id?: string
          wins?: number
          losses?: number
          draws?: number
          streak?: number
          rating?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chess_profiles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      quizzes: {
        Row: {
          id: string
          teacher_id: string
          title: string
          topic: string
          cards: Json
          created_at: string
        }
        Insert: {
          id?: string
          teacher_id: string
          title: string
          topic: string
          cards: Json
          created_at?: string
        }
        Update: {
          id?: string
          teacher_id?: string
          title?: string
          topic?: string
          cards?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'quizzes_teacher_id_fkey'
            columns: ['teacher_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
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
