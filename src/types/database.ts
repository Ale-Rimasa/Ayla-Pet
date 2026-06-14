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
      categories: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          order_id: string
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
          variant_id: string | null
          variant_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          order_id: string
          product_name: string
          quantity: number
          subtotal: number
          unit_price: number
          variant_id?: string | null
          variant_name: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          order_id?: string
          product_name?: string
          quantity?: number
          subtotal?: number
          unit_price?: number
          variant_id?: string | null
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_reference_photos: {
        Row: {
          created_at: string
          display_order: number
          id: string
          mime_type: string
          order_id: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          mime_type: string
          order_id: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          mime_type?: string
          order_id?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_reference_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipping_packages: {
        Row: {
          bulto_index: number
          created_at: string
          height_mm: number
          id: string
          length_mm: number
          order_id: string
          package_profile_id: string
          weight_g: number
          width_mm: number
        }
        Insert: {
          bulto_index: number
          created_at?: string
          height_mm: number
          id?: string
          length_mm: number
          order_id: string
          package_profile_id: string
          weight_g: number
          width_mm: number
        }
        Update: {
          bulto_index?: number
          created_at?: string
          height_mm?: number
          id?: string
          length_mm?: number
          order_id?: string
          package_profile_id?: string
          weight_g?: number
          width_mm?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_shipping_packages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          notes: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id: string
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          notes?: string | null
          order_id?: string
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          engraving_text: string | null
          id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          notes: string | null
          shipping_agency_code: string | null
          shipping_agency_snapshot: Json | null
          shipping_city: string
          shipping_cost: number
          shipping_delivered_type: string | null
          shipping_postal_code: string
          shipping_product_type: string | null
          shipping_province: string
          shipping_street: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          engraving_text?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          shipping_agency_code?: string | null
          shipping_agency_snapshot?: Json | null
          shipping_city: string
          shipping_cost?: number
          shipping_delivered_type?: string | null
          shipping_postal_code: string
          shipping_product_type?: string | null
          shipping_province: string
          shipping_street: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          engraving_text?: string | null
          id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          notes?: string | null
          shipping_agency_code?: string | null
          shipping_agency_snapshot?: Json | null
          shipping_city?: string
          shipping_cost?: number
          shipping_delivered_type?: string | null
          shipping_postal_code?: string
          shipping_product_type?: string | null
          shipping_province?: string
          shipping_street?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency_id: string
          id: string
          mp_payment_id: string
          mp_preference_id: string | null
          order_id: string
          payment_method_id: string | null
          payment_type_id: string | null
          raw_data: Json | null
          status: string
          status_detail: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency_id?: string
          id?: string
          mp_payment_id: string
          mp_preference_id?: string | null
          order_id: string
          payment_method_id?: string | null
          payment_type_id?: string | null
          raw_data?: Json | null
          status: string
          status_detail?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency_id?: string
          id?: string
          mp_payment_id?: string
          mp_preference_id?: string | null
          order_id?: string
          payment_method_id?: string | null
          payment_type_id?: string | null
          raw_data?: Json | null
          status?: string
          status_detail?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          label: string | null
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          label?: string | null
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          label?: string | null
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          price: number
          product_id: string
          sku: string | null
          sort_order: number
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          price: number
          product_id: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          price?: number
          product_id?: string
          sku?: string | null
          sort_order?: number
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          featured: boolean
          id: string
          images: string[]
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          featured?: boolean
          id?: string
          images?: string[]
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          featured?: boolean
          id?: string
          images?: string[]
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      rate_limit_events: {
        Row: {
          created_at: string
          id: number
          key: string
        }
        Insert: {
          created_at?: string
          id?: never
          key: string
        }
        Update: {
          created_at?: string
          id?: never
          key?: string
        }
        Relationships: []
      }
      shipping_package_profiles: {
        Row: {
          created_at: string
          height_mm: number | null
          id: string
          is_active: boolean
          label: string
          length_mm: number | null
          weight_g: number | null
          width_mm: number | null
        }
        Insert: {
          created_at?: string
          height_mm?: number | null
          id: string
          is_active?: boolean
          label: string
          length_mm?: number | null
          weight_g?: number | null
          width_mm?: number | null
        }
        Update: {
          created_at?: string
          height_mm?: number | null
          id?: string
          is_active?: boolean
          label?: string
          length_mm?: number | null
          weight_g?: number | null
          width_mm?: number | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      variant_shipping_packages: {
        Row: {
          created_at: string
          id: string
          package_profile_id: string
          quantity: number
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          package_profile_id: string
          quantity?: number
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          package_profile_id?: string
          quantity?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_shipping_packages_package_profile_id_fkey"
            columns: ["package_profile_id"]
            isOneToOne: false
            referencedRelation: "shipping_package_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_shipping_packages_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_guest_orders: {
        Args: { p_email: string; p_user_id: string }
        Returns: number
      }
      create_order:
        | {
            Args: {
              p_customer_email: string
              p_customer_name: string
              p_customer_phone: string
              p_items?: Json
              p_notes?: string
              p_shipping_city: string
              p_shipping_cost: number
              p_shipping_postal_code: string
              p_shipping_province: string
              p_shipping_street: string
              p_subtotal: number
              p_total: number
            }
            Returns: string
          }
        | {
            Args: {
              p_customer_email: string
              p_customer_name: string
              p_customer_phone: string
              p_items?: Json
              p_notes?: string
              p_shipping_city: string
              p_shipping_cost: number
              p_shipping_postal_code: string
              p_shipping_province: string
              p_shipping_street: string
              p_subtotal: number
              p_total: number
              p_user_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_customer_email: string
              p_customer_name: string
              p_customer_phone: string
              p_items?: Json
              p_notes?: string
              p_shipping_city: string
              p_shipping_cost: number
              p_shipping_packages?: Json
              p_shipping_postal_code: string
              p_shipping_province: string
              p_shipping_street: string
              p_subtotal: number
              p_total: number
              p_user_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_customer_email: string
              p_customer_name: string
              p_customer_phone: string
              p_engraving_text?: string
              p_items?: Json
              p_notes?: string
              p_shipping_city: string
              p_shipping_cost: number
              p_shipping_packages?: Json
              p_shipping_postal_code: string
              p_shipping_province: string
              p_shipping_street: string
              p_subtotal: number
              p_total: number
              p_user_id?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_customer_email: string
              p_customer_name: string
              p_customer_phone: string
              p_engraving_text?: string
              p_items?: Json
              p_notes?: string
              p_shipping_agency_code?: string
              p_shipping_agency_snapshot?: Json
              p_shipping_city: string
              p_shipping_cost: number
              p_shipping_delivered_type?: string
              p_shipping_packages?: Json
              p_shipping_postal_code: string
              p_shipping_product_type?: string
              p_shipping_province: string
              p_shipping_street: string
              p_subtotal: number
              p_total: number
              p_user_id?: string
            }
            Returns: string
          }
      decrement_stock: {
        Args: { p_qty: number; p_variant_id: string }
        Returns: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          price: number
          product_id: string
          sku: string | null
          sort_order: number
          stock: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "product_variants"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      decrement_stock_batch: { Args: { p_items: Json }; Returns: undefined }
      get_customers_for_admin: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          email: string
          first_order_at: string
          is_vip: boolean
          last_order_at: string
          name: string
          order_count: number
          phone: string
          total_count: number
          total_revenue: number
        }[]
      }
      get_customers_kpis: {
        Args: never
        Returns: {
          new_this_month: number
          recurring: number
          total_customers: number
          vip_count: number
        }[]
      }
      get_top_customers: {
        Args: { p_limit?: number }
        Returns: {
          email: string
          name: string
          order_count: number
          total_revenue: number
        }[]
      }
      get_top_products: {
        Args: { p_limit?: number }
        Returns: {
          product_name: string
          qty_sold: number
          revenue: number
          variant_name: string
        }[]
      }
      is_admin: { Args: { uid: string }; Returns: boolean }
      update_order_status_atomic: {
        Args: {
          p_actor_id?: string
          p_from_status: string
          p_new_status: string
          p_order_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      order_status:
        | "pending"
        | "paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      user_role: "admin" | "customer"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      order_status: [
        "pending",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      user_role: ["admin", "customer"],
    },
  },
} as const
