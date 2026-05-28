import { describe, expect, it } from "vitest";
import {
  normalizeType,
  isMislabelledFeeRow,
  mapTransactionRow,
  getTransactionDescription,
  formatPesoAmount,
  formatTransactionDate,
} from "../walletTransaction";

// ─── normalizeType ────────────────────────────────────────────────────────────

describe("normalizeType", () => {
  it.each([
    ["credited", "Credited"],
    ["credit", "Credited"],
    ["topup", "Credited"],
    ["top_up", "Credited"],
    ["cash_in", "Credited"],
    ["cashin", "Credited"],
    ["CREDITED", "Credited"],
    ["TopUp", "Credited"],
  ])("maps credit alias %s → Credited", (input, expected) => {
    expect(normalizeType(input)).toBe(expected);
  });

  it.each([
    ["debited", "Debited"],
    ["debit", "Debited"],
    ["spent", "Debited"],
    ["cash_out", "Debited"],
    ["cashout", "Debited"],
    ["balance_transfer", "Debited"],
    ["appointment_charge", "Debited"],
    ["appointment_payment", "Debited"],
    ["deduction", "Debited"],
    ["withdrawal", "Debited"],
    ["DEBITED", "Debited"],
  ])("maps debit alias %s → Debited", (input, expected) => {
    expect(normalizeType(input)).toBe(expected);
  });

  it("returns Unknown for unrecognised raw value", () => {
    expect(normalizeType("foobar")).toBe("Unknown");
  });

  it("returns Unknown for null/undefined", () => {
    expect(normalizeType(null)).toBe("Unknown");
    expect(normalizeType(undefined)).toBe("Unknown");
  });
});

// ─── isMislabelledFeeRow ─────────────────────────────────────────────────────

describe("isMislabelledFeeRow", () => {
  const baseRaw = { notes: "Doctors Fee", appointment_id: 42 };

  it("flags a credited doctor-fee row as mislabelled", () => {
    expect(isMislabelledFeeRow("Credited", 42, { notes: "Doctors Fee" })).toBe(true);
  });

  it("flags a credited clinic-fee row as mislabelled", () => {
    expect(isMislabelledFeeRow("Credited", 10, { description: "Clinic Fee" })).toBe(true);
  });

  it("flags a credited pipe-fee row as mislabelled", () => {
    expect(isMislabelledFeeRow("Credited", 1, { reason: "Pipe Fee" })).toBe(true);
  });

  it("does NOT flag a debited row (already correct)", () => {
    expect(isMislabelledFeeRow("Debited", 42, baseRaw)).toBe(false);
  });

  it("does NOT flag when appointment_id is 0", () => {
    expect(isMislabelledFeeRow("Credited", 0, baseRaw)).toBe(false);
  });

  it("does NOT flag when text lacks 'fee'", () => {
    expect(isMislabelledFeeRow("Credited", 5, { notes: "Top-up" })).toBe(false);
  });

  it("does NOT flag when text has 'fee' but no principal keyword", () => {
    expect(
      isMislabelledFeeRow("Credited", 5, { notes: "service fee" })
    ).toBe(false);
  });

  it("uses invoice_description as a text source", () => {
    expect(
      isMislabelledFeeRow("Credited", 7, { invoice_description: "Doctor fee billed" })
    ).toBe(true);
  });
});

// ─── mapTransactionRow ────────────────────────────────────────────────────────

