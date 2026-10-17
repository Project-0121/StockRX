export type UserRole = "admin" | "staff";

export type DosageForm =
  | "Tablet"
  | "Capsule"
  | "Syrup"
  | "Injection"
  | "Ointment"
  | "Drops"
  | "Powder"
  | "Other";

export type MovementType = "IN" | "OUT";

export type MovementReason =
  | "PURCHASE"
  | "SALE"
  | "DISPENSE"
  | "DAMAGED"
  | "EXPIRED"
  | "ADJUSTMENT";

export type StockStatus =
  | "OUT_OF_STOCK"
  | "EXPIRED"
  | "LOW_STOCK"
  | "NEAR_EXPIRY"
  | "AVAILABLE";

export type ExpiryStatus = "EXPIRED" | "NEAR_EXPIRY" | "SAFE";

export interface Profile {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppSetting {
  key: string;
  value: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Medicine {
  id: string;
  name: string;
  generic_name: string | null;
  category_id: string | null;
  strength: string;
  dosage_form: DosageForm;
  unit_price: number;
  reorder_level: number;
  default_supplier_id: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  medicine_id: string;
  supplier_id: string | null;
  batch_number: string;
  quantity: number;
  initial_quantity: number;
  purchase_price: number | null;
  manufacture_date: string | null;
  expiry_date: string;
  received_date: string;
  created_at: string;
  updated_at: string;
}

export interface Purchase {
  id: string;
  supplier_id: string | null;
  invoice_number: string | null;
  purchase_date: string;
  total_cost: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  supplier?: Supplier;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  medicine_id: string;
  batch_id: string | null;
  batch_number: string;
  quantity: number;
  unit_cost: number;
  expiry_date: string;
  medicine?: Medicine;
}

export interface StockMovement {
  id: string;
  medicine_id: string;
  batch_id: string;
  movement_type: MovementType;
  reason: MovementReason;
  quantity: number;
  batch_balance_after: number;
  reference_id: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
  medicine?: Medicine;
  batch?: Batch;
  performer?: Profile;
}

export interface AlertLog {
  id: string;
  run_date: string;
  low_stock_count: number;
  near_expiry_count: number;
  expired_count: number;
  created_at: string;
}

// Views
export interface BatchStatusView extends Batch {
  medicine_name: string;
  strength: string;
  dosage_form: DosageForm;
  supplier_name: string | null;
  days_to_expiry: number;
  expiry_status: ExpiryStatus;
}

export interface MedicineStockView extends Medicine {
  category_name: string | null;
  supplier_name: string | null;
  sellable_quantity: number;
  expired_quantity: number;
  total_quantity_all: number;
  earliest_expiry: string | null;
  is_low_stock: boolean;
  has_near_expiry: boolean;
  has_expired: boolean;
  stock_value: number;
  stock_status: StockStatus;
}

export interface DashboardSummaryView {
  total_stock_units: number;
  low_stock_count: number;
  near_expiry_count: number;
  expired_count: number;
  total_medicines: number;
  total_stock_value: number;
}

// Supabase Database Mapping
export interface Database {
  public: {
    Tables: {
      app_settings: {
        Row: AppSetting;
        Insert: { key: string; value: string; updated_at?: string };
        Update: Partial<AppSetting>;
      };
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          full_name: string;
          email?: string | null;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Profile>;
      };
      categories: {
        Row: Category;
        Insert: { id?: string; name: string };
        Update: Partial<Category>;
      };
      suppliers: {
        Row: Supplier;
        Insert: {
          id?: string;
          name: string;
          contact_person?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Supplier>;
      };
      medicines: {
        Row: Medicine;
        Insert: {
          id?: string;
          name: string;
          generic_name?: string | null;
          category_id?: string | null;
          strength: string;
          dosage_form: DosageForm;
          unit_price?: number;
          reorder_level?: number;
          default_supplier_id?: string | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Medicine>;
      };
      batches: {
        Row: Batch;
        Insert: {
          id?: string;
          medicine_id: string;
          supplier_id?: string | null;
          batch_number: string;
          quantity: number;
          initial_quantity: number;
          purchase_price?: number | null;
          manufacture_date?: string | null;
          expiry_date: string;
          received_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Batch>;
      };
      purchases: {
        Row: Purchase;
        Insert: {
          id?: string;
          supplier_id?: string | null;
          invoice_number?: string | null;
          purchase_date: string;
          total_cost?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Purchase>;
      };
      purchase_items: {
        Row: PurchaseItem;
        Insert: {
          id?: string;
          purchase_id: string;
          medicine_id: string;
          batch_id?: string | null;
          batch_number: string;
          quantity: number;
          unit_cost: number;
          expiry_date: string;
        };
        Update: Partial<PurchaseItem>;
      };
      stock_movements: {
        Row: StockMovement;
        Insert: {
          id?: string;
          medicine_id: string;
          batch_id: string;
          movement_type: MovementType;
          reason: MovementReason;
          quantity: number;
          batch_balance_after: number;
          reference_id?: string | null;
          notes?: string | null;
          performed_by?: string | null;
          created_at?: string;
        };
        Update: Partial<StockMovement>;
      };
      alerts_log: {
        Row: AlertLog;
        Insert: {
          id?: string;
          run_date: string;
          low_stock_count: number;
          near_expiry_count: number;
          expired_count: number;
          created_at?: string;
        };
        Update: Partial<AlertLog>;
      };
    };
    Views: {
      v_batch_status: {
        Row: BatchStatusView;
      };
      v_medicine_stock: {
        Row: MedicineStockView;
      };
      v_dashboard_summary: {
        Row: DashboardSummaryView;
      };
    };
    Functions: {
      app_today: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_near_expiry_days: {
        Args: Record<string, never>;
        Returns: number;
      };
      create_purchase: {
        Args: {
          p_supplier_id: string;
          p_invoice_number: string | null;
          p_purchase_date: string;
          p_notes: string | null;
          p_items: unknown;
          p_user_id: string;
        };
        Returns: string;
      };
      dispense_stock: {
        Args: {
          p_medicine_id: string;
          p_quantity: number;
          p_reason: string;
          p_notes: string;
          p_user_id: string;
        };
        Returns: unknown;
      };
      write_off_expired: {
        Args: {
          p_batch_id: string;
          p_user_id: string;
        };
        Returns: unknown;
      };
      adjust_stock: {
        Args: {
          p_batch_id: string;
          p_new_quantity: number;
          p_notes: string;
          p_user_id: string;
        };
        Returns: unknown;
      };
      exec_sql: {
        Args: {
          sql: string;
        };
        Returns: unknown;
      };
    };
  };
}
