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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_custom_exercises: {
        Row: {
          comment: string | null
          created_at: string
          ex_key: string
          id: string
          name: string
          reps_high: number
          reps_low: number
          rest: string | null
          rir: string | null
          sets: number
          sort_order: number
          workout_key: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          ex_key: string
          id?: string
          name: string
          reps_high?: number
          reps_low?: number
          rest?: string | null
          rir?: string | null
          sets?: number
          sort_order?: number
          workout_key: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          ex_key?: string
          id?: string
          name?: string
          reps_high?: number
          reps_low?: number
          rest?: string | null
          rir?: string | null
          sets?: number
          sort_order?: number
          workout_key?: string
        }
        Relationships: []
      }
      app_custom_foods: {
        Row: {
          calories: number
          carbs: number
          category: string
          created_at: string
          fat: number
          id: string
          name: string
          portion: string | null
          protein: number
        }
        Insert: {
          calories?: number
          carbs?: number
          category: string
          created_at?: string
          fat?: number
          id?: string
          name: string
          portion?: string | null
          protein?: number
        }
        Update: {
          calories?: number
          carbs?: number
          category?: string
          created_at?: string
          fat?: number
          id?: string
          name?: string
          portion?: string | null
          protein?: number
        }
        Relationships: []
      }
      app_custom_workouts: {
        Row: {
          accent: string
          created_at: string
          day: string | null
          focus: string | null
          id: string
          key: string
          name: string
          sort_order: number
        }
        Insert: {
          accent?: string
          created_at?: string
          day?: string | null
          focus?: string | null
          id?: string
          key: string
          name: string
          sort_order?: number
        }
        Update: {
          accent?: string
          created_at?: string
          day?: string | null
          focus?: string | null
          id?: string
          key?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      app_food_logs: {
        Row: {
          calories: number
          carbs: number
          created_at: string
          fat: number
          id: string
          log_date: string
          meal: string
          name: string
          portion: string | null
          protein: number
          qty: number
        }
        Insert: {
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          id?: string
          log_date?: string
          meal: string
          name: string
          portion?: string | null
          protein?: number
          qty?: number
        }
        Update: {
          calories?: number
          carbs?: number
          created_at?: string
          fat?: number
          id?: string
          log_date?: string
          meal?: string
          name?: string
          portion?: string | null
          protein?: number
          qty?: number
        }
        Relationships: []
      }
      app_hidden_exercises: {
        Row: {
          exercise_key: string
          id: string
          workout_key: string
        }
        Insert: {
          exercise_key: string
          id?: string
          workout_key: string
        }
        Update: {
          exercise_key?: string
          id?: string
          workout_key?: string
        }
        Relationships: []
      }
      app_hidden_workouts: {
        Row: {
          workout_key: string
        }
        Insert: {
          workout_key: string
        }
        Update: {
          workout_key?: string
        }
        Relationships: []
      }
      app_sessions: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          is_deload: boolean
          notes: string | null
          session_date: string
          week_number: number
          workout_key: string
          workout_name: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          is_deload?: boolean
          notes?: string | null
          session_date?: string
          week_number?: number
          workout_key: string
          workout_name: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          is_deload?: boolean
          notes?: string | null
          session_date?: string
          week_number?: number
          workout_key?: string
          workout_name?: string
        }
        Relationships: []
      }
      app_set_logs: {
        Row: {
          comment: string | null
          created_at: string
          done: boolean
          exercise_key: string
          exercise_name: string
          id: string
          reps: number | null
          rir: number | null
          session_id: string
          set_index: number
          weight: number | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          done?: boolean
          exercise_key: string
          exercise_name: string
          id?: string
          reps?: number | null
          rir?: number | null
          session_id: string
          set_index?: number
          weight?: number | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          done?: boolean
          exercise_key?: string
          exercise_name?: string
          id?: string
          reps?: number | null
          rir?: number | null
          session_id?: string
          set_index?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "app_set_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "app_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          current_week: number
          id: number
          target_calories: number
          target_carbs: number
          target_fat: number
          target_protein: number
          theme: string
          unit: string
          updated_at: string
        }
        Insert: {
          current_week?: number
          id?: number
          target_calories?: number
          target_carbs?: number
          target_fat?: number
          target_protein?: number
          theme?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          current_week?: number
          id?: number
          target_calories?: number
          target_carbs?: number
          target_fat?: number
          target_protein?: number
          theme?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_weight_logs: {
        Row: {
          created_at: string
          log_date: string
          unit: string
          weight: number
        }
        Insert: {
          created_at?: string
          log_date: string
          unit?: string
          weight: number
        }
        Update: {
          created_at?: string
          log_date?: string
          unit?: string
          weight?: number
        }
        Relationships: []
      }
      badges: {
        Row: {
          available: boolean
          condition_en: string
          condition_es: string
          condition_fr: string
          display_en: string
          display_es: string
          display_fr: string
          family: string
          icon: string
          key: string
          position: number
          threshold: number | null
        }
        Insert: {
          available?: boolean
          condition_en: string
          condition_es: string
          condition_fr: string
          display_en: string
          display_es: string
          display_fr: string
          family: string
          icon: string
          key: string
          position: number
          threshold?: number | null
        }
        Update: {
          available?: boolean
          condition_en?: string
          condition_es?: string
          condition_fr?: string
          display_en?: string
          display_es?: string
          display_fr?: string
          family?: string
          icon?: string
          key?: string
          position?: number
          threshold?: number | null
        }
        Relationships: []
      }
      class_members: {
        Row: {
          athlete_id: string
          class_id: string
          joined_at: string
        }
        Insert: {
          athlete_id: string
          class_id: string
          joined_at?: string
        }
        Update: {
          athlete_id?: string
          class_id?: string
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          coach_id: string
          created_at: string
          description: string | null
          id: string
          invite_token: string
          name: string
          schedule: string | null
        }
        Insert: {
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          invite_token?: string
          name: string
          schedule?: string | null
        }
        Update: {
          coach_id?: string
          created_at?: string
          description?: string | null
          id?: string
          invite_token?: string
          name?: string
          schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_methods: {
        Row: {
          exercise_id: string
          is_primary: boolean
          method_key: string
        }
        Insert: {
          exercise_id: string
          is_primary?: boolean
          method_key: string
        }
        Update: {
          exercise_id?: string
          is_primary?: boolean
          method_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_methods_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_methods_method_key_fkey"
            columns: ["method_key"]
            isOneToOne: false
            referencedRelation: "training_methods"
            referencedColumns: ["key"]
          },
        ]
      }
      exercise_muscles: {
        Row: {
          contribution: number | null
          exercise_id: string
          muscle_group_id: string
          role: string
        }
        Insert: {
          contribution?: number | null
          exercise_id: string
          muscle_group_id: string
          role: string
        }
        Update: {
          contribution?: number | null
          exercise_id?: string
          muscle_group_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_muscles_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_muscles_muscle_group_id_fkey"
            columns: ["muscle_group_id"]
            isOneToOne: false
            referencedRelation: "muscle_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_votes: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          user_id: string
          vote_option_id: string | null
          vote_session_id: string | null
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          user_id: string
          vote_option_id?: string | null
          vote_session_id?: string | null
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          user_id?: string
          vote_option_id?: string | null
          vote_session_id?: string | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_votes_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_votes_vote_option_id_fkey"
            columns: ["vote_option_id"]
            isOneToOne: false
            referencedRelation: "vote_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_votes_vote_option_id_fkey"
            columns: ["vote_option_id"]
            isOneToOne: false
            referencedRelation: "vote_results"
            referencedColumns: ["vote_option_id"]
          },
          {
            foreignKeyName: "exercise_votes_vote_session_id_fkey"
            columns: ["vote_session_id"]
            isOneToOne: false
            referencedRelation: "vote_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_votes_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          body_region: string
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_time_based: boolean
          movement_type: string | null
          name: string
          secondary_movements: string[]
          updated_at: string
          video_path: string | null
          video_url: string | null
        }
        Insert: {
          body_region: string
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_time_based?: boolean
          movement_type?: string | null
          name: string
          secondary_movements?: string[]
          updated_at?: string
          video_path?: string | null
          video_url?: string | null
        }
        Update: {
          body_region?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_time_based?: boolean
          movement_type?: string | null
          name?: string
          secondary_movements?: string[]
          updated_at?: string
          video_path?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_movement_type_fkey"
            columns: ["movement_type"]
            isOneToOne: false
            referencedRelation: "movement_types"
            referencedColumns: ["key"]
          },
        ]
      }
      movement_types: {
        Row: {
          description_fr: string | null
          display_en: string
          display_es: string
          display_fr: string
          key: string
          sort_order: number
        }
        Insert: {
          description_fr?: string | null
          display_en: string
          display_es: string
          display_fr: string
          key: string
          sort_order?: number
        }
        Update: {
          description_fr?: string | null
          display_en?: string
          display_es?: string
          display_fr?: string
          key?: string
          sort_order?: number
        }
        Relationships: []
      }
      muscle_groups: {
        Row: {
          body_region: string
          display_en: string | null
          display_es: string | null
          display_fr: string | null
          id: string
          name_key: string
          size_class: string | null
          sort_order: number
          svg_key: string | null
        }
        Insert: {
          body_region: string
          display_en?: string | null
          display_es?: string | null
          display_fr?: string | null
          id?: string
          name_key: string
          size_class?: string | null
          sort_order?: number
          svg_key?: string | null
        }
        Update: {
          body_region?: string
          display_en?: string | null
          display_es?: string | null
          display_fr?: string | null
          id?: string
          name_key?: string
          size_class?: string | null
          sort_order?: number
          svg_key?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          badges_seen_at: string | null
          created_at: string
          current_streak: number
          full_name: string | null
          id: string
          language: string
          longest_streak: number
          rank_seen_key: string | null
          segment: string | null
          theme_pref: string
          total_minutes: number
        }
        Insert: {
          badges_seen_at?: string | null
          created_at?: string
          current_streak?: number
          full_name?: string | null
          id: string
          language?: string
          longest_streak?: number
          rank_seen_key?: string | null
          segment?: string | null
          theme_pref?: string
          total_minutes?: number
        }
        Update: {
          badges_seen_at?: string | null
          created_at?: string
          current_streak?: number
          full_name?: string | null
          id?: string
          language?: string
          longest_streak?: number
          rank_seen_key?: string | null
          segment?: string | null
          theme_pref?: string
          total_minutes?: number
        }
        Relationships: []
      }
      rank_shares: {
        Row: {
          created_at: string
          revoked_at: string | null
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          revoked_at?: string | null
          token?: string
          user_id: string
        }
        Update: {
          created_at?: string
          revoked_at?: string | null
          token?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rank_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ranks: {
        Row: {
          color: string
          display_en: string
          display_es: string
          display_fr: string
          key: string
          min_minutes: number
          motto_en: string | null
          motto_es: string | null
          motto_fr: string | null
          position: number
        }
        Insert: {
          color: string
          display_en: string
          display_es: string
          display_fr: string
          key: string
          min_minutes: number
          motto_en?: string | null
          motto_es?: string | null
          motto_fr?: string | null
          position: number
        }
        Update: {
          color?: string
          display_en?: string
          display_es?: string
          display_fr?: string
          key?: string
          min_minutes?: number
          motto_en?: string | null
          motto_es?: string | null
          motto_fr?: string | null
          position?: number
        }
        Relationships: []
      }
      scheduled_workouts: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          scheduled_date: string
          title: string | null
          user_id: string
          workout_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date: string
          title?: string | null
          user_id: string
          workout_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          title?: string | null
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      session_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          session_id: string
          sets_completed: number | null
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          session_id: string
          sets_completed?: number | null
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          session_id?: string
          sets_completed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      themes: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "themes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_methods: {
        Row: {
          display_en: string
          display_es: string
          display_fr: string
          icon: string | null
          is_active: boolean
          key: string
          sort_order: number
        }
        Insert: {
          display_en: string
          display_es: string
          display_fr: string
          icon?: string | null
          is_active?: boolean
          key: string
          sort_order?: number
        }
        Update: {
          display_en?: string
          display_es?: string
          display_fr?: string
          icon?: string | null
          is_active?: boolean
          key?: string
          sort_order?: number
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_key: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          badge_key: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          badge_key?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_key_fkey"
            columns: ["badge_key"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["key"]
          },
        ]
      }
      vote_options: {
        Row: {
          color: string
          created_at: string
          exercise_id: string | null
          id: string
          label: string | null
          position: number
          vote_session_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          exercise_id?: string | null
          id?: string
          label?: string | null
          position?: number
          vote_session_id: string
        }
        Update: {
          color?: string
          created_at?: string
          exercise_id?: string | null
          id?: string
          label?: string | null
          position?: number
          vote_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_options_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_options_vote_session_id_fkey"
            columns: ["vote_session_id"]
            isOneToOne: false
            referencedRelation: "vote_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      vote_sessions: {
        Row: {
          class_id: string
          coach_id: string
          created_at: string
          deadline: string | null
          exercise_options: string[]
          id: string
          status: string
          title: string
        }
        Insert: {
          class_id: string
          coach_id: string
          created_at?: string
          deadline?: string | null
          exercise_options: string[]
          id?: string
          status?: string
          title: string
        }
        Update: {
          class_id?: string
          coach_id?: string
          created_at?: string
          deadline?: string | null
          exercise_options?: string[]
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          exercise_id: string
          id: string
          notes: string | null
          position: number
          reps: string | null
          rest_seconds: number | null
          sets: number | null
          weight: string | null
          workout_id: string
        }
        Insert: {
          exercise_id: string
          id?: string
          notes?: string | null
          position?: number
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          weight?: string | null
          workout_id: string
        }
        Update: {
          exercise_id?: string
          id?: string
          notes?: string | null
          position?: number
          reps?: string | null
          rest_seconds?: number | null
          sets?: number | null
          weight?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          active_minutes: number
          activity_exercise_id: string | null
          duration_minutes: number | null
          ended_at: string | null
          id: string
          notes: string | null
          performed_at: string
          started_at: string | null
          user_id: string
          workout_id: string | null
        }
        Insert: {
          active_minutes?: number
          activity_exercise_id?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          started_at?: string | null
          user_id: string
          workout_id?: string | null
        }
        Update: {
          active_minutes?: number
          activity_exercise_id?: string | null
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          started_at?: string | null
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_activity_exercise_id_fkey"
            columns: ["activity_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          created_by: string
          duration_minutes: number | null
          id: string
          method: string
          notes: string | null
          theme_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_minutes?: number | null
          id?: string
          method?: string
          notes?: string | null
          theme_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_minutes?: number | null
          id?: string
          method?: string
          notes?: string | null
          theme_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workouts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vote_results: {
        Row: {
          color: string | null
          exercise_id: string | null
          is_leading: boolean | null
          label: string | null
          percentage: number | null
          position: number | null
          vote_option_id: string | null
          vote_session_id: string | null
          votes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vote_options_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_options_vote_session_id_fkey"
            columns: ["vote_session_id"]
            isOneToOne: false
            referencedRelation: "vote_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_class_by_invite_token: {
        Args: { p_token: string }
        Returns: {
          coach_id: string
          created_at: string
          description: string | null
          id: string
          invite_token: string
          name: string
          schedule: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "classes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_shared_rank: {
        Args: { p_token: string }
        Returns: {
          current_streak: number
          display_name: string
          rank_key: string
          total_minutes: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_authored: { Args: { p_uid: string }; Returns: boolean }
      is_class_coach: { Args: { p_class_id: string }; Returns: boolean }
      wodbud_rank_for_minutes: { Args: { p_minutes: number }; Returns: string }
      wodbud_recalc_badges: { Args: { p_user?: string }; Returns: string[] }
      wodbud_vote_color: { Args: { p_position: number }; Returns: string }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