describe("mapTransactionRow", () => {
  it("maps all canonical fields from a well-formed raw row", () => {
    const raw = {
      id: 99,
      patient_id: 5,
      appointment_id: "12",
      patient_code: "PT-001",
      owner_id: 3,
      owner_type: "user",
      amount: "250.00",
      transaction_type: "credited",
      created_at: "2026-04-14T10:00:00Z",
      notes: "Wallet top-up",
      payment_transaction_id: "PAY-ABC",
    };

    const tx = mapTransactionRow(raw);

    expect(tx.id).toBe(99);
    expect(tx.patientId).toBe(5);
    expect(tx.appointmentId).toBe(12);
    expect(tx.patientCode).toBe("PT-001");
    expect(tx.ownerId).toBe(3);
    expect(tx.ownerType).toBe("user");
    expect(tx.amount).toBe(250);
    expect(tx.type).toBe("Credited");
    expect(tx.notes).toBe("Wallet top-up");
    expect(tx.paymentTransactionId).toBe("PAY-ABC");
  });

  it("falls back notes to description when notes is absent", () => {
    const tx = mapTransactionRow({ description: "via desc", transaction_type: "credit" });
    expect(tx.notes).toBe("via desc");
  });

  it("falls back paymentTransactionId to transaction_id then reference", () => {
    const txA = mapTransactionRow({ transaction_id: "TXN-1", transaction_type: "debit" });
    expect(txA.paymentTransactionId).toBe("TXN-1");

    const txB = mapTransactionRow({ reference: "REF-1", transaction_type: "debit" });
    expect(txB.paymentTransactionId).toBe("REF-1");
  });

  it("applies fee-row override: credited doctor-fee with appointment becomes Debited", () => {
    const raw = {
      id: 10,
      appointment_id: 5,
      amount: "100",
      transaction_type: "credited",
      notes: "Doctors Fee",
    };
    const tx = mapTransactionRow(raw);
    expect(tx.type).toBe("Debited");
  });

  it("does not override a genuine top-up credit (no appointment, no fee text)", () => {
    const raw = {
      id: 11,
      appointment_id: 0,
      amount: "500",
      transaction_type: "topup",
      notes: "Wallet top-up via payment",
    };
    const tx = mapTransactionRow(raw);
    expect(tx.type).toBe("Credited");
  });

  it("returns null for non-object input", () => {
    expect(mapTransactionRow(null)).toBeNull();
    expect(mapTransactionRow(undefined)).toBeNull();
  });
});

// ─── getTransactionDescription ────────────────────────────────────────────────

describe("getTransactionDescription", () => {
  it("prefers notes when present", () => {
    const desc = getTransactionDescription({
      notes: "Custom note",
      type: "Credited",
      appointmentId: 0,
    });
    expect(desc).toBe("Custom note");
  });

  it("falls back to credited text when no notes and Credited", () => {
    const desc = getTransactionDescription({
      notes: null,
      type: "Credited",
      appointmentId: 0,
    });
    expect(desc).toBe("Amount credited to your wallet");
  });

  it("uses appointment-linked text when Debited + appointment_id > 0", () => {
    const desc = getTransactionDescription({
      notes: null,
      type: "Debited",
      appointmentId: 7,
    });
    expect(desc).toBe("Appointment payment debited from your wallet");
  });

  it("falls back to generic debit text when no appointment", () => {
    const desc = getTransactionDescription({
      notes: null,
      type: "Debited",
      appointmentId: 0,
    });
    expect(desc).toBe("Amount debited from your wallet");
  });
});

// ─── formatPesoAmount ─────────────────────────────────────────────────────────

describe("formatPesoAmount", () => {
  it("formats with 2 decimal places and ₱ symbol", () => {
    expect(formatPesoAmount(1234.5)).toBe("₱ 1,234.50");
  });

  it("formats zero correctly", () => {
    expect(formatPesoAmount(0)).toBe("₱ 0.00");
  });

  it("handles string amounts", () => {
    expect(formatPesoAmount("250.00")).toBe("₱ 250.00");
  });

  it("returns ₱ 0.00 for null/undefined", () => {
    expect(formatPesoAmount(null)).toBe("₱ 0.00");
    expect(formatPesoAmount(undefined)).toBe("₱ 0.00");
  });
});

// ─── formatTransactionDate ────────────────────────────────────────────────────

describe("formatTransactionDate", () => {
  it("returns -- for null", () => {
    expect(formatTransactionDate(null)).toBe("--");
  });

  it("returns -- for undefined", () => {
    expect(formatTransactionDate(undefined)).toBe("--");
  });

  it("returns -- for invalid date string", () => {
    expect(formatTransactionDate("not-a-date")).toBe("--");
  });

  it("formats a UTC ISO string into the expected pattern", () => {
    // Use a fixed UTC date so locale hour arithmetic is predictable
    const result = formatTransactionDate("2026-04-14T00:00:00Z");
    // Should match dd MMM yy hh:mm am/pm pattern
    expect(result).toMatch(/^\d{2} [A-Z][a-z]{2} \d{2} \d{2}:\d{2} (am|pm)$/);
  });
});
