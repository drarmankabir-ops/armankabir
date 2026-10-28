import { c as createLucideIcon } from "./index-CqgdYEyu.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M12 6v4", key: "16clxf" }],
  ["path", { d: "M14 14h-4", key: "esezmu" }],
  ["path", { d: "M14 18h-4", key: "16mqa2" }],
  ["path", { d: "M14 8h-4", key: "z8ypaz" }],
  [
    "path",
    {
      d: "M18 12h2a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h2",
      key: "b1k337"
    }
  ],
  ["path", { d: "M18 22V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v18", key: "16g51d" }]
];
const Hospital = createLucideIcon("hospital", __iconNode);
function normalisePhone(raw) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return `880${digits.slice(1)}`;
  if (digits.length === 10) return `880${digits}`;
  return digits;
}
function buildWhatsAppUrl(phone, message) {
  const num = normalisePhone(phone);
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}
function buildReportReadyMessage(patient, doctorName, clinicName, reportName) {
  const phone = patient.phone || patient.mobile || patient.contact || "";
  const msg = `Hello ${patient.fullName}, your ${reportName} report is ready at ${clinicName}. Please contact us to collect or view your report. Dr. ${doctorName}, ${clinicName}.`;
  return buildWhatsAppUrl(phone, msg);
}
function buildFollowUpMessage(patient, doctorName, clinicName, appointmentDate, appointmentTime) {
  const phone = patient.phone || patient.mobile || patient.contact || "";
  const msg = `Hello ${patient.fullName}, please attend your follow-up appointment on ${appointmentDate} at ${appointmentTime}. Location: ${clinicName}. Dr. ${doctorName}. For queries, please call us.`;
  return buildWhatsAppUrl(phone, msg);
}
export {
  Hospital as H,
  buildReportReadyMessage as a,
  buildFollowUpMessage as b,
  buildWhatsAppUrl as c,
  normalisePhone as n
};
