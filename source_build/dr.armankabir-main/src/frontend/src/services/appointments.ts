/**
 * Appointment Service
 *
 * CRUD operations for patient appointments.
 * All data is persisted in MySQL via the PHP API.
 * CamelCase frontend ↔ snake_case PHP API.
 */

import { get, post, del } from '../lib/apiClient';
import type { Appointment } from '../types';
import { mapListFromApi, mapFromApi, mapToApi, type Mapping, toNumber, toBoolean } from '../lib/mappers';

// ── Appointment API mapping ───────────────────────────────────────────────

const appointmentMapping: Mapping<Appointment> = {
  id: 'id',
  patientId: 'patient_id',
  patientName: 'patient_name',
  patientPhone: 'patient_phone',
  doctorId: 'doctor_id',
  doctorName: 'doctor_name',
  appointmentDate: 'appointment_date',
  appointmentTime: 'appointment_time',
  serialNumber: 'serial_number',
  type: 'type',
  status: 'status',
  chiefComplaint: 'chief_complaint',
  notes: 'notes',
  isPublicRequest: 'is_public_request',
  createdBy: 'created_by',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

const appointmentTransforms = {
  id: (v: any) => toNumber(v),
  patientId: (v: any) => toNumber(v),
  doctorId: (v: any) => toNumber(v),
  serialNumber: (v: any) => toNumber(v),
  createdBy: (v: any) => toNumber(v),
  isPublicRequest: (v: any) => toBoolean(v),
};

// ── Request DTOs ─────────────────────────────────────────────────────────

export interface CreateAppointmentData {
  patientId?: number;
  patientName?: string;
  patientPhone?: string;
  doctorId?: number;
  appointmentDate: string;
  appointmentTime?: string;
  type?: string;
  status?: string;
  chiefComplaint?: string;
  notes?: string;
}

export interface UpdateAppointmentData extends Partial<CreateAppointmentData> {
  id: number;
}

export interface PublicAppointmentRequest {
  id: number;
  patientName: string;
  phone: string;
  doctor: string;
  date: string;
  time: string;
  reason: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  chamber: string;
  appointmentType: 'chamber' | 'admitted';
  hospitalName: string;
  bedWardNumber: string;
  admissionReason: string;
  referringDoctor: string;
}

export interface CreatePublicAppointmentRequest {
  bookingType: 'chamber' | 'admitted';
  patientName: string;
  patientPhone: string;
  doctor: string;
  appointmentDate: string;
  appointmentTime?: string;
  reason?: string;
  chamber?: string;
  hospitalName?: string;
  bedWardNumber?: string;
  admissionReason?: string;
  referringDoctor?: string;
}

export const appointmentService = {
  /** Submit a public booking request without exposing patient lookups. */
  async submitPublicRequest(data: CreatePublicAppointmentRequest): Promise<{ id: number }> {
    return post<{ id: number }>('/appointments/public_create.php', {
      booking_type: data.bookingType,
      patient_name: data.patientName,
      patient_phone: data.patientPhone,
      doctor: data.doctor,
      appointment_date: data.appointmentDate,
      appointment_time: data.appointmentTime ?? '',
      reason: data.reason ?? '',
      chamber: data.chamber ?? '',
      hospital_name: data.hospitalName ?? '',
      bed_ward_number: data.bedWardNumber ?? '',
      admission_reason: data.admissionReason ?? '',
      referring_doctor: data.referringDoctor ?? '',
    });
  },

  /** Load public requests for the authenticated staff inbox. */
  async getPublicRequests(): Promise<PublicAppointmentRequest[]> {
    const result = await get<{ items: Record<string, any>[] }>('/appointments/list.php', {
      public_request: 1,
      limit: 200,
    });
    return result.items.map((row) => {
      let details: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(String(row.notes ?? '{}'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) details = parsed;
      } catch {
        // Older public requests stored notes as plain text.
      }
      const field = (key: string) => typeof details[key] === 'string' ? details[key] as string : '';
      return {
        id: toNumber(row.id),
        patientName: row.patient_name ?? '',
        phone: row.patient_phone ?? '',
        doctor: field('doctor') || row.doctor_name || '',
        date: row.appointment_date ?? '',
        time: row.appointment_time ?? '',
        reason: field('reason') || row.chief_complaint || '',
        status: row.status === 'confirmed' ? 'confirmed' : row.status === 'cancelled' ? 'cancelled' : 'pending',
        chamber: field('chamber'),
        appointmentType: field('booking_type') === 'admitted' ? 'admitted' : 'chamber',
        hospitalName: field('hospital_name'),
        bedWardNumber: field('bed_ward_number'),
        admissionReason: field('admission_reason'),
        referringDoctor: field('referring_doctor'),
      };
    });
  },

  /** Get all appointments */
  async getAll(params?: { limit?: number; date?: string; status?: string }): Promise<Appointment[]> {
    const result = await get<{ items: Record<string, any>[] }>('/appointments/list.php', params as any);
    return mapListFromApi<Appointment>(result.items, appointmentMapping, appointmentTransforms);
  },

  /** Get appointments for a specific patient */
  async getByPatient(patientId: number): Promise<Appointment[]> {
    const result = await get<{ items: Record<string, any>[] }>('/appointments/list.php', { patient_id: String(patientId) });
    return mapListFromApi<Appointment>(result.items, appointmentMapping, appointmentTransforms);
  },

  /** Get a single appointment by ID */
  async getById(id: number): Promise<Appointment | null> {
    try {
      const result = await get<Record<string, any>>('/appointments/get.php', { id: String(id) });
      return mapFromApi<Appointment>(result, appointmentMapping, appointmentTransforms);
    } catch {
      return null;
    }
  },

  /** Create a new appointment — PHP reads snake_case */
  async create(data: CreateAppointmentData): Promise<Appointment> {
    const payload: Record<string, any> = {
      patient_id: data.patientId ?? null,
      patient_name: data.patientName ?? null,
      patient_phone: data.patientPhone ?? null,
      doctor_id: data.doctorId ?? null,
      appointment_date: data.appointmentDate,
      appointment_time: data.appointmentTime ?? null,
      type: data.type ?? 'regular',
      status: data.status ?? 'scheduled',
      chief_complaint: data.chiefComplaint ?? null,
      notes: data.notes ?? null,
    };
    const result = await post<Record<string, any>>('/appointments/create.php', payload);
    // create.php returns { id, serial_number } — map via getById
    const apptId = result?.id;
    if (apptId) return (await this.getById(apptId))!;
    return result as unknown as Appointment;
  },

  /** Update an existing appointment — PHP reads snake_case */
  async update(data: UpdateAppointmentData): Promise<void> {
    const payload: Record<string, any> = { id: data.id };
    if (data.patientId !== undefined) payload.patient_id = data.patientId;
    if (data.patientName !== undefined) payload.patient_name = data.patientName;
    if (data.patientPhone !== undefined) payload.patient_phone = data.patientPhone;
    if (data.doctorId !== undefined) payload.doctor_id = data.doctorId;
    if (data.appointmentDate !== undefined) payload.appointment_date = data.appointmentDate;
    if (data.appointmentTime !== undefined) payload.appointment_time = data.appointmentTime;
    if (data.type !== undefined) payload.type = data.type;
    if (data.status !== undefined) payload.status = data.status;
    if (data.chiefComplaint !== undefined) payload.chief_complaint = data.chiefComplaint;
    if (data.notes !== undefined) payload.notes = data.notes;
    await post('/appointments/update.php', payload);
  },

  /** Delete an appointment */
  async delete(id: number): Promise<void> {
    await del('/appointments/delete.php', { id });
  },

  /** Search appointments */
  async search(query: string): Promise<Appointment[]> {
    const result = await get<{ items: Record<string, any>[] }>('/appointments/list.php', { search: query });
    return mapListFromApi<Appointment>(result.items, appointmentMapping, appointmentTransforms);
  },
};
