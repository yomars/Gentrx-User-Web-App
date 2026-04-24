/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";
import {
  getDoctorIdentifier,
  getPatientIdentifier,
  getLegacyFallbackHits,
  resetLegacyFallbackHits,
  uniquePatients,
} from "../appointmentIdentity";

describe("appointment identity compatibility", () => {
  beforeEach(() => {
    resetLegacyFallbackHits();
  });

  it("uses doctor_id as default appointment path", () => {
    const value = getDoctorIdentifier(
      { doctor_id: 44, doct_id: 9001 },
      "test:doctor-path"
    );

    expect(value).toBe(44);
    expect(getLegacyFallbackHits()).toBe(0);
  });

  it("uses patient_code for patient retrieval with patient_id fallback", () => {
    const canonicalValue = getPatientIdentifier(
      { patient_code: "PT-00055", patient_id: 55 },
      "test:patient-retrieval"
    );
    expect(canonicalValue).toBe("PT-00055");
    expect(getLegacyFallbackHits()).toBe(0);

    const legacyValue = getPatientIdentifier(
      { patient_id: 55 },
      "test:patient-fallback"
    );
    expect(legacyValue).toBe(55);
    expect(getLegacyFallbackHits()).toBe(1);
  });

  it("tracks fallback usage for legacy doctor rows", () => {
    const value = getDoctorIdentifier(
      { doct_id: 501 },
      "test:legacy-doctor-row"
    );

    expect(value).toBe(501);
    expect(getLegacyFallbackHits()).toBe(1);
  });

  it("deduplicates patients by canonical identity", () => {
    const unique = uniquePatients([
      { id: 1, patient_code: "PT-101", f_name: "Ana" },
      { id: 2, patient_code: "PT-101", f_name: "Ana Duplicate" },
      { id: 3, patient_code: "PT-102", f_name: "Ben" },
    ]);

    expect(unique).toHaveLength(2);
    expect(unique[0].patient_code).toBe("PT-101");
    expect(unique[1].patient_code).toBe("PT-102");
  });
});
