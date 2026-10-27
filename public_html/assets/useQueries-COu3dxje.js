import { u as useQuery, a as useMutation } from "./useMutation-BVFTwwxy.js";
import { aP as del, V as post, W as get, a3 as useQueryClient } from "./index-mVdhg0vL.js";
function mapFromApi(raw, mapping, transforms) {
  if (!raw) return null;
  const result = {};
  for (const [camelField, snakeField] of Object.entries(mapping)) {
    let value = raw[snakeField];
    if (transforms == null ? void 0 : transforms[camelField]) {
      value = transforms[camelField](value);
    }
    result[camelField] = value ?? null;
  }
  return result;
}
function mapListFromApi(rawList, mapping, transforms) {
  if (!rawList || !Array.isArray(rawList)) return [];
  return rawList.map((item) => mapFromApi(item, mapping, transforms)).filter((item) => item !== null);
}
function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function toNumber(value) {
  if (value === null || value === void 0 || value === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
}
const patientMapping = {
  id: "id",
  fullName: "full_name",
  nameBn: "name_bn",
  dateOfBirth: "date_of_birth",
  gender: "gender",
  phone: "phone",
  email: "email",
  address: "address",
  bloodGroup: "blood_group",
  weight: "weight",
  height: "height",
  allergies: "allergies",
  chronicConditions: "chronic_conditions",
  pastSurgicalHistory: "past_surgical_history",
  patientType: "patient_type",
  createdAt: "created_at",
  registerNumber: "register_number",
  photo: "photo_url",
  department: "department",
  bedNumber: "bed_number",
  ward: "ward",
  hospitalName: "hospital_name",
  admittedOn: "admitted_on",
  admissionDate: "admission_date",
  dischargeDate: "discharge_date",
  isAdmitted: "is_admitted",
  status: "status",
  signUpEnabled: "sign_up_enabled",
  edd: "edd",
  lmpDate: "lmp_date",
  consultantAssignment: "consultant_assignment",
  registrationComplete: "registration_complete"
};
const patientTransforms = {
  id: (v) => toNumber(v),
  weight: (v) => toNumber(v),
  height: (v) => toNumber(v),
  allergies: (v) => parseJsonArray(v),
  chronicConditions: (v) => parseJsonArray(v),
  isAdmitted: (v) => v === 1 || v === true || v === "1",
  registrationComplete: (v) => v === 1 || v === true || v === "1",
  signUpEnabled: (v) => v === 1 || v === true || v === "1"
};
const patientService = {
  /** Get all patients (with optional limit) */
  async getAll(limit = 100, page = 1) {
    var _a;
    const result = await get(
      "/patients/list.php",
      { limit: String(limit), page: String(page) }
    );
    return {
      items: mapListFromApi(result.items, patientMapping, patientTransforms),
      total: (_a = result.pagination) == null ? void 0 : _a.total
    };
  },
  /** Search patients by query */
  async search(query) {
    const result = await get("/patients/list.php", {
      search: query,
      limit: "50"
    });
    return mapListFromApi(result.items, patientMapping, patientTransforms);
  },
  /** Get a single patient by ID */
  async getById(id) {
    try {
      const result = await get("/patients/get.php", { id: String(id) });
      return mapFromApi(result, patientMapping, patientTransforms);
    } catch {
      return null;
    }
  },
  /** Create a new patient */
  async create(data) {
    const payload = {
      fullName: data.fullName,
      nameBn: data.nameBn || null,
      dateOfBirth: data.dateOfBirth || null,
      gender: data.gender ?? "male",
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      bloodGroup: data.bloodGroup || null,
      weight: data.weight ?? null,
      height: data.height ?? null,
      allergies: data.allergies ?? [],
      chronicConditions: data.chronicConditions ?? [],
      pastSurgicalHistory: data.pastSurgicalHistory || null,
      patientType: data.patientType ?? "outdoor",
      photo: data.photo || null,
      registrationComplete: data.registrationComplete !== false
    };
    const result = await post("/patients/create.php", payload);
    return mapFromApi(result, patientMapping, patientTransforms);
  },
  /** Update an existing patient */
  async update(data) {
    const payload = { id: data.id };
    if (data.fullName !== void 0) payload.fullName = data.fullName;
    if (data.nameBn !== void 0) payload.nameBn = data.nameBn;
    if (data.dateOfBirth !== void 0) payload.dateOfBirth = data.dateOfBirth;
    if (data.gender !== void 0) payload.gender = data.gender;
    if (data.phone !== void 0) payload.phone = data.phone;
    if (data.email !== void 0) payload.email = data.email;
    if (data.address !== void 0) payload.address = data.address;
    if (data.bloodGroup !== void 0) payload.bloodGroup = data.bloodGroup;
    if (data.weight !== void 0) payload.weight = data.weight;
    if (data.height !== void 0) payload.height = data.height;
    if (data.allergies !== void 0) payload.allergies = data.allergies;
    if (data.chronicConditions !== void 0) payload.chronicConditions = data.chronicConditions;
    if (data.pastSurgicalHistory !== void 0) payload.pastSurgicalHistory = data.pastSurgicalHistory;
    if (data.patientType !== void 0) payload.patientType = data.patientType;
    if (data.photo !== void 0) payload.photo = data.photo;
    if (data.registrationComplete !== void 0) payload.registrationComplete = data.registrationComplete;
    const result = await post("/patients/update.php", payload);
    return mapFromApi(result, patientMapping, patientTransforms);
  },
  /** Delete a patient */
  async delete(id) {
    await del("/patients/delete.php", { id });
  }
};
const patients = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  patientService
}, Symbol.toStringTag, { value: "Module" }));
const visitMapping = {
  id: "id",
  patientId: "patient_id",
  visitDate: "visit_date",
  chiefComplaint: "chief_complaint",
  historyOfPresentIllness: "history_of_present_illness",
  vitalSigns: "vital_signs",
  physicalExamination: "physical_examination",
  diagnosis: "diagnosis",
  notes: "notes",
  visitType: "visit_type",
  createdAt: "created_at"
};
const visitTransforms = {
  id: (v) => toNumber(v) ?? 0,
  patientId: (v) => toNumber(v) ?? 0,
  vitalSigns: (v) => v && typeof v === "object" ? v : null
};
const visitService = {
  /** Get all visits for a patient */
  async getByPatient(patientId) {
    const result = await get("/visits/list.php", { patient_id: String(patientId) });
    return mapListFromApi(result.items, visitMapping, visitTransforms);
  },
  /** Get a single visit by ID */
  async getById(id) {
    try {
      const result = await get("/visits/get.php", { id: String(id) });
      return mapFromApi(result, visitMapping, visitTransforms);
    } catch {
      return null;
    }
  },
  /** Create a new visit — PHP reads camelCase */
  async create(data) {
    const payload = {
      patientId: data.patientId,
      visitDate: data.visitDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      chiefComplaint: data.chiefComplaint || null,
      historyOfPresentIllness: data.historyOfPresentIllness || null,
      vitalSigns: data.vitalSigns || null,
      physicalExamination: data.physicalExamination || null,
      diagnosis: data.diagnosis || null,
      notes: data.notes || null,
      visitType: data.visitType ?? "outpatient"
    };
    const result = await post("/visits/create.php", payload);
    return mapFromApi(result, visitMapping, visitTransforms);
  },
  /** Update an existing visit — PHP reads camelCase */
  async update(data) {
    const payload = {
      id: data.id,
      patientId: data.patientId
    };
    if (data.visitDate !== void 0) payload.visitDate = data.visitDate;
    if (data.chiefComplaint !== void 0) payload.chiefComplaint = data.chiefComplaint;
    if (data.historyOfPresentIllness !== void 0) payload.historyOfPresentIllness = data.historyOfPresentIllness;
    if (data.vitalSigns !== void 0) payload.vitalSigns = data.vitalSigns;
    if (data.physicalExamination !== void 0) payload.physicalExamination = data.physicalExamination;
    if (data.diagnosis !== void 0) payload.diagnosis = data.diagnosis;
    if (data.notes !== void 0) payload.notes = data.notes;
    if (data.visitType !== void 0) payload.visitType = data.visitType;
    const result = await post("/visits/update.php", payload);
    return mapFromApi(result, visitMapping, visitTransforms);
  },
  /** Delete a visit */
  async delete(id, _patientId) {
    await del("/visits/delete.php", { id });
  },
  /** Search visits */
  async search(query) {
    const result = await get("/visits/list.php", { search: query });
    return mapListFromApi(result.items, visitMapping, visitTransforms);
  }
};
const prescriptionMapping = {
  id: "id",
  patientId: "patient_id",
  visitId: "visit_id",
  prescriptionDate: "prescription_date",
  diagnosis: "diagnosis",
  medications: "medications",
  notes: "notes",
  createdAt: "created_at"
};
const prescriptionTransforms = {
  id: (v) => toNumber(v),
  patientId: (v) => toNumber(v),
  visitId: (v) => toNumber(v),
  medications: (v) => Array.isArray(v) ? v : []
};
const prescriptionService = {
  /** Get all prescriptions for a patient */
  async getByPatient(patientId) {
    const result = await get(
      "/prescriptions/list.php",
      { patient_id: String(patientId) }
    );
    const items = Array.isArray(result) ? result : result.items ?? [];
    return mapListFromApi(items, prescriptionMapping, prescriptionTransforms);
  },
  /** Get a single prescription by ID */
  async getById(id) {
    try {
      const result = await get("/prescriptions/get.php", { id: String(id) });
      return mapFromApi(result, prescriptionMapping, prescriptionTransforms);
    } catch {
      return null;
    }
  },
  /** Create a new prescription */
  async create(data) {
    const result = await post("/prescriptions/create.php", {
      patientId: data.patientId,
      visitId: data.visitId ?? null,
      prescriptionDate: data.prescriptionDate,
      diagnosis: data.diagnosis ?? null,
      medications: data.medications,
      notes: data.notes ?? null
    });
    const rxId = result == null ? void 0 : result.id;
    if (rxId) return await this.getById(rxId);
    return result;
  },
  /** Update an existing prescription — PHP reads camelCase */
  async update(data) {
    await post("/prescriptions/update.php", {
      id: data.id,
      patientId: data.patientId,
      visitId: data.visitId,
      prescriptionDate: data.prescriptionDate,
      diagnosis: data.diagnosis,
      medications: data.medications,
      notes: data.notes
    });
  },
  /** Delete a prescription */
  async delete(id, _patientId) {
    await del("/prescriptions/delete.php", { id });
  },
  /** Search prescriptions */
  async search(query) {
    const result = await get("/prescriptions/list.php", { search: query });
    const items = Array.isArray(result) ? result : [];
    return mapListFromApi(items, prescriptionMapping, prescriptionTransforms);
  }
};
const clinicalNotesService = {
  // ── Encounters ───────────────────────────────────────────────────────────────
  /** Get all encounters for a patient */
  async getEncountersByPatient(patientId) {
    return get("/clinical/encounters-list.php", { patient_id: patientId });
  },
  /** Create a new encounter */
  async createEncounter(patientId, encounterData) {
    return post("/clinical/encounters-create.php", {
      patient_id: patientId,
      ...encounterData
    });
  },
  // ── Observations ─────────────────────────────────────────────────────────────
  /** Get all observations for a patient */
  async getObservationsByPatient(patientId) {
    return get("/clinical/observations-list.php", { patient_id: patientId });
  },
  /** Create a new observation */
  async createObservation(patientId, observationData) {
    return post("/clinical/observations-create.php", {
      patient_id: patientId,
      ...observationData
    });
  },
  // ── Clinical Notes ───────────────────────────────────────────────────────────
  /** Get all clinical notes for a patient */
  async getNotesByPatient(patientId) {
    return get("/clinical/notes-list.php", { patient_id: patientId });
  },
  /** Create a new clinical note */
  async createNote(patientId, noteData) {
    return post("/clinical/notes-create.php", {
      patient_id: patientId,
      ...noteData
    });
  },
  /** Delete a clinical note */
  async deleteNote(id) {
    await del("/clinical/notes-delete.php", { id });
  },
  // ── Orders ───────────────────────────────────────────────────────────────────
  /** Get all clinical orders for a patient */
  async getOrdersByPatient(patientId) {
    return get("/clinical/orders-list.php", { patient_id: patientId });
  },
  /** Create a new clinical order */
  async createOrder(patientId, orderData) {
    return post("/clinical/orders-create.php", {
      patient_id: patientId,
      ...orderData
    });
  },
  /** Delete an order */
  async deleteOrder(id) {
    await del("/clinical/orders-delete.php", { id });
  }
};
const admissionService = {
  // ── Admissions ───────────────────────────────────────────────────────────────
  /** Get admission history for a patient */
  async getByPatient(patientId) {
    return get("/admissions/list.php", { patient_id: patientId });
  },
  /** Create a new admission */
  async admit(data) {
    return post("/admissions/create.php", {
      patientId: data.patientId,
      ward: data.ward,
      bedNumber: data.bedNumber,
      admissionDate: data.admissionDate,
      department: data.department,
      diagnosis: data.diagnosis
    });
  },
  /** Discharge a patient */
  async discharge(admissionId, data) {
    await post("/admissions/discharge.php", {
      id: admissionId,
      dischargeSummary: data.dischargeSummary
    });
  },
  // ── Beds ─────────────────────────────────────────────────────────────────────
  /** Get all beds */
  async getAllBeds() {
    return get("/beds/list.php");
  },
  /** Get all beds in a ward */
  async getBedsByWard(ward) {
    return get("/beds/list.php", { ward });
  },
  /** Create a new bed */
  async createBed(data) {
    return post("/beds/create.php", data);
  },
  /** Assign a patient to a bed */
  async assignBed(bedId, patientId) {
    await post("/beds/assign.php", { bedId, patientId });
  },
  /** Release a bed */
  async releaseBed(bedId, status = "cleaning", notes) {
    await post("/beds/release.php", { bedId, status, notes });
  }
};
function useGetAllPatients() {
  return useQuery({ queryKey: ["patients"], queryFn: async () => (await patientService.getAll(100)).items });
}
function useGetPatient(id) {
  return useQuery({ queryKey: ["patient", id], queryFn: () => patientService.getById(id), enabled: id !== null });
}
function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => patientService.create(data), onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }) });
}
function useUpdatePatient() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => patientService.update(data), onSuccess: (_, data) => {
    qc.invalidateQueries({ queryKey: ["patients"] });
    qc.invalidateQueries({ queryKey: ["patient", data.id] });
  } });
}
function useDeletePatient() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (id) => patientService.delete(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["patients"] }) });
}
function useGetVisitsByPatient(patientId) {
  return useQuery({ queryKey: ["visits", patientId], queryFn: () => visitService.getByPatient(patientId), enabled: patientId !== null });
}
function useCreateVisit() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => visitService.create(data), onSuccess: (_, data) => qc.invalidateQueries({ queryKey: ["visits", data.patientId] }) });
}
function useGetPrescriptionsByPatient(patientId) {
  return useQuery({ queryKey: ["prescriptions", patientId], queryFn: () => prescriptionService.getByPatient(patientId), enabled: patientId !== null });
}
function useCreatePrescription() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => prescriptionService.create(data), onSuccess: (_, data) => qc.invalidateQueries({ queryKey: ["prescriptions", data.patientId] }) });
}
function useGetEncountersByPatient(patientId) {
  return useQuery({ queryKey: ["encounters", patientId], queryFn: () => clinicalNotesService.getEncountersByPatient(patientId), enabled: patientId !== null });
}
function useGetClinicalNotesByPatient(patientId) {
  return useQuery({ queryKey: ["clinicalNotes", patientId], queryFn: () => clinicalNotesService.getNotesByPatient(patientId), enabled: patientId !== null });
}
function useCreateObservation() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ patientId, observationData }) => clinicalNotesService.createObservation(patientId, observationData), onSuccess: (_, d) => qc.invalidateQueries({ queryKey: ["observations", d.patientId] }) });
}
function useCreateClinicalNote() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ patientId, noteData }) => clinicalNotesService.createNote(patientId, noteData), onSuccess: (_, d) => qc.invalidateQueries({ queryKey: ["clinicalNotes", d.patientId] }) });
}
function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: ({ patientId, orderData }) => clinicalNotesService.createOrder(patientId, orderData), onSuccess: (_, d) => qc.invalidateQueries({ queryKey: ["orders", d.patientId] }) });
}
function useGetAllBeds() {
  return useQuery({ queryKey: ["beds"], queryFn: () => admissionService.getAllBeds() });
}
function useCreateBed() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => admissionService.createBed(data), onSuccess: () => qc.invalidateQueries({ queryKey: ["beds"] }) });
}
function useAdmitPatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => admissionService.admit(data),
    onSuccess: (_, data) => {
      qc.invalidateQueries({ queryKey: ["admissions", data.patientId] });
      qc.invalidateQueries({ queryKey: ["beds"] });
    }
  });
}
function useDischargePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const admissions = await admissionService.getByPatient(data.patientId);
      const activeAdmission = admissions.find((admission) => admission.status !== "discharged");
      if (!activeAdmission) {
        throw new Error("No active admission exists for this patient.");
      }
      return admissionService.discharge(Number(activeAdmission.id));
    },
    onSuccess: (_, data) => {
      qc.invalidateQueries({ queryKey: ["admissions", data.patientId] });
      qc.invalidateQueries({ queryKey: ["patient", data.patientId] });
      qc.invalidateQueries({ queryKey: ["beds"] });
    }
  });
}
function useCreateBedRecord() {
  return useCreateBed();
}
function useAssignBed() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (data) => admissionService.assignBed(data.bedId, data.patientId), onSuccess: () => qc.invalidateQueries({ queryKey: ["beds"] }) });
}
function getDoctorEmail(email) {
  return "";
}
function loadFromStorage() {
  throw new Error("Business data must use a domain API service.");
}
function loadFromAllDoctorKeys() {
  throw new Error("Business data must use a domain API service.");
}
function saveToStorage() {
  throw new Error("Business data must use a domain API service.");
}
function getVisitFormData() {
  throw new Error("Visit data must use visitService.");
}
function getPrescriptionHeaderImage() {
  throw new Error("Prescription headers must use the PHP API.");
}
function setPrescriptionHeaderImage() {
  throw new Error("Prescription headers must use the PHP API.");
}
function loadPrescriptionRecords() {
  throw new Error("Prescription records must use prescriptionService.");
}
function savePrescriptionRecords() {
  throw new Error("Prescription records must use prescriptionService.");
}
function autoPopulateDrugReminders() {
  throw new Error("Drug reminders must use the PHP API.");
}
export {
  useCreateOrder as A,
  useCreateObservation as B,
  useCreateClinicalNote as C,
  patients as D,
  useGetAllPatients as a,
  useGetAllBeds as b,
  useAssignBed as c,
  useCreateBedRecord as d,
  useCreateVisit as e,
  useCreatePrescription as f,
  getDoctorEmail as g,
  useAdmitPatient as h,
  getVisitFormData as i,
  useGetEncountersByPatient as j,
  useGetClinicalNotesByPatient as k,
  loadFromAllDoctorKeys as l,
  getPrescriptionHeaderImage as m,
  useGetPatient as n,
  useGetVisitsByPatient as o,
  useGetPrescriptionsByPatient as p,
  useUpdatePatient as q,
  useDeletePatient as r,
  useDischargePatient as s,
  setPrescriptionHeaderImage as t,
  useCreatePatient as u,
  loadPrescriptionRecords as v,
  savePrescriptionRecords as w,
  autoPopulateDrugReminders as x,
  loadFromStorage as y,
  saveToStorage as z
};
