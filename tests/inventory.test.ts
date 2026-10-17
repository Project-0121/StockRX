import { describe, it, expect } from "vitest";
import {
  classifyExpiry,
  medicineStatus,
  allocateFefo,
  FefoBatchInput,
} from "@/lib/inventory";

describe("Inventory Domain Logic", () => {
  describe("classifyExpiry", () => {
    const today = "2026-10-18";

    it("identifies yesterday as EXPIRED", () => {
      expect(classifyExpiry("2026-10-17", today, 60)).toBe("EXPIRED");
    });

    it("identifies past date as EXPIRED", () => {
      expect(classifyExpiry("2025-01-01", today, 60)).toBe("EXPIRED");
    });

    it("identifies today as NEAR_EXPIRY (0 days <= nearDays)", () => {
      expect(classifyExpiry("2026-10-18", today, 60)).toBe("NEAR_EXPIRY");
    });

    it("identifies exact nearDays threshold (60 days) as NEAR_EXPIRY", () => {
      // 2026-10-18 + 60 days = 2026-12-17
      expect(classifyExpiry("2026-12-17", today, 60)).toBe("NEAR_EXPIRY");
    });

    it("identifies nearDays + 1 day (61 days) as SAFE", () => {
      // 2026-10-18 + 61 days = 2026-12-18
      expect(classifyExpiry("2026-12-18", today, 60)).toBe("SAFE");
    });

    it("identifies far future as SAFE", () => {
      expect(classifyExpiry("2028-12-31", today, 60)).toBe("SAFE");
    });
  });

  describe("medicineStatus (Priority Rules)", () => {
    it("Priority 1: returns OUT_OF_STOCK when totalQuantityAll is 0", () => {
      const status = medicineStatus({
        totalQuantityAll: 0,
        sellableQuantity: 0,
        expiredQuantity: 0,
        reorderLevel: 20,
        hasNearExpiry: false,
      });
      expect(status).toBe("OUT_OF_STOCK");
    });

    it("Priority 2: returns EXPIRED when sellable is 0 but expiredQuantity > 0", () => {
      const status = medicineStatus({
        totalQuantityAll: 15,
        sellableQuantity: 0,
        expiredQuantity: 15,
        reorderLevel: 20,
        hasNearExpiry: false,
      });
      expect(status).toBe("EXPIRED");
    });

    it("Priority 3: returns LOW_STOCK when sellableQuantity <= reorderLevel", () => {
      const status = medicineStatus({
        totalQuantityAll: 18,
        sellableQuantity: 18,
        expiredQuantity: 0,
        reorderLevel: 20,
        hasNearExpiry: false,
      });
      expect(status).toBe("LOW_STOCK");
    });

    it("Priority 3 beats Priority 4: returns LOW_STOCK even if near expiry is also true", () => {
      const status = medicineStatus({
        totalQuantityAll: 8,
        sellableQuantity: 8,
        expiredQuantity: 0,
        reorderLevel: 15,
        hasNearExpiry: true,
      });
      expect(status).toBe("LOW_STOCK");
    });

    it("Priority 4: returns NEAR_EXPIRY when sellable > reorderLevel and hasNearExpiry is true", () => {
      const status = medicineStatus({
        totalQuantityAll: 50,
        sellableQuantity: 50,
        expiredQuantity: 0,
        reorderLevel: 20,
        hasNearExpiry: true,
      });
      expect(status).toBe("NEAR_EXPIRY");
    });

    it("Priority 5: returns AVAILABLE when stock is healthy and safe", () => {
      const status = medicineStatus({
        totalQuantityAll: 120,
        sellableQuantity: 120,
        expiredQuantity: 0,
        reorderLevel: 20,
        hasNearExpiry: false,
      });
      expect(status).toBe("AVAILABLE");
    });
  });

  describe("allocateFefo (First Expire, First Out)", () => {
    const today = "2026-10-18";

    const sampleBatches: FefoBatchInput[] = [
      {
        id: "b-exp",
        batch_number: "PCM-EXP",
        quantity: 50,
        expiry_date: "2026-09-01", // Expired
        received_date: "2024-01-01",
      },
      {
        id: "b-zero",
        batch_number: "PCM-ZERO",
        quantity: 0, // Empty
        expiry_date: "2027-05-01",
        received_date: "2024-05-01",
      },
      {
        id: "b-1",
        batch_number: "PCM-2411A",
        quantity: 40,
        expiry_date: "2027-12-15",
        received_date: "2024-11-15",
        created_at: "2024-11-15T10:00:00Z",
      },
      {
        id: "b-2",
        batch_number: "PCM-2411B",
        quantity: 50,
        expiry_date: "2027-12-31",
        received_date: "2024-11-20",
        created_at: "2024-11-20T10:00:00Z",
      },
      {
        id: "b-3",
        batch_number: "PCM-2412C",
        quantity: 30,
        expiry_date: "2027-12-31",
        received_date: "2024-12-05",
        created_at: "2024-12-05T10:00:00Z",
      },
    ];

    it("allocates exactly 70 units across batches in FEFO order (40 from PCM-2411A, 30 from PCM-2411B)", () => {
      const result = allocateFefo(sampleBatches, 70, today);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.totalDispensed).toBe(70);
        expect(result.allocations).toHaveLength(2);

        // First allocation: 40 units from earliest expiry PCM-2411A (exp 2027-12-15)
        expect(result.allocations[0].batchNumber).toBe("PCM-2411A");
        expect(result.allocations[0].taken).toBe(40);
        expect(result.allocations[0].remainingInBatch).toBe(0);

        // Second allocation: 30 units from PCM-2411B (exp 2027-12-31)
        expect(result.allocations[1].batchNumber).toBe("PCM-2411B");
        expect(result.allocations[1].taken).toBe(30);
        expect(result.allocations[1].remainingInBatch).toBe(20);
      }
    });

    it("handles exact-quantity dispense from a single batch", () => {
      const result = allocateFefo(sampleBatches, 40, today);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.allocations).toHaveLength(1);
        expect(result.allocations[0].batchNumber).toBe("PCM-2411A");
        expect(result.allocations[0].taken).toBe(40);
        expect(result.allocations[0].remainingInBatch).toBe(0);
      }
    });

    it("spills over across all 3 available batches when dispensing 100 units", () => {
      const result = allocateFefo(sampleBatches, 100, today);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.allocations).toHaveLength(3);
        expect(result.allocations[0].taken).toBe(40); // 40 from b-1
        expect(result.allocations[1].taken).toBe(50); // 50 from b-2
        expect(result.allocations[2].taken).toBe(10); // 10 from b-3
        expect(result.allocations[2].remainingInBatch).toBe(20);
      }
    });

    it("never selects expired or 0-quantity batches", () => {
      const result = allocateFefo(sampleBatches, 120, today);
      expect(result.success).toBe(true);
      if (result.success) {
        const batchNumbers = result.allocations.map((a) => a.batchNumber);
        expect(batchNumbers).not.toContain("PCM-EXP");
        expect(batchNumbers).not.toContain("PCM-ZERO");
      }
    });

    it("fails with INSUFFICIENT_STOCK if requested quantity exceeds total sellable units (e.g. 130)", () => {
      const result = allocateFefo(sampleBatches, 130, today);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("INSUFFICIENT_STOCK");
        expect(result.error).toContain("Only 120 units are available");
      }
    });

    it("breaks tie between identical expiry dates by received_date ASC", () => {
      const tieBatches: FefoBatchInput[] = [
        {
          id: "t-later-received",
          batch_number: "TIE-2",
          quantity: 20,
          expiry_date: "2027-12-31",
          received_date: "2025-02-01",
        },
        {
          id: "t-early-received",
          batch_number: "TIE-1",
          quantity: 20,
          expiry_date: "2027-12-31",
          received_date: "2025-01-01",
        },
      ];

      const result = allocateFefo(tieBatches, 15, today);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.allocations[0].batchNumber).toBe("TIE-1");
      }
    });
  });
});
