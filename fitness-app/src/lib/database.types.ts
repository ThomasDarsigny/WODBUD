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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
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
      badges: {
        Row: {
          art: string | null
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
          rarity: string | null
          threshold: number | null
        }
        Insert: {
          art?: string | null
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
          rarity?: string | null
          threshold?: number | null
        }
        Update: {
          art?: string | null
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
          rarity?: string | null
          threshold?: number | null
        }
        Relationships: []
      }
      center_invites: {
        Row: {
          center_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          max_uses: number | null
          revoked_at: string | null
          role: string
          token: string
          uses: number
        }
        Insert: {
          center_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          max_uses?: number | null
          revoked_at?: string | null
          role: string
          token?: string
          uses?: number
        }
        Update: {
          center_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          max_uses?: number | null
          revoked_at?: string | null
          role?: string
          token?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "center_invites_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      center_members: {
        Row: {
          center_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          center_id: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          center_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_members_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      center_suggestions: {
        Row: {
          anonymous: boolean
          center_id: string
          created_at: string
          handled_at: string | null
          handled_by: string | null
          id: string
          message: string
          status: string
          user_id: string
        }
        Insert: {
          anonymous?: boolean
          center_id: string
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message: string
          status?: string
          user_id?: string
        }
        Update: {
          anonymous?: boolean
          center_id?: string
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          message?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "center_suggestions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_suggestions_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "center_suggestions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      centers: {
        Row: {
          created_at: string
          equipment: string[]
          group_size: string | null
          id: string
          name: string
          owner_id: string
          venue: string | null
        }
        Insert: {
          created_at?: string
          equipment?: string[]
          group_size?: string | null
          id?: string
          name: string
          owner_id: string
          venue?: string | null
        }
        Update: {
          created_at?: string
          equipment?: string[]
          group_size?: string | null
          id?: string
          name?: string
          owner_id?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "centers_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_attendance: {
        Row: {
          checked_in_at: string
          class_id: string
          id: string
          method: string
          session_date: string
          user_id: string
        }
        Insert: {
          checked_in_at?: string
          class_id: string
          id?: string
          method: string
          session_date: string
          user_id: string
        }
        Update: {
          checked_in_at?: string
          class_id?: string
          id?: string
          method?: string
          session_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_checkin_codes: {
        Row: {
          class_id: string
          code: string
          expires_at: string
        }
        Insert: {
          class_id: string
          code: string
          expires_at: string
        }
        Update: {
          class_id?: string
          code?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_checkin_codes_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: true
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
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
      class_plans: {
        Row: {
          class_id: string
          coach_id: string
          created_at: string
          id: string
          notes: string | null
          scheduled_date: string
          title: string | null
          workout_id: string | null
        }
        Insert: {
          class_id: string
          coach_id: string
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date: string
          title?: string | null
          workout_id?: string | null
        }
        Update: {
          class_id?: string
          coach_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          title?: string | null
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "class_plans_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_plans_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      class_slots: {
        Row: {
          class_id: string
          created_at: string
          duration_minutes: number
          id: string
          start_time: string
          weekday: number
        }
        Insert: {
          class_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          start_time: string
          weekday: number
        }
        Update: {
          class_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "class_slots_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          center_id: string | null
          coach_id: string
          created_at: string
          description: string | null
          id: string
          invite_token: string
          name: string
          schedule: string | null
        }
        Insert: {
          center_id?: string | null
          coach_id: string
          created_at?: string
          description?: string | null
          id?: string
          invite_token?: string
          name: string
          schedule?: string | null
        }
        Update: {
          center_id?: string | null
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
            foreignKeyName: "classes_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_errors: {
        Row: {
          app_version: string | null
          created_at: string
          id: number
          kind: string
          message: string
          path: string | null
          stack: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          id?: never
          kind: string
          message: string
          path?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          app_version?: string | null
          created_at?: string
          id?: never
          kind?: string
          message?: string
          path?: string | null
          stack?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      communities: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "communities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_challenges: {
        Row: {
          community_id: string
          created_at: string
          created_by: string | null
          ends_on: string
          id: string
          starts_on: string
          target_minutes: number
          title: string
        }
        Insert: {
          community_id: string
          created_at?: string
          created_by?: string | null
          ends_on: string
          id?: string
          starts_on: string
          target_minutes: number
          title: string
        }
        Update: {
          community_id?: string
          created_at?: string
          created_by?: string | null
          ends_on?: string
          id?: string
          starts_on?: string
          target_minutes?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_challenges_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_challenges_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_members: {
        Row: {
          community_id: string
          joined_at: string
          role: string
          share_rank: boolean
          user_id: string
        }
        Insert: {
          community_id: string
          joined_at?: string
          role?: string
          share_rank?: boolean
          user_id: string
        }
        Update: {
          community_id?: string
          joined_at?: string
          role?: string
          share_rank?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_members_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_reactions: {
        Row: {
          community_id: string
          created_at: string
          emoji: string
          event_key: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          emoji: string
          event_key: string
          user_id?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          emoji?: string
          event_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_reactions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_wods: {
        Row: {
          community_id: string
          id: string
          note: string | null
          pinned_at: string
          pinned_by: string | null
          title: string
          workout_id: string
        }
        Insert: {
          community_id: string
          id?: string
          note?: string | null
          pinned_at?: string
          pinned_by?: string | null
          title: string
          workout_id: string
        }
        Update: {
          community_id?: string
          id?: string
          note?: string | null
          pinned_at?: string
          pinned_by?: string | null
          title?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_wods_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_wods_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_wods_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_links: {
        Row: {
          center_id: string | null
          created_at: string
          created_by: string
          from_exercise_id: string
          id: string
          kind: string
          to_exercise_id: string
          zone: string | null
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          created_by: string
          from_exercise_id: string
          id?: string
          kind: string
          to_exercise_id: string
          zone?: string | null
        }
        Update: {
          center_id?: string | null
          created_at?: string
          created_by?: string
          from_exercise_id?: string
          id?: string
          kind?: string
          to_exercise_id?: string
          zone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_links_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_links_from_exercise_id_fkey"
            columns: ["from_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_links_to_exercise_id_fkey"
            columns: ["to_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_mentions: {
        Row: {
          center_id: string | null
          created_at: string
          created_by: string
          exercise_id: string | null
          id: string
          name: string
          name_normalized: string
          occurrences: number
          source: string
        }
        Insert: {
          center_id?: string | null
          created_at?: string
          created_by: string
          exercise_id?: string | null
          id?: string
          name: string
          name_normalized: string
          occurrences?: number
          source: string
        }
        Update: {
          center_id?: string | null
          created_at?: string
          created_by?: string
          exercise_id?: string | null
          id?: string
          name?: string
          name_normalized?: string
          occurrences?: number
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_mentions_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_mentions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_mentions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
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
      exercise_references: {
        Row: {
          created_at: string
          created_by: string
          exercise_id: string
          id: string
          kind: string
          path: string
        }
        Insert: {
          created_at?: string
          created_by: string
          exercise_id: string
          id?: string
          kind: string
          path: string
        }
        Update: {
          created_at?: string
          created_by?: string
          exercise_id?: string
          id?: string
          kind?: string
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_references_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_references_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_results: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          performed_at: string
          reps: number | null
          seconds: number | null
          session_id: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          performed_at?: string
          reps?: number | null
          seconds?: number | null
          session_id?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          performed_at?: string
          reps?: number | null
          seconds?: number | null
          session_id?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_results_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          center_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          equipment: string[]
          id: string
          is_time_based: boolean
          level: string | null
          movement_type: string | null
          name: string
          origin_center_id: string | null
          published_at: string | null
          review_status: string | null
          reviewed_by: string | null
          secondary_movements: string[]
          updated_at: string
          video_path: string | null
          video_url: string | null
        }
        Insert: {
          body_region: string
          category: string
          center_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment?: string[]
          id?: string
          is_time_based?: boolean
          level?: string | null
          movement_type?: string | null
          name: string
          origin_center_id?: string | null
          published_at?: string | null
          review_status?: string | null
          reviewed_by?: string | null
          secondary_movements?: string[]
          updated_at?: string
          video_path?: string | null
          video_url?: string | null
        }
        Update: {
          body_region?: string
          category?: string
          center_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          equipment?: string[]
          id?: string
          is_time_based?: boolean
          level?: string | null
          movement_type?: string | null
          name?: string
          origin_center_id?: string | null
          published_at?: string | null
          review_status?: string | null
          reviewed_by?: string | null
          secondary_movements?: string[]
          updated_at?: string
          video_path?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercises_center_id_fkey"
            columns: ["center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "exercises_origin_center_id_fkey"
            columns: ["origin_center_id"]
            isOneToOne: false
            referencedRelation: "centers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercises_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_topic_votes: {
        Row: {
          created_at: string
          topic_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          topic_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          topic_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_topic_votes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "feature_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_topic_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_topics: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_topics_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_notifications: {
        Row: {
          created_at: string
          id: string
          recipient_id: string
          sender_id: string
          target_id: string
          target_kind: string
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_id: string
          sender_id: string
          target_id: string
          target_kind: string
        }
        Update: {
          created_at?: string
          id?: string
          recipient_id?: string
          sender_id?: string
          target_id?: string
          target_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invite_notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
          ai_avatar: string
          ai_tone: string
          avatar_url: string | null
          badges_seen_at: string | null
          created_at: string
          current_streak: number
          equipment: string[]
          full_name: string | null
          id: string
          language: string
          longest_streak: number
          onboarded_at: string | null
          onboarding: Json
          rank_seen_key: string | null
          role: string | null
          segment: string | null
          social_links: Json
          theme_pref: string
          total_minutes: number
        }
        Insert: {
          ai_avatar?: string
          ai_tone?: string
          avatar_url?: string | null
          badges_seen_at?: string | null
          created_at?: string
          current_streak?: number
          equipment?: string[]
          full_name?: string | null
          id: string
          language?: string
          longest_streak?: number
          onboarded_at?: string | null
          onboarding?: Json
          rank_seen_key?: string | null
          role?: string | null
          segment?: string | null
          social_links?: Json
          theme_pref?: string
          total_minutes?: number
        }
        Update: {
          ai_avatar?: string
          ai_tone?: string
          avatar_url?: string | null
          badges_seen_at?: string | null
          created_at?: string
          current_streak?: number
          equipment?: string[]
          full_name?: string | null
          id?: string
          language?: string
          longest_streak?: number
          onboarded_at?: string | null
          onboarding?: Json
          rank_seen_key?: string | null
          role?: string | null
          segment?: string | null
          social_links?: Json
          theme_pref?: string
          total_minutes?: number
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
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
          class_plan_id: string | null
          created_at: string
          id: string
          notes: string | null
          scheduled_date: string
          session_id: string | null
          title: string | null
          user_id: string
          workout_id: string | null
        }
        Insert: {
          class_plan_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date: string
          session_id?: string | null
          title?: string | null
          user_id: string
          workout_id?: string | null
        }
        Update: {
          class_plan_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          session_id?: string | null
          title?: string | null
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_workouts_class_plan_id_fkey"
            columns: ["class_plan_id"]
            isOneToOne: false
            referencedRelation: "class_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workouts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_workouts_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      score_reactions: {
        Row: {
          created_at: string
          emoji: string
          score_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          score_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          emoji?: string
          score_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "score_reactions_score_id_fkey"
            columns: ["score_id"]
            isOneToOne: false
            referencedRelation: "workout_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      support_messages: {
        Row: {
          context: Json
          created_at: string
          handled_at: string | null
          handled_by: string | null
          id: string
          kind: string
          message: string
          status: string
          user_id: string
        }
        Insert: {
          context?: Json
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          kind: string
          message: string
          status?: string
          user_id?: string
        }
        Update: {
          context?: Json
          created_at?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          kind?: string
          message?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      workout_scores: {
        Row: {
          capped: boolean
          created_at: string
          id: string
          load_kg: number | null
          note: string | null
          reps: number | null
          rounds: number | null
          rx: string
          score_type: string
          seconds: number | null
          session_id: string
          updated_at: string
          user_id: string
          workout_id: string
        }
        Insert: {
          capped?: boolean
          created_at?: string
          id?: string
          load_kg?: number | null
          note?: string | null
          reps?: number | null
          rounds?: number | null
          rx?: string
          score_type: string
          seconds?: number | null
          session_id: string
          updated_at?: string
          user_id?: string
          workout_id: string
        }
        Update: {
          capped?: boolean
          created_at?: string
          id?: string
          load_kg?: number | null
          note?: string | null
          reps?: number | null
          rounds?: number | null
          rx?: string
          score_type?: string
          seconds?: number | null
          session_id?: string
          updated_at?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_scores_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_scores_workout_id_fkey"
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
          rated_at: string | null
          rating: number | null
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
          rated_at?: string | null
          rating?: number | null
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
          rated_at?: string | null
          rating?: number | null
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
          is_benchmark: boolean
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
          is_benchmark?: boolean
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
          is_benchmark?: boolean
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
      accept_center_invite: {
        Args: { p_token: string }
        Returns: {
          center_id: string
          role: string
        }[]
      }
      assign_class_coach: {
        Args: { p_class: string; p_coach: string }
        Returns: undefined
      }
      can_edit_exercise: { Args: { p_exercise: string }; Returns: boolean }
      can_edit_exercise_path: { Args: { p_name: string }; Returns: boolean }
      can_see_score: { Args: { p_score: string }; Returns: boolean }
      center_role: { Args: { p_center: string }; Returns: string }
      check_in: {
        Args: { p_class: string; p_code?: string; p_date: string }
        Returns: string
      }
      create_center: {
        Args: {
          p_equipment?: string[]
          p_group_size?: string
          p_name: string
          p_venue?: string
        }
        Returns: string
      }
      get_center_classes: {
        Args: { p_center: string }
        Returns: {
          class_id: string
          coach_id: string
          coach_name: string
          created_at: string
          members_count: number
          name: string
          next_plan_date: string
          schedule: string
        }[]
      }
      get_center_favorite_wods: {
        Args: { p_center: string }
        Returns: {
          author_name: string
          average: number
          last_done: string
          ratings: number
          sessions: number
          title: string
          workout_id: string
        }[]
      }
      get_center_invite: {
        Args: { p_token: string }
        Returns: {
          center_name: string
          role: string
          valid: boolean
        }[]
      }
      get_center_suggestions: {
        Args: { p_center: string; p_status?: string }
        Returns: {
          anonymous: boolean
          author_name: string
          created_at: string
          id: string
          message: string
          status: string
        }[]
      }
      get_center_team: {
        Args: { p_center: string }
        Returns: {
          avatar_url: string
          full_name: string
          joined_at: string
          role: string
          user_id: string
        }[]
      }
      get_class_by_invite_token: {
        Args: { p_token: string }
        Returns: {
          center_id: string | null
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
      get_class_followup: {
        Args: { p_class_id: string }
        Returns: {
          athlete_id: string
          avatar_url: string
          current_streak: number
          full_name: string
          joined_at: string
          last_session_at: string
          minutes_30d: number
          minutes_7d: number
          sessions_30d: number
          sessions_7d: number
        }[]
      }
      get_class_leaderboard_since: {
        Args: { p_class_id: string; p_since: string }
        Returns: {
          athlete_id: string
          current_streak: number
          full_name: string
          longest_streak: number
          minutes: number
        }[]
      }
      get_community_challenges: {
        Args: { p_community: string }
        Returns: {
          contributors: number
          ends_on: string
          id: string
          progress_minutes: number
          starts_on: string
          target_minutes: number
          title: string
        }[]
      }
      get_community_feed: {
        Args: { p_community: string; p_limit?: number }
        Returns: {
          at: string
          avatar_url: string
          badge_key: string
          clap: number
          display_name: string
          event_key: string
          fire: number
          is_me: boolean
          kind: string
          minutes: number
          muscle: number
          my_reactions: string[]
          rank_key: string
          title: string
          user_id: string
        }[]
      }
      get_community_leaderboard_since: {
        Args: { p_community: string; p_since: string }
        Returns: {
          avatar_url: string
          display_name: string
          is_me: boolean
          minutes: number
          user_id: string
        }[]
      }
      get_community_member_profile: {
        Args: { p_community: string; p_user: string }
        Returns: {
          avatar_url: string
          badges: Json
          current_streak: number
          display_name: string
          is_owner: boolean
          longest_streak: number
          rank_key: string
          role: string
          social_links: Json
          total_minutes: number
          user_id: string
          visible: boolean
        }[]
      }
      get_community_members: {
        Args: { p_community: string }
        Returns: {
          avatar_url: string
          badges: number
          current_streak: number
          display_name: string
          is_me: boolean
          is_owner: boolean
          joined_at: string
          rank_key: string
          role: string
          share_rank: boolean
          total_minutes: number
          user_id: string
        }[]
      }
      get_community_wod: {
        Args: { p_community: string }
        Returns: {
          done_by: Json
          i_did: boolean
          id: string
          note: string
          pinned_at: string
          title: string
          workout_id: string
        }[]
      }
      get_exercise_review_queue: {
        Args: never
        Returns: {
          author_name: string
          center_name: string
          created_at: string
          exercise_id: string
          name: string
          references_count: number
          review_status: string
        }[]
      }
      get_exercise_variants: {
        Args: { p_exercise: string }
        Returns: {
          center_id: string
          exercise_id: string
          kind: string
          link_id: string
          name: string
          zone: string
        }[]
      }
      get_feature_topics: {
        Args: never
        Returns: {
          created_at: string
          description: string
          id: string
          is_mine: boolean
          status: string
          title: string
          votes: number
        }[]
      }
      get_shared_rank: {
        Args: { p_token: string }
        Returns: {
          avatar_url: string
          current_streak: number
          display_name: string
          rank_key: string
          social_links: Json
          total_minutes: number
        }[]
      }
      get_support_inbox: {
        Args: { p_status?: string }
        Returns: {
          author_email: string
          author_name: string
          context: Json
          created_at: string
          id: string
          kind: string
          message: string
          status: string
        }[]
      }
      get_video_priorities: {
        Args: { p_limit?: number }
        Returns: {
          exercise_id: string
          has_video: boolean
          in_common: boolean
          name: string
          sources: number
          total: number
        }[]
      }
      get_whiteboard: {
        Args: { p_plan: string }
        Returns: {
          athlete_id: string
          avatar_url: string
          capped: boolean
          full_name: string
          load_kg: number
          my_reaction: string
          note: string
          performed_at: string
          reactions: number
          reps: number
          rounds: number
          rx: string
          score_id: string
          score_type: string
          seconds: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_authored: { Args: { p_uid: string }; Returns: boolean }
      is_center_lead: { Args: { p_center: string }; Returns: boolean }
      is_center_staff: { Args: { p_center: string }; Returns: boolean }
      is_class_coach: { Args: { p_class_id: string }; Returns: boolean }
      is_class_lead: { Args: { p_class_id: string }; Returns: boolean }
      is_class_member: { Args: { p_class_id: string }; Returns: boolean }
      is_community_admin: { Args: { p_community: string }; Returns: boolean }
      is_community_member: { Args: { p_community: string }; Returns: boolean }
      is_community_owner: { Args: { p_community: string }; Returns: boolean }
      log_client_error: {
        Args: {
          p_app_version?: string
          p_kind: string
          p_message: string
          p_path?: string
          p_stack?: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      open_checkin: {
        Args: { p_class: string }
        Returns: {
          code: string
          expires_at: string
        }[]
      }
      review_center_exercise: {
        Args: { p_decision: string; p_exercise: string }
        Returns: undefined
      }
      set_center_suggestion_status: {
        Args: { p_id: string; p_status: string }
        Returns: undefined
      }
      shares_center_staff: { Args: { p_user: string }; Returns: boolean }
      wodbud_check_push_cron_secret: {
        Args: { p_secret: string }
        Returns: boolean
      }
      wodbud_rank_for_minutes: { Args: { p_minutes: number }; Returns: string }
      wodbud_recalc_badges: { Args: { p_user?: string }; Returns: string[] }
      wodbud_user_id_by_email: { Args: { p_email: string }; Returns: string }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
