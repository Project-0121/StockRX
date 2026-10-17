import { differenceInCalendarDays, parseISO } from "date-fns";
import { ExpiryStatus, StockStatus } from "@/types/database";

/**
 * Classifies a batch's expiry status relative to today and near-expiry threshold days.
 * Pure function: compares dates without timezone shifts.
 */
export function classifyExpiry(
  expiryDateStr: string,
  todayStr: string,
  nearDays = 60
): ExpiryStatus {
  const expiryDate = parseISO(expiryDateStr);
  const today = parseISO(todayStr);

  const daysToExpiry = differenceInCalendarDays(expiryDate, today);

  if (daysToExpiry < 0) {
    return "EXPIRED";
  }

  if (daysToExpiry <= nearDays) {
    return "NEAR_EXPIRY";
  }

  return "SAFE";
}

/**
 * Calculates stock status using the exact priority rules defined in section 4:
 * 1. 'OUT_OF_STOCK' if totalQuantityAll = 0
 * 2. 'EXPIRED' if sellableQuantity = 0 and expiredQuantity > 0
 * 3. 'LOW_STOCK' if sellableQuantity <= reorderLevel
 * 4. 'NEAR_EXPIRY' if hasNearExpiry is true
 * 5. otherwise 'AVAILABLE'
 */
export function medicineStatus({
  totalQuantityAll,
  sellableQuantity,
  expiredQuantity,
  reorderLevel,
  hasNearExpiry,
}: {
  totalQuantityAll: number;
  sellableQuantity: number;
  expiredQuantity: number;
  reorderLevel: number;
  hasNearExpiry: boolean;
}): StockStatus {
  if (totalQuantityAll <= 0) {
    return "OUT_OF_STOCK";
  }

  if (sellableQuantity <= 0 && expiredQuantity > 0) {
    return "EXPIRED";
  }

  if (sellableQuantity <= reorderLevel) {
    return "LOW_STOCK";
  }

  if (hasNearExpiry) {
    return "NEAR_EXPIRY";
  }

  return "AVAILABLE";
}

export interface FefoBatchInput {
  id: string;
  batch_number: string;
  quantity: number;
  expiry_date: string;
  received_date?: string;
  created_at?: string;
}

export interface FefoAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  taken: number;
  remainingInBatch: number;
}

export type FefoResult =
  | {
      success: true;
      allocations: FefoAllocation[];
      totalDispensed: number;
    }
  | {
      success: false;
      error: string;
    };

/**
 * Allocates stock from batches following FEFO (First Expire, First Out).
 * - Ignores expired batches (expiry_date < today)
 * - Ignores empty batches (quantity <= 0)
 * - Sorts by: expiry_date ASC, received_date ASC, created_at ASC, id ASC
 * - Fails if total sellable stock < requested quantity (does not touch any batch)
 */
export function allocateFefo(
  batches: FefoBatchInput[],
  requestedQuantity: number,
  todayStr: string
): FefoResult {
  if (requestedQuantity <= 0) {
    return {
      success: false,
      error: "Requested quantity must be greater than 0.",
    };
  }

  // Filter only sellable (non-expired, quantity > 0) batches
  const candidateBatches = batches
    .filter((b) => b.quantity > 0 && b.expiry_date >= todayStr)
    .sort((a, b) => {
      // 1. Expiry date ASC
      if (a.expiry_date !== b.expiry_date) {
        return a.expiry_date.localeCompare(b.expiry_date);
      }
      // 2. Received date ASC
      const recA = a.received_date || "";
      const recB = b.received_date || "";
      if (recA !== recB) {
        return recA.localeCompare(recB);
      }
      // 3. Created at ASC
      const creA = a.created_at || "";
      const creB = b.created_at || "";
      if (creA !== creB) {
        return creA.localeCompare(creB);
      }
      // 4. ID ASC
      return a.id.localeCompare(b.id);
    });

  const totalAvailable = candidateBatches.reduce((sum, b) => sum + b.quantity, 0);

  if (totalAvailable < requestedQuantity) {
    return {
      success: false,
      error: `INSUFFICIENT_STOCK: Only ${totalAvailable} units are available (requested ${requestedQuantity}).`,
    };
  }

  let remainingToDispense = requestedQuantity;
  const allocations: FefoAllocation[] = [];

  for (const batch of candidateBatches) {
    if (remainingToDispense <= 0) break;

    const take = Math.min(batch.quantity, remainingToDispense);
    allocations.push({
      batchId: batch.id,
      batchNumber: batch.batch_number,
      expiryDate: batch.expiry_date,
      taken: take,
      remainingInBatch: batch.quantity - take,
    });

    remainingToDispense -= take;
  }

  return {
    success: true,
    allocations,
    totalDispensed: requestedQuantity,
  };
}
