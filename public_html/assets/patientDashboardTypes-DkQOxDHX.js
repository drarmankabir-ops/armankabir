import { c as createLucideIcon, s as storage } from "./index-CA2StirE.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
];
const ArrowLeft = createLucideIcon("arrow-left", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
];
const Save = createLucideIcon("save", __iconNode);
const PATIENT_SUBMISSIONS_KEY = "medicare_patient_submissions";
const VACCINATION_KEY_PREFIX = "vaccination_";
const FAMILY_HISTORY_RISK_KEY_PREFIX = "family_history_risk_";
const ALLERGY_OVERRIDES_KEY_PREFIX = "allergy_overrides_";
const COMPLAINTS_KEY_PREFIX = "medicare_complaints_";
const ADVICE_KEY_PREFIX = "medicare_advice_entries_";
const DAILY_PROGRESS_KEY_PREFIX = "daily_progress_";
const PROBLEM_LIST_KEY_PREFIX = "problem_list_";
function loadComplaints(patientId) {
  try {
    const raw = storage.getItem(COMPLAINTS_KEY_PREFIX + patientId);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return [];
}
function saveComplaints(patientId, complaints) {
  storage.setItem(
    COMPLAINTS_KEY_PREFIX + patientId,
    JSON.stringify(complaints)
  );
}
function loadAdviceEntries(patientId) {
  try {
    const raw = storage.getItem(ADVICE_KEY_PREFIX + patientId);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return [];
}
function saveAdviceEntries(patientId, entries) {
  storage.setItem(ADVICE_KEY_PREFIX + patientId, JSON.stringify(entries));
}
function loadSubmissions() {
  try {
    const raw = storage.getItem(PATIENT_SUBMISSIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return [];
}
function saveSubmissions(subs) {
  storage.setItem(PATIENT_SUBMISSIONS_KEY, JSON.stringify(subs));
}
function loadDailyProgress(doctorEmail, patientId) {
  try {
    const key = `${DAILY_PROGRESS_KEY_PREFIX}${doctorEmail}_${patientId}`;
    const raw = storage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return [];
}
function saveDailyProgress(doctorEmail, patientId, entries) {
  const key = `${DAILY_PROGRESS_KEY_PREFIX}${doctorEmail}_${patientId}`;
  storage.setItem(key, JSON.stringify(entries));
}
function loadProblemList(doctorEmail, patientId) {
  try {
    const key = `${PROBLEM_LIST_KEY_PREFIX}${doctorEmail}_${patientId}`;
    const raw = storage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return [];
}
function saveProblemList(doctorEmail, patientId, items) {
  const key = `${PROBLEM_LIST_KEY_PREFIX}${doctorEmail}_${patientId}`;
  storage.setItem(key, JSON.stringify(items));
}
function loadVaccinationRecords(doctorEmail, patientId) {
  try {
    const key = `${VACCINATION_KEY_PREFIX}${doctorEmail}_${patientId}`;
    const raw = storage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return [];
}
function saveVaccinationRecords(doctorEmail, patientId, records) {
  const key = `${VACCINATION_KEY_PREFIX}${doctorEmail}_${patientId}`;
  storage.setItem(key, JSON.stringify(records));
}
function loadFamilyHistoryRisk(doctorEmail, patientId) {
  try {
    const key = `${FAMILY_HISTORY_RISK_KEY_PREFIX}${doctorEmail}_${patientId}`;
    const raw = storage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return null;
}
function saveFamilyHistoryRisk(doctorEmail, patientId, risk) {
  const key = `${FAMILY_HISTORY_RISK_KEY_PREFIX}${doctorEmail}_${patientId}`;
  storage.setItem(key, JSON.stringify(risk));
}
function loadAllergyOverrides(doctorEmail, patientId) {
  try {
    const key = `${ALLERGY_OVERRIDES_KEY_PREFIX}${doctorEmail}_${patientId}`;
    const raw = storage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return [];
}
function saveAllergyOverrides(doctorEmail, patientId, overrides) {
  const key = `${ALLERGY_OVERRIDES_KEY_PREFIX}${doctorEmail}_${patientId}`;
  storage.setItem(key, JSON.stringify(overrides));
}
const EMERGENCY_NOTIFICATIONS_KEY = "emergency_rx_notifications";
function loadEmergencyNotifications() {
  try {
    const raw = storage.getItem(EMERGENCY_NOTIFICATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return [];
}
function saveEmergencyNotifications(notifications) {
  storage.setItem(
    EMERGENCY_NOTIFICATIONS_KEY,
    JSON.stringify(notifications)
  );
}
function addEmergencyNotification(notification) {
  const existing = loadEmergencyNotifications();
  const newNotif = {
    ...notification,
    id: `emrx_notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  };
  saveEmergencyNotifications([newNotif, ...existing]);
}
export {
  ArrowLeft as A,
  Save as S,
  addEmergencyNotification as a,
  loadProblemList as b,
  saveProblemList as c,
  loadVaccinationRecords as d,
  saveVaccinationRecords as e,
  loadComplaints as f,
  loadAdviceEntries as g,
  loadSubmissions as h,
  loadFamilyHistoryRisk as i,
  saveComplaints as j,
  saveAdviceEntries as k,
  loadDailyProgress as l,
  saveSubmissions as m,
  loadAllergyOverrides as n,
  saveAllergyOverrides as o,
  saveFamilyHistoryRisk as p,
  saveDailyProgress as s
};
