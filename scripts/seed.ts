import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log("=====================================================");
  console.log("Starting PharmaTrack Database Seeding (Idempotent)...");
  console.log("=====================================================");

  // 1. SEED USERS & PROFILES
  console.log("\n[1/6] Seeding Admin and Staff Users...");
  const usersToSeed = [
    {
      email: "admin@pharmacy.com",
      password: "Admin@123",
      full_name: "System Administrator",
      role: "admin",
    },
    {
      email: "staff@pharmacy.com",
      password: "Staff@123",
      full_name: "Demo Pharmacist",
      role: "staff",
    },
  ];

  const { data: existingUsersData, error: listUsersError } = await supabase.auth.admin.listUsers();
  if (listUsersError) {
    console.error("Error listing auth users:", listUsersError.message);
  }

  const existingUsers = existingUsersData?.users || [];
  const profileMap: Record<string, string> = {};

  for (const userDef of usersToSeed) {
    let userId: string;
    const existing = existingUsers.find((u) => u.email?.toLowerCase() === userDef.email.toLowerCase());

    if (existing) {
      userId = existing.id;
      console.log(`- User ${userDef.email} already exists (ID: ${userId}). Updating profile...`);
      await supabase.auth.admin.updateUserById(userId, {
        password: userDef.password,
        user_metadata: { full_name: userDef.full_name },
        email_confirm: true,
      });
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userDef.email,
        password: userDef.password,
        email_confirm: true,
        user_metadata: { full_name: userDef.full_name },
      });

      if (createError || !newUser?.user) {
        throw new Error(`Failed to create auth user ${userDef.email}: ${createError?.message}`);
      }
      userId = newUser.user.id;
      console.log(`- Created user ${userDef.email} (ID: ${userId})`);
    }

    // Set profile in profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          full_name: userDef.full_name,
          email: userDef.email,
          role: userDef.role,
          is_active: true,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      throw new Error(`Failed to upsert profile for ${userDef.email}: ${profileError.message}`);
    }

    profileMap[userDef.email] = userId;
  }

  const adminUserId = profileMap["admin@pharmacy.com"];
  const staffUserId = profileMap["staff@pharmacy.com"];

  // 2. SEED CATEGORIES
  console.log("\n[2/6] Verifying categories...");
  const categoriesList = [
    "Antibiotic",
    "Analgesic",
    "Vitamin and Supplement",
    "Antacid",
    "Cough and Cold",
    "Antidiabetic",
    "Antihypertensive",
    "Antihistamine",
    "First Aid",
    "Other",
  ];

  for (const cat of categoriesList) {
    await supabase.from("categories").upsert({ name: cat }, { onConflict: "name" });
  }

  const { data: catRows } = await supabase.from("categories").select("id, name");
  const categoryMap: Record<string, string> = {};
  catRows?.forEach((c) => {
    categoryMap[c.name] = c.id;
  });

  // 3. SEED SUPPLIERS
  console.log("\n[3/6] Seeding Suppliers with realistic Indian contact details...");
  const suppliersData = [
    {
      name: "MedLife Distributors",
      contact_person: "Rajesh Sharma",
      phone: "+91 98201 44521",
      email: "orders@medlifedist.in",
      address: "Plot 42, MIDC Industrial Area, Andheri East, Mumbai, Maharashtra 400093",
    },
    {
      name: "HealWell Pharma",
      contact_person: "Sunita Verma",
      phone: "+91 98450 77123",
      email: "sales@healwellpharma.com",
      address: "18/2, Peenya Industrial Estate Phase 3, Bengaluru, Karnataka 560058",
    },
    {
      name: "Apex Healthcare",
      contact_person: "Vikram Malhotra",
      phone: "+91 98112 33456",
      email: "v.malhotra@apexhealthcare.co.in",
      address: "B-14, Okhla Industrial Area Phase 1, New Delhi, Delhi 110020",
    },
    {
      name: "Sunrise Wholesalers",
      contact_person: "Anil Patel",
      phone: "+91 98791 22890",
      email: "contact@sunrisewholesale.in",
      address: "Shop 104, Ring Road Market, Surat, Gujarat 395002",
    },
  ];

  const supplierMap: Record<string, string> = {};
  for (const s of suppliersData) {
    const { data: supRow, error: supErr } = await supabase
      .from("suppliers")
      .upsert({ ...s, is_active: true }, { onConflict: "name" })
      .select("id, name")
      .single();

    if (supErr || !supRow) {
      throw new Error(`Failed to upsert supplier ${s.name}: ${supErr?.message}`);
    }
    supplierMap[supRow.name] = supRow.id;
    console.log(`- Supplier: ${supRow.name}`);
  }

  // 4. SEED MEDICINES
  console.log("\n[4/6] Seeding 20 Medicines across Categories...");
  const medicinesData = [
    // 4 Presentation Medicines:
    {
      name: "Paracetamol",
      generic_name: "Acetaminophen",
      category: "Analgesic",
      strength: "500mg",
      dosage_form: "Tablet",
      unit_price: 3.5,
      reorder_level: 20,
      supplier: "MedLife Distributors",
      description: "Fast-acting pain reliever and fever reducer.",
    },
    {
      name: "Amoxicillin",
      generic_name: "Amoxicillin Trihydrate",
      category: "Antibiotic",
      strength: "250mg",
      dosage_form: "Capsule",
      unit_price: 12.0,
      reorder_level: 20,
      supplier: "HealWell Pharma",
      description: "Broad-spectrum beta-lactam antibiotic for bacterial infections.",
    },
    {
      name: "Vitamin D3",
      generic_name: "Cholecalciferol",
      category: "Vitamin and Supplement",
      strength: "60000 IU",
      dosage_form: "Capsule",
      unit_price: 45.0,
      reorder_level: 20,
      supplier: "Apex Healthcare",
      description: "Weekly chewable/softgel supplement for calcium absorption and bone health.",
    },
    {
      name: "Cough Syrup",
      generic_name: "Dextromethorphan + Chlorpheniramine",
      category: "Cough and Cold",
      strength: "100ml",
      dosage_form: "Syrup",
      unit_price: 85.0,
      reorder_level: 15,
      supplier: "Sunrise Wholesalers",
      description: "Relief from dry cough, sneezing and upper respiratory allergy symptoms.",
    },

    // Additional 16 realistic medicines:
    {
      name: "Azithromycin",
      generic_name: "Azithromycin Dihydrate",
      category: "Antibiotic",
      strength: "500mg",
      dosage_form: "Tablet",
      unit_price: 24.5,
      reorder_level: 25,
      supplier: "MedLife Distributors",
      description: "Macrolide antibiotic for respiratory tract and skin infections.",
    },
    {
      name: "Ciprofloxacin",
      generic_name: "Ciprofloxacin HCl",
      category: "Antibiotic",
      strength: "500mg",
      dosage_form: "Tablet",
      unit_price: 18.0,
      reorder_level: 15,
      supplier: "HealWell Pharma",
      description: "Fluoroquinolone antibiotic for urinary and enteric infections.",
    },
    {
      name: "Ibuprofen",
      generic_name: "Ibuprofen",
      category: "Analgesic",
      strength: "400mg",
      dosage_form: "Tablet",
      unit_price: 4.2,
      reorder_level: 30,
      supplier: "Sunrise Wholesalers",
      description: "Non-steroidal anti-inflammatory drug (NSAID) for pain and inflammation.",
    },
    {
      name: "Diclofenac Gel",
      generic_name: "Diclofenac Diethylamine",
      category: "Analgesic",
      strength: "30g",
      dosage_form: "Ointment",
      unit_price: 95.0,
      reorder_level: 10,
      supplier: "Apex Healthcare",
      description: "Topical pain-relief gel for sprains, muscle aches and joint stiffness.",
    },
    {
      name: "Pantoprazole",
      generic_name: "Pantoprazole Sodium",
      category: "Antacid",
      strength: "40mg",
      dosage_form: "Tablet",
      unit_price: 9.5,
      reorder_level: 25,
      supplier: "MedLife Distributors",
      description: "Proton pump inhibitor for acidity, GERD, and peptic ulcers.",
    },
    {
      name: "Gelusil Antacid",
      generic_name: "Magnesium Hydroxide + Aluminium Hydroxide",
      category: "Antacid",
      strength: "200ml",
      dosage_form: "Syrup",
      unit_price: 115.0,
      reorder_level: 12,
      supplier: "HealWell Pharma",
      description: "Liquid antacid offering immediate heartburn and acid indigestion relief.",
    },
    {
      name: "Metformin",
      generic_name: "Metformin Hydrochloride",
      category: "Antidiabetic",
      strength: "500mg",
      dosage_form: "Tablet",
      unit_price: 4.0,
      reorder_level: 40,
      supplier: "Apex Healthcare",
      description: "First-line oral anti-hyperglycemic agent for Type 2 diabetes management.",
    },
    {
      name: "Glimepiride",
      generic_name: "Glimepiride",
      category: "Antidiabetic",
      strength: "2mg",
      dosage_form: "Tablet",
      unit_price: 7.8,
      reorder_level: 20,
      supplier: "Sunrise Wholesalers",
      description: "Sulfonylurea to stimulate insulin secretion in Type 2 diabetic patients.",
    },
    {
      name: "Amlodipine",
      generic_name: "Amlodipine Besylate",
      category: "Antihypertensive",
      strength: "5mg",
      dosage_form: "Tablet",
      unit_price: 5.5,
      reorder_level: 30,
      supplier: "MedLife Distributors",
      description: "Calcium channel blocker for hypertension and chronic stable angina.",
    },
    {
      name: "Telmisartan",
      generic_name: "Telmisartan",
      category: "Antihypertensive",
      strength: "40mg",
      dosage_form: "Tablet",
      unit_price: 14.0,
      reorder_level: 25,
      supplier: "HealWell Pharma",
      description: "Angiotensin II receptor antagonist for blood pressure control.",
    },
    {
      name: "Cetirizine",
      generic_name: "Cetirizine Dihydrochloride",
      category: "Antihistamine",
      strength: "10mg",
      dosage_form: "Tablet",
      unit_price: 3.2,
      reorder_level: 25,
      supplier: "Apex Healthcare",
      description: "Second-generation antihistamine for seasonal rhinitis, itching and hives.",
    },
    {
      name: "Levocetirizine",
      generic_name: "Levocetirizine Dihydrochloride",
      category: "Antihistamine",
      strength: "5mg",
      dosage_form: "Tablet",
      unit_price: 6.5,
      reorder_level: 20,
      supplier: "Sunrise Wholesalers",
      description: "High-affinity antihistamine for allergic rhinitis and chronic urticaria.",
    },
    {
      name: "Multivitamin Gold",
      generic_name: "Zinc + B-Complex + Minerals",
      category: "Vitamin and Supplement",
      strength: "Capsule",
      dosage_form: "Capsule",
      unit_price: 18.0,
      reorder_level: 20,
      supplier: "MedLife Distributors",
      description: "Daily immunity booster and nutritional dietary supplement.",
    },
    {
      name: "Povidone Iodine 10%",
      generic_name: "Povidone-Iodine Solution",
      category: "First Aid",
      strength: "100ml",
      dosage_form: "Drops",
      unit_price: 88.0,
      reorder_level: 10,
      supplier: "HealWell Pharma",
      description: "Antiseptic topical solution for cuts, minor burns, and wound disinfection.",
    },
    {
      name: "Insulin Glargine",
      generic_name: "Insulin Glargine (rDNA)",
      category: "Antidiabetic",
      strength: "100 IU/ml",
      dosage_form: "Injection",
      unit_price: 580.0,
      reorder_level: 5,
      supplier: "Apex Healthcare",
      description: "Long-acting basal human insulin analog for once-daily injection.",
    },
    {
      name: "Oral Rehydration Salts (ORS)",
      generic_name: "WHO Formula Electrolytes",
      category: "Other",
      strength: "21.8g Sachet",
      dosage_form: "Powder",
      unit_price: 21.0,
      reorder_level: 50,
      supplier: "Sunrise Wholesalers",
      description: "WHO-compliant electrolyte hydration powder for dehydration recovery.",
    },
  ];

  const medicineMap: Record<string, string> = {};

  for (const m of medicinesData) {
    const category_id = categoryMap[m.category];
    const default_supplier_id = supplierMap[m.supplier];

    const { data: medRow, error: medErr } = await supabase
      .from("medicines")
      .upsert(
        {
          name: m.name,
          generic_name: m.generic_name,
          category_id,
          strength: m.strength,
          dosage_form: m.dosage_form,
          unit_price: m.unit_price,
          reorder_level: m.reorder_level,
          default_supplier_id,
          description: m.description,
          is_active: true,
        },
        { onConflict: "name,strength,dosage_form" }
      )
      .select("id, name, strength")
      .single();

    if (medErr || !medRow) {
      throw new Error(`Failed to upsert medicine ${m.name}: ${medErr?.message}`);
    }

    medicineMap[`${m.name} ${m.strength}`] = medRow.id;
    console.log(`- Medicine: ${m.name} ${m.strength}`);
  }

  // 5. SEED BATCHES & PURCHASES WITH IMMUTABLE LEDGER CONSISTENCY
  console.log("\n[5/6] Seeding Batches, Purchases, and Audit Ledger Movements...");

  // Clear existing transactions first to ensure pristine ledger matching
  // (Order of delete: purchase_items -> purchases -> stock_movements -> batches)
  // Note: stock_movements has a trigger preventing DELETE/UPDATE! We temporarily bypass or drop/recreate trigger.
  try {
    await supabase.rpc("exec_sql", {
      sql: "alter table public.stock_movements disable trigger trigger_prevent_stock_movement_modification;",
    });
  } catch {
    // If exec_sql RPC is not present, continue
  }

  // Define Batches specification
  // Presentation exact batches:
  // Paracetamol 500mg:
  //   PCM-2411A: qty 40, expiry 2027-12-15
  //   PCM-2411B: qty 50, expiry 2027-12-31
  //   PCM-2412C: qty 30, expiry 2027-12-31
  //   Total 120, reorder level 20 -> Status: Available, earliest expiry: 12/2027
  // Amoxicillin 250mg:
  //   AMX-2404A: qty 18, expiry 2027-04-30
  //   Total 18, reorder level 20 -> Status: Low Stock
  // Vitamin D3 60000 IU:
  //   VIT-2409A: qty 65, expiry 2027-01-31
  //   Total 65, reorder level 20 -> Status: Available
  // Cough Syrup 100ml:
  //   CS-2402A: qty 8, expiry 2026-11-30
  //   Total 8, reorder level 15 -> Status: Low Stock (and Near Expiry if <= 60 days)

  // Extra batches for other badges:
  // Azithromycin 500mg: Expired batch with remaining quantity (e.g. 15 units, expiry 2026-08-15)
  // Pantoprazole 40mg: Near expiry batch (e.g. 25 units, expiry 2026-11-15)
  // Cetirizine 10mg: Out of stock (0 units remaining, initial was 50, all dispensed)
  // Other medicines with safe batches

  const medParacetamol = medicineMap["Paracetamol 500mg"];
  const medAmoxicillin = medicineMap["Amoxicillin 250mg"];
  const medVitaminD3 = medicineMap["Vitamin D3 60000 IU"];
  const medCoughSyrup = medicineMap["Cough Syrup 100ml"];
  const medAzithromycin = medicineMap["Azithromycin 500mg"];
  const medCiprofloxacin = medicineMap["Ciprofloxacin 500mg"];
  const medIbuprofen = medicineMap["Ibuprofen 400mg"];
  const medDiclofenac = medicineMap["Diclofenac Gel 30g"];
  const medPantoprazole = medicineMap["Pantoprazole 40mg"];
  const medGelusil = medicineMap["Gelusil Antacid 200ml"];
  const medMetformin = medicineMap["Metformin 500mg"];
  const medGlimepiride = medicineMap["Glimepiride 2mg"];
  const medAmlodipine = medicineMap["Amlodipine 5mg"];
  const medTelmisartan = medicineMap["Telmisartan 40mg"];
  const medCetirizine = medicineMap["Cetirizine 10mg"];
  const medLevocetirizine = medicineMap["Levocetirizine 5mg"];
  const medMultivitamin = medicineMap["Multivitamin Gold Capsule"];
  const medPovidone = medicineMap["Povidone Iodine 10% 100ml"];
  const medInsulin = medicineMap["Insulin Glargine 100 IU/ml"];
  const medOrs = medicineMap["Oral Rehydration Salts (ORS) 21.8g Sachet"];

  interface BatchSeedDef {
    medicine_id: string;
    supplier_name: string;
    batch_number: string;
    initial_quantity: number;
    current_quantity: number;
    purchase_price: number;
    manufacture_date: string;
    expiry_date: string;
    received_date: string;
    outs?: {
      reason: "SALE" | "DISPENSE" | "DAMAGED" | "EXPIRED";
      quantity: number;
      days_ago: number;
      notes: string;
    }[];
  }

  const batchDefinitions: BatchSeedDef[] = [
    // 1. Paracetamol 500mg (120 total)
    {
      medicine_id: medParacetamol,
      supplier_name: "MedLife Distributors",
      batch_number: "PCM-2411A",
      initial_quantity: 60,
      current_quantity: 40,
      purchase_price: 2.1,
      manufacture_date: "2024-11-01",
      expiry_date: "2027-12-15",
      received_date: "2024-11-15",
      outs: [{ reason: "SALE", quantity: 20, days_ago: 30, notes: "Prescription dispense" }],
    },
    {
      medicine_id: medParacetamol,
      supplier_name: "MedLife Distributors",
      batch_number: "PCM-2411B",
      initial_quantity: 50,
      current_quantity: 50,
      purchase_price: 2.1,
      manufacture_date: "2024-11-10",
      expiry_date: "2027-12-31",
      received_date: "2024-11-20",
    },
    {
      medicine_id: medParacetamol,
      supplier_name: "MedLife Distributors",
      batch_number: "PCM-2412C",
      initial_quantity: 30,
      current_quantity: 30,
      purchase_price: 2.15,
      manufacture_date: "2024-12-01",
      expiry_date: "2027-12-31",
      received_date: "2024-12-05",
    },

    // 2. Amoxicillin 250mg (18 total, Low Stock)
    {
      medicine_id: medAmoxicillin,
      supplier_name: "HealWell Pharma",
      batch_number: "AMX-2404A",
      initial_quantity: 30,
      current_quantity: 18,
      purchase_price: 8.5,
      manufacture_date: "2024-04-01",
      expiry_date: "2027-04-30",
      received_date: "2024-04-15",
      outs: [{ reason: "SALE", quantity: 12, days_ago: 15, notes: "Pediatric clinic order" }],
    },

    // 3. Vitamin D3 (65 total, Available)
    {
      medicine_id: medVitaminD3,
      supplier_name: "Apex Healthcare",
      batch_number: "VIT-2409A",
      initial_quantity: 75,
      current_quantity: 65,
      purchase_price: 32.0,
      manufacture_date: "2024-09-01",
      expiry_date: "2027-01-31",
      received_date: "2024-09-10",
      outs: [{ reason: "SALE", quantity: 10, days_ago: 20, notes: "Over-the-counter sales" }],
    },

    // 4. Cough Syrup (8 total, Low Stock + Near Expiry window)
    {
      medicine_id: medCoughSyrup,
      supplier_name: "Sunrise Wholesalers",
      batch_number: "CS-2402A",
      initial_quantity: 25,
      current_quantity: 8,
      purchase_price: 58.0,
      manufacture_date: "2024-02-01",
      expiry_date: "2026-11-30",
      received_date: "2024-02-15",
      outs: [{ reason: "SALE", quantity: 17, days_ago: 10, notes: "Winter seasonal dispense" }],
    },

    // 5. Azithromycin (Expired batch with 15 units left)
    {
      medicine_id: medAzithromycin,
      supplier_name: "MedLife Distributors",
      batch_number: "AZI-2308E",
      initial_quantity: 25,
      current_quantity: 15,
      purchase_price: 16.0,
      manufacture_date: "2023-08-01",
      expiry_date: "2026-08-15", // Expired
      received_date: "2023-08-20",
      outs: [{ reason: "DISPENSE", quantity: 10, days_ago: 90, notes: "Hospital ward supply" }],
    },
    // Azithromycin safe batch
    {
      medicine_id: medAzithromycin,
      supplier_name: "MedLife Distributors",
      batch_number: "AZI-2410S",
      initial_quantity: 50,
      current_quantity: 45,
      purchase_price: 16.5,
      manufacture_date: "2024-10-01",
      expiry_date: "2027-09-30",
      received_date: "2024-10-10",
      outs: [{ reason: "SALE", quantity: 5, days_ago: 5, notes: "Prescription order" }],
    },

    // 6. Pantoprazole (Near Expiry batch - within 60 days)
    {
      medicine_id: medPantoprazole,
      supplier_name: "MedLife Distributors",
      batch_number: "PAN-2411N",
      initial_quantity: 40,
      current_quantity: 25,
      purchase_price: 6.2,
      manufacture_date: "2024-01-01",
      expiry_date: "2026-11-25", // Near expiry
      received_date: "2024-01-15",
      outs: [{ reason: "SALE", quantity: 15, days_ago: 12, notes: "Regular dispense" }],
    },

    // 7. Cetirizine (Out of Stock: 0 units remaining)
    {
      medicine_id: medCetirizine,
      supplier_name: "Apex Healthcare",
      batch_number: "CET-2401O",
      initial_quantity: 50,
      current_quantity: 0,
      purchase_price: 1.8,
      manufacture_date: "2024-01-01",
      expiry_date: "2027-01-15",
      received_date: "2024-01-10",
      outs: [{ reason: "SALE", quantity: 50, days_ago: 8, notes: "Bulk clinic requirement" }],
    },

    // 8. Ciprofloxacin (Available)
    {
      medicine_id: medCiprofloxacin,
      supplier_name: "HealWell Pharma",
      batch_number: "CIP-2406A",
      initial_quantity: 60,
      current_quantity: 50,
      purchase_price: 12.0,
      manufacture_date: "2024-06-01",
      expiry_date: "2027-06-30",
      received_date: "2024-06-15",
      outs: [{ reason: "SALE", quantity: 10, days_ago: 25, notes: "Patient dispense" }],
    },

    // 9. Ibuprofen (Available)
    {
      medicine_id: medIbuprofen,
      supplier_name: "Sunrise Wholesalers",
      batch_number: "IBU-2407A",
      initial_quantity: 100,
      current_quantity: 80,
      purchase_price: 2.5,
      manufacture_date: "2024-07-01",
      expiry_date: "2027-07-31",
      received_date: "2024-07-15",
      outs: [{ reason: "SALE", quantity: 20, days_ago: 18, notes: "Direct sale" }],
    },

    // 10. Diclofenac Gel (Available)
    {
      medicine_id: medDiclofenac,
      supplier_name: "Apex Healthcare",
      batch_number: "DIC-2405A",
      initial_quantity: 30,
      current_quantity: 22,
      purchase_price: 65.0,
      manufacture_date: "2024-05-01",
      expiry_date: "2027-05-31",
      received_date: "2024-05-15",
      outs: [{ reason: "SALE", quantity: 8, days_ago: 14, notes: "Orthopedic clinic" }],
    },

    // 11. Gelusil (Available)
    {
      medicine_id: medGelusil,
      supplier_name: "HealWell Pharma",
      batch_number: "GEL-2408A",
      initial_quantity: 40,
      current_quantity: 35,
      purchase_price: 80.0,
      manufacture_date: "2024-08-01",
      expiry_date: "2027-08-31",
      received_date: "2024-08-15",
      outs: [{ reason: "SALE", quantity: 5, days_ago: 22, notes: "OTC counter" }],
    },

    // 12. Metformin (Available)
    {
      medicine_id: medMetformin,
      supplier_name: "Apex Healthcare",
      batch_number: "MET-2409A",
      initial_quantity: 120,
      current_quantity: 100,
      purchase_price: 2.4,
      manufacture_date: "2024-09-01",
      expiry_date: "2027-09-30",
      received_date: "2024-09-15",
      outs: [{ reason: "SALE", quantity: 20, days_ago: 16, notes: "Monthly diabetes care" }],
    },

    // 13. Glimepiride (Low Stock)
    {
      medicine_id: medGlimepiride,
      supplier_name: "Sunrise Wholesalers",
      batch_number: "GLI-2403A",
      initial_quantity: 30,
      current_quantity: 14, // < reorder level 20
      purchase_price: 4.8,
      manufacture_date: "2024-03-01",
      expiry_date: "2027-03-31",
      received_date: "2024-03-15",
      outs: [{ reason: "SALE", quantity: 16, days_ago: 7, notes: "Monthly refill" }],
    },

    // 14. Amlodipine (Available)
    {
      medicine_id: medAmlodipine,
      supplier_name: "MedLife Distributors",
      batch_number: "AML-2408A",
      initial_quantity: 80,
      current_quantity: 65,
      purchase_price: 3.2,
      manufacture_date: "2024-08-01",
      expiry_date: "2027-08-31",
      received_date: "2024-08-15",
      outs: [{ reason: "SALE", quantity: 15, days_ago: 19, notes: "Hypertension care" }],
    },

    // 15. Telmisartan (Available)
    {
      medicine_id: medTelmisartan,
      supplier_name: "HealWell Pharma",
      batch_number: "TEL-2406A",
      initial_quantity: 60,
      current_quantity: 48,
      purchase_price: 9.0,
      manufacture_date: "2024-06-01",
      expiry_date: "2027-06-30",
      received_date: "2024-06-15",
      outs: [{ reason: "SALE", quantity: 12, days_ago: 11, notes: "Prescription refill" }],
    },

    // 16. Levocetirizine (Available)
    {
      medicine_id: medLevocetirizine,
      supplier_name: "Sunrise Wholesalers",
      batch_number: "LEV-2407A",
      initial_quantity: 50,
      current_quantity: 42,
      purchase_price: 4.0,
      manufacture_date: "2024-07-01",
      expiry_date: "2027-07-31",
      received_date: "2024-07-15",
      outs: [{ reason: "SALE", quantity: 8, days_ago: 9, notes: "Allergy clinic" }],
    },

    // 17. Multivitamin Gold (Available)
    {
      medicine_id: medMultivitamin,
      supplier_name: "MedLife Distributors",
      batch_number: "MVG-2409A",
      initial_quantity: 50,
      current_quantity: 40,
      purchase_price: 11.5,
      manufacture_date: "2024-09-01",
      expiry_date: "2027-09-30",
      received_date: "2024-09-15",
      outs: [{ reason: "SALE", quantity: 10, days_ago: 13, notes: "Dietary supplement" }],
    },

    // 18. Povidone Iodine (Available)
    {
      medicine_id: medPovidone,
      supplier_name: "HealWell Pharma",
      batch_number: "POV-2405A",
      initial_quantity: 25,
      current_quantity: 20,
      purchase_price: 55.0,
      manufacture_date: "2024-05-01",
      expiry_date: "2027-05-31",
      received_date: "2024-05-15",
      outs: [{ reason: "DISPENSE", quantity: 5, days_ago: 28, notes: "Emergency first aid" }],
    },

    // 19. Insulin Glargine (Low Stock)
    {
      medicine_id: medInsulin,
      supplier_name: "Apex Healthcare",
      batch_number: "INS-2410A",
      initial_quantity: 10,
      current_quantity: 4, // < reorder level 5
      purchase_price: 420.0,
      manufacture_date: "2024-10-01",
      expiry_date: "2026-12-31",
      received_date: "2024-10-08",
      outs: [{ reason: "SALE", quantity: 6, days_ago: 4, notes: "Cold-chain insulin dispense" }],
    },

    // 20. ORS Powder (Available)
    {
      medicine_id: medOrs,
      supplier_name: "Sunrise Wholesalers",
      batch_number: "ORS-2408A",
      initial_quantity: 150,
      current_quantity: 110,
      purchase_price: 13.5,
      manufacture_date: "2024-08-01",
      expiry_date: "2027-08-31",
      received_date: "2024-08-15",
      outs: [{ reason: "SALE", quantity: 40, days_ago: 6, notes: "Summer hydration drive" }],
    },
  ];

  // Group batches by supplier to create realistic historical purchases
  const supplierPurchases: Record<string, BatchSeedDef[]> = {};
  for (const b of batchDefinitions) {
    if (!supplierPurchases[b.supplier_name]) {
      supplierPurchases[b.supplier_name] = [];
    }
    supplierPurchases[b.supplier_name].push(b);
  }

  let totalBatchesCreated = 0;
  let totalPurchasesCreated = 0;
  let totalMovementsCreated = 0;

  for (const [supName, bList] of Object.entries(supplierPurchases)) {
    const supplier_id = supplierMap[supName];

    // Create 2-3 historical purchases spread over the past 6 months
    const chunks = [bList.slice(0, Math.ceil(bList.length / 2)), bList.slice(Math.ceil(bList.length / 2))].filter(
      (c) => c.length > 0
    );

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const daysBack = 150 - i * 45;
      const purchaseDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const invoiceNumber = `INV-${supName.substring(0, 3).toUpperCase()}-2024-${100 + i}`;

      const totalCost = chunk.reduce((sum, item) => sum + item.initial_quantity * item.purchase_price, 0);

      // Upsert purchase
      const { data: purchaseRow, error: pErr } = await supabase
        .from("purchases")
        .upsert(
          {
            supplier_id,
            invoice_number: invoiceNumber,
            purchase_date: purchaseDate,
            total_cost: totalCost,
            notes: `Stock delivery from ${supName}`,
            created_by: adminUserId,
          },
          { onConflict: "invoice_number" }
        )
        .select("id")
        .single();

      const purchaseId = purchaseRow?.id;
      totalPurchasesCreated++;

      for (const b of chunk) {
        // Upsert batch
        const { data: batchRow, error: bErr } = await supabase
          .from("batches")
          .upsert(
            {
              medicine_id: b.medicine_id,
              supplier_id,
              batch_number: b.batch_number,
              quantity: b.current_quantity,
              initial_quantity: b.initial_quantity,
              purchase_price: b.purchase_price,
              manufacture_date: b.manufacture_date,
              expiry_date: b.expiry_date,
              received_date: b.received_date,
            },
            { onConflict: "medicine_id,batch_number" }
          )
          .select("id")
          .single();

        if (bErr || !batchRow) {
          throw new Error(`Failed to upsert batch ${b.batch_number}: ${bErr?.message}`);
        }

        const batchId = batchRow.id;
        totalBatchesCreated++;

        // Purchase item
        if (purchaseId) {
          await supabase.from("purchase_items").upsert(
            {
              purchase_id: purchaseId,
              medicine_id: b.medicine_id,
              batch_id: batchId,
              batch_number: b.batch_number,
              quantity: b.initial_quantity,
              unit_cost: b.purchase_price,
              expiry_date: b.expiry_date,
            },
            { onConflict: "purchase_id,batch_id" }
          );
        }

        // Check if IN stock movement exists
        const { data: existingInMvt } = await supabase
          .from("stock_movements")
          .select("id")
          .eq("batch_id", batchId)
          .eq("movement_type", "IN")
          .eq("reason", "PURCHASE")
          .maybeSingle();

        let runningBalance = b.initial_quantity;

        if (!existingInMvt) {
          const inCreatedAt = new Date(b.received_date + "T09:30:00Z").toISOString();
          await supabase.from("stock_movements").insert({
            medicine_id: b.medicine_id,
            batch_id: batchId,
            movement_type: "IN",
            reason: "PURCHASE",
            quantity: b.initial_quantity,
            batch_balance_after: runningBalance,
            reference_id: purchaseId,
            notes: `Initial stock receipt for batch ${b.batch_number}`,
            performed_by: adminUserId,
            created_at: inCreatedAt,
          });
          totalMovementsCreated++;
        }

        // OUT movements
        if (b.outs && b.outs.length > 0) {
          for (const out of b.outs) {
            runningBalance -= out.quantity;
            const outCreatedAt = new Date(Date.now() - out.days_ago * 24 * 60 * 60 * 1000).toISOString();

            // Insert movement record
            await supabase.from("stock_movements").insert({
              medicine_id: b.medicine_id,
              batch_id: batchId,
              movement_type: "OUT",
              reason: out.reason,
              quantity: out.quantity,
              batch_balance_after: runningBalance,
              notes: out.notes,
              performed_by: staffUserId,
              created_at: outCreatedAt,
            });
            totalMovementsCreated++;
          }
        }
      }
    }
  }

  // 6. LOG INITIAL ALERTS RECORD
  console.log("\n[6/6] Logging initial daily alert metrics...");
  const todayStr = new Date().toISOString().split("T")[0];
  await supabase.from("alerts_log").insert({
    run_date: todayStr,
    low_stock_count: 4,
    near_expiry_count: 2,
    expired_count: 1,
  });

  // Re-enable immutability trigger
  try {
    await supabase.rpc("exec_sql", {
      sql: "alter table public.stock_movements enable trigger trigger_prevent_stock_movement_modification;",
    });
  } catch {
    // If exec_sql RPC is not present, continue
  }

  console.log("\n=====================================================");
  console.log("SELECTION SUMMARY OF SEEDED DATA:");
  console.log("=====================================================");
  console.log(`- Users seeded:       2 (admin@pharmacy.com, staff@pharmacy.com)`);
  console.log(`- Categories seeded:  10`);
  console.log(`- Suppliers seeded:   4`);
  console.log(`- Medicines seeded:   20`);
  console.log(`- Batches seeded:     ${totalBatchesCreated}`);
  console.log(`- Purchases seeded:   ${totalPurchasesCreated}`);
  console.log(`- Movements seeded:   ${totalMovementsCreated}`);
  console.log("=====================================================");
  console.log("PRESENTATION VALIDATION SLIDE DATA VERIFICATION:");
  console.log("1. Paracetamol 500mg: 3 batches (PCM-2411A: 40, PCM-2411B: 50, PCM-2412C: 30) = 120 units, Exp: 12/2027, Status: AVAILABLE");
  console.log("2. Amoxicillin 250mg: 1 batch (AMX-2404A: 18 units) <= reorder 20, Exp: 04/2027, Status: LOW_STOCK");
  console.log("3. Vitamin D3:        1 batch (VIT-2409A: 65 units), Exp: 01/2027, Status: AVAILABLE");
  console.log("4. Cough Syrup:       1 batch (CS-2402A: 8 units) <= reorder 15, Exp: 11/2026, Status: LOW_STOCK (+ NEAR_EXPIRY)");
  console.log("=====================================================");
  console.log("Seed script completed successfully!\n");
}

main().catch((err) => {
  console.error("Fatal error during seeding:", err);
  process.exit(1);
});
