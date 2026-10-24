/**
 * Admission Service
 *
 * CRUD operations for patient admissions, beds, and discharge.
 * All data is persisted in MySQL via the PHP API.
 */

import { get, post } from '../lib/apiClient';
import type { AdmissionHistory, BedRecord } from '../types';

export const admissionService = {
  // ── Admissions ───────────────────────────────────────────────────────────────

  /** Get admission history for a patient */
  async getByPatient(patientId: number): Promise<AdmissionHistory[]> {
    return get<AdmissionHistory[]>('/admissions/list.php', { patient_id: patientId });
  },

  /** Create a new admission */
  async admit(data: {
    patientId: number;
    ward?: string;
    bedNumber?: string;
    admissionDate?: string;
    department?: string;
    diagnosis?: string;
  }): Promise<any> {
    return post<any>('/admissions/create.php', {
      patientId: data.patientId,
      ward: data.ward,
      bedNumber: data.bedNumber,
      admissionDate: data.admissionDate,
      department: data.department,
      diagnosis: data.diagnosis,
    });
  },

  /** Discharge a patient */
  async discharge(admissionId: number, data: { dischargeSummary?: string }): Promise<void> {
    await post('/admissions/discharge.php', {
      id: admissionId,
      dischargeSummary: data.dischargeSummary,
    });
  },

  // ── Beds ─────────────────────────────────────────────────────────────────────

  /** Get all beds */
  async getAllBeds(): Promise<BedRecord[]> {
    return get<BedRecord[]>('/beds/list.php');
  },

  /** Get all beds in a ward */
  async getBedsByWard(ward: string): Promise<BedRecord[]> {
    return get<BedRecord[]>('/beds/list.php', { ward });
  },

  /** Create a new bed */
  async createBed(data: { ward: string; bedNumber: string; bedType?: string }): Promise<BedRecord> {
    return post<BedRecord>('/beds/create.php', data);
  },

  /** Assign a patient to a bed */
  async assignBed(bedId: number, patientId: number): Promise<void> {
    await post('/beds/assign.php', { bedId, patientId });
  },

  /** Release a bed */
  async releaseBed(bedId: number, status = 'cleaning', notes?: string): Promise<void> {
    await post('/beds/release.php', { bedId, status, notes });
  },
};
