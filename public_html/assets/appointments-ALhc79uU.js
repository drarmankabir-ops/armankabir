import { a4 as get, aa as del, a3 as post } from "./index-C0IQc2a8.js";
import { m as mapListFromApi, b as mapFromApi, t as toNumber, c as toBoolean } from "./mappers-81DRO80I.js";
const appointmentMapping = {
  id: "id",
  patientId: "patient_id",
  patientName: "patient_name",
  patientPhone: "patient_phone",
  doctorId: "doctor_id",
  doctorName: "doctor_name",
  appointmentDate: "appointment_date",
  appointmentTime: "appointment_time",
  serialNumber: "serial_number",
  type: "type",
  status: "status",
  chiefComplaint: "chief_complaint",
  notes: "notes",
  isPublicRequest: "is_public_request",
  createdBy: "created_by",
  createdAt: "created_at",
  updatedAt: "updated_at"
};
const appointmentTransforms = {
  id: (v) => toNumber(v),
  patientId: (v) => toNumber(v),
  doctorId: (v) => toNumber(v),
  serialNumber: (v) => toNumber(v),
  createdBy: (v) => toNumber(v),
  isPublicRequest: (v) => toBoolean(v)
};
const appointmentService = {
  /** Submit a public booking request without exposing patient lookups. */
  async submitPublicRequest(data) {
    return post("/appointments/public_create.php", {
      booking_type: data.bookingType,
      patient_name: data.patientName,
      patient_phone: data.patientPhone,
      doctor: data.doctor,
      appointment_date: data.appointmentDate,
      appointment_time: data.appointmentTime ?? "",
      reason: data.reason ?? "",
      chamber: data.chamber ?? "",
      hospital_name: data.hospitalName ?? "",
      bed_ward_number: data.bedWardNumber ?? "",
      admission_reason: data.admissionReason ?? "",
      referring_doctor: data.referringDoctor ?? ""
    });
  },
  /** Load public requests for the authenticated staff inbox. */
  async getPublicRequests() {
    const result = await get("/appointments/list.php", {
      public_request: 1,
      limit: 200
    });
    return result.items.map((row) => {
      let details = {};
      try {
        const parsed = JSON.parse(String(row.notes ?? "{}"));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) details = parsed;
      } catch {
      }
      const field = (key) => typeof details[key] === "string" ? details[key] : "";
      return {
        id: toNumber(row.id),
        patientName: row.patient_name ?? "",
        phone: row.patient_phone ?? "",
        doctor: field("doctor") || row.doctor_name || "",
        date: row.appointment_date ?? "",
        time: row.appointment_time ?? "",
        reason: field("reason") || row.chief_complaint || "",
        status: row.status === "confirmed" ? "confirmed" : row.status === "cancelled" ? "cancelled" : "pending",
        chamber: field("chamber"),
        appointmentType: field("booking_type") === "admitted" ? "admitted" : "chamber",
        hospitalName: field("hospital_name"),
        bedWardNumber: field("bed_ward_number"),
        admissionReason: field("admission_reason"),
        referringDoctor: field("referring_doctor")
      };
    });
  },
  /** Get all appointments */
  async getAll(params) {
    const result = await get("/appointments/list.php", params);
    return mapListFromApi(result.items, appointmentMapping, appointmentTransforms);
  },
  /** Get appointments for a specific patient */
  async getByPatient(patientId) {
    const result = await get("/appointments/list.php", { patient_id: String(patientId) });
    return mapListFromApi(result.items, appointmentMapping, appointmentTransforms);
  },
  /** Get a single appointment by ID */
  async getById(id) {
    try {
      const result = await get("/appointments/get.php", { id: String(id) });
      return mapFromApi(result, appointmentMapping, appointmentTransforms);
    } catch {
      return null;
    }
  },
  /** Create a new appointment — PHP reads snake_case */
  async create(data) {
    const payload = {
      patient_id: data.patientId ?? null,
      patient_name: data.patientName ?? null,
      patient_phone: data.patientPhone ?? null,
      doctor_id: data.doctorId ?? null,
      appointment_date: data.appointmentDate,
      appointment_time: data.appointmentTime ?? null,
      type: data.type ?? "regular",
      status: data.status ?? "scheduled",
      chief_complaint: data.chiefComplaint ?? null,
      notes: data.notes ?? null
    };
    const result = await post("/appointments/create.php", payload);
    const apptId = result == null ? void 0 : result.id;
    if (apptId) return await this.getById(apptId);
    return result;
  },
  /** Update an existing appointment — PHP reads snake_case */
  async update(data) {
    const payload = { id: data.id };
    if (data.patientId !== void 0) payload.patient_id = data.patientId;
    if (data.patientName !== void 0) payload.patient_name = data.patientName;
    if (data.patientPhone !== void 0) payload.patient_phone = data.patientPhone;
    if (data.doctorId !== void 0) payload.doctor_id = data.doctorId;
    if (data.appointmentDate !== void 0) payload.appointment_date = data.appointmentDate;
    if (data.appointmentTime !== void 0) payload.appointment_time = data.appointmentTime;
    if (data.type !== void 0) payload.type = data.type;
    if (data.status !== void 0) payload.status = data.status;
    if (data.chiefComplaint !== void 0) payload.chief_complaint = data.chiefComplaint;
    if (data.notes !== void 0) payload.notes = data.notes;
    await post("/appointments/update.php", payload);
  },
  /** Delete an appointment */
  async delete(id) {
    await del("/appointments/delete.php", { id });
  },
  /** Search appointments */
  async search(query) {
    const result = await get("/appointments/list.php", { search: query });
    return mapListFromApi(result.items, appointmentMapping, appointmentTransforms);
  }
};
export {
  appointmentService as a
};
