export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      analyses: {
        Row: {
          content_md: string;
          created_at: string;
          id: string;
          plan_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content_md: string;
          created_at?: string;
          id?: string;
          plan_date: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content_md?: string;
          created_at?: string;
          id?: string;
          plan_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      coach_messages: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          sender_id: string | null;
          sender_role: string;
          thread_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
          sender_role: string;
          thread_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          sender_id?: string | null;
          sender_role?: string;
          thread_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coach_messages_thread_id_fkey";
            columns: ["thread_id"];
            isOneToOne: false;
            referencedRelation: "coach_threads";
            referencedColumns: ["id"];
          },
        ];
      };
      coach_threads: {
        Row: {
          assigned_pt_id: string | null;
          created_at: string;
          escalated_at: string | null;
          id: string;
          status: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          assigned_pt_id?: string | null;
          created_at?: string;
          escalated_at?: string | null;
          id?: string;
          status?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          assigned_pt_id?: string | null;
          created_at?: string;
          escalated_at?: string | null;
          id?: string;
          status?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      inbody_entries: {
        Row: {
          bmi: number | null;
          body_fat_pct: number | null;
          created_at: string;
          file_url: string | null;
          id: string;
          measured_at: string;
          notes: string | null;
          skeletal_muscle_kg: number | null;
          user_id: string;
          visceral_fat: number | null;
          weight_kg: number | null;
        };
        Insert: {
          bmi?: number | null;
          body_fat_pct?: number | null;
          created_at?: string;
          file_url?: string | null;
          id?: string;
          measured_at?: string;
          notes?: string | null;
          skeletal_muscle_kg?: number | null;
          user_id: string;
          visceral_fat?: number | null;
          weight_kg?: number | null;
        };
        Update: {
          bmi?: number | null;
          body_fat_pct?: number | null;
          created_at?: string;
          file_url?: string | null;
          id?: string;
          measured_at?: string;
          notes?: string | null;
          skeletal_muscle_kg?: number | null;
          user_id?: string;
          visceral_fat?: number | null;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      meal_logs: {
        Row: {
          calories: number | null;
          carbs_g: number | null;
          created_at: string;
          eaten_at: string;
          fat_g: number | null;
          id: string;
          meal_type: string | null;
          name: string;
          photo_url: string | null;
          protein_g: number | null;
          user_id: string;
        };
        Insert: {
          calories?: number | null;
          carbs_g?: number | null;
          created_at?: string;
          eaten_at?: string;
          fat_g?: number | null;
          id?: string;
          meal_type?: string | null;
          name: string;
          photo_url?: string | null;
          protein_g?: number | null;
          user_id: string;
        };
        Update: {
          calories?: number | null;
          carbs_g?: number | null;
          created_at?: string;
          eaten_at?: string;
          fat_g?: number | null;
          id?: string;
          meal_type?: string | null;
          name?: string;
          photo_url?: string | null;
          protein_g?: number | null;
          user_id?: string;
        };
        Relationships: [];
      };
      nutrition_reports: {
        Row: {
          breakfast: string | null;
          calories: number | null;
          carbs_g: number | null;
          created_at: string;
          day_type: string | null;
          dinner: string | null;
          fats_g: number | null;
          id: string;
          lunch: string | null;
          notes: string | null;
          post_workout_meal: string | null;
          pre_workout_meal: string | null;
          protein_g: number | null;
          report_date: string;
          snacks: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          breakfast?: string | null;
          calories?: number | null;
          carbs_g?: number | null;
          created_at?: string;
          day_type?: string | null;
          dinner?: string | null;
          fats_g?: number | null;
          id?: string;
          lunch?: string | null;
          notes?: string | null;
          post_workout_meal?: string | null;
          pre_workout_meal?: string | null;
          protein_g?: number | null;
          report_date?: string;
          snacks?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          breakfast?: string | null;
          calories?: number | null;
          carbs_g?: number | null;
          created_at?: string;
          day_type?: string | null;
          dinner?: string | null;
          fats_g?: number | null;
          id?: string;
          lunch?: string | null;
          notes?: string | null;
          post_workout_meal?: string | null;
          pre_workout_meal?: string | null;
          protein_g?: number | null;
          report_date?: string;
          snacks?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      post_comments: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      post_likes: {
        Row: {
          created_at: string;
          post_id: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          post_id: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          post_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          content: string | null;
          created_at: string;
          id: string;
          image_url: string | null;
          kind: string;
          user_id: string;
        };
        Insert: {
          content?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          kind?: string;
          user_id: string;
        };
        Update: {
          content?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string | null;
          kind?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          bio: string | null;
          branch: string;
          created_at: string;
          display_name: string | null;
          dob: string | null;
          gender: string | null;
          goal: string | null;
          height_cm: number | null;
          id: string;
          level: string | null;
          limitations: string | null;
          target_weight_kg: number | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          bio?: string | null;
          branch?: string;
          created_at?: string;
          display_name?: string | null;
          dob?: string | null;
          gender?: string | null;
          goal?: string | null;
          height_cm?: number | null;
          id: string;
          level?: string | null;
          limitations?: string | null;
          target_weight_kg?: number | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          bio?: string | null;
          branch?: string;
          created_at?: string;
          display_name?: string | null;
          dob?: string | null;
          gender?: string | null;
          goal?: string | null;
          height_cm?: number | null;
          id?: string;
          level?: string | null;
          limitations?: string | null;
          target_weight_kg?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      progress_reports: {
        Row: {
          created_at: string;
          id: string;
          notes: string | null;
          report_date: string;
          streak_days: number | null;
          total_sessions: number | null;
          total_volume: number | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          report_date?: string;
          streak_days?: number | null;
          total_sessions?: number | null;
          total_volume?: number | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          notes?: string | null;
          report_date?: string;
          streak_days?: number | null;
          total_sessions?: number | null;
          total_volume?: number | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      pt_applications: {
        Row: {
          created_at: string;
          id: string;
          message: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          message?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          message?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      pt_presence: {
        Row: {
          is_online: boolean;
          last_seen_at: string;
          user_id: string;
        };
        Insert: {
          is_online?: boolean;
          last_seen_at?: string;
          user_id: string;
        };
        Update: {
          is_online?: boolean;
          last_seen_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      workout_logs: {
        Row: {
          created_at: string;
          duration_min: number | null;
          exercise: string;
          id: string;
          notes: string | null;
          performed_at: string;
          reps: number | null;
          sets: number | null;
          user_id: string;
          weight_kg: number | null;
          workout_type: string | null;
        };
        Insert: {
          created_at?: string;
          duration_min?: number | null;
          exercise: string;
          id?: string;
          notes?: string | null;
          performed_at?: string;
          reps?: number | null;
          sets?: number | null;
          user_id: string;
          weight_kg?: number | null;
          workout_type?: string | null;
        };
        Update: {
          created_at?: string;
          duration_min?: number | null;
          exercise?: string;
          id?: string;
          notes?: string | null;
          performed_at?: string;
          reps?: number | null;
          sets?: number | null;
          user_id?: string;
          weight_kg?: number | null;
          workout_type?: string | null;
        };
        Relationships: [];
      };
      workout_plan_docs: {
        Row: {
          content_md: string;
          created_at: string;
          id: string;
          plan_date: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          content_md: string;
          created_at?: string;
          id?: string;
          plan_date?: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          content_md?: string;
          created_at?: string;
          id?: string;
          plan_date?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      workout_plans: {
        Row: {
          created_at: string;
          id: string;
          plan: Json;
          title: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          plan: Json;
          title: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          plan?: Json;
          title?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_user_role: {
        Args: never;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "pt" | "user";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "pt", "user"],
    },
  },
} as const;
