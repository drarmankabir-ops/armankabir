import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  calculateAnionGap,
  calculateBmi,
  calculateBmr,
  calculateBsa,
  calculateCalorieRequirement,
  calculateCorrectedCalcium,
  calculateCreatinineClearance,
  calculateEgfr2021,
  calculateIdealBodyWeight,
  calculateMap,
} from "@/lib/medicalCalculations";
import type { BiologicalSex } from "@/lib/medicalCalculations";
import { Calculator } from "lucide-react";
import { useState } from "react";

type Field =
  | {
      key: string;
      label: string;
      unit: string;
      type: "number";
      min: number;
      max: number;
      step: number;
    }
  | {
      key: string;
      label: string;
      unit: string;
      type: "select";
      options: Array<{ value: string; label: string }>;
    };

interface CalculatorDefinition {
  id: string;
  title: string;
  formula: string;
  unit: string;
  limitation: string;
  fields: Field[];
  calculate: (values: Record<string, string>) => number;
  interpretation?: (result: number) => string;
}

interface SelectOption {
  value: string;
  label: string;
}

const sexOptions = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const activityOptions = [
  { value: "1.2", label: "Sedentary — 1.2" },
  { value: "1.375", label: "Light activity — 1.375" },
  { value: "1.55", label: "Moderate activity — 1.55" },
  { value: "1.725", label: "Very active — 1.725" },
  { value: "1.9", label: "Extra active — 1.9" },
];

const numberField = (
  key: string,
  label: string,
  unit: string,
  min: number,
  max: number,
  step = 0.1,
): Field => ({ key, label, unit, type: "number", min, max, step });

const selectField = (
  key: string,
  label: string,
  options: SelectOption[],
): Field => ({ key, label, unit: "", type: "select", options });

const sexField = selectField("sex", "Sex used by formula", sexOptions);
const ageField = numberField("age", "Age", "years", 18, 120, 1);
const weightField = numberField("weight", "Weight", "kg", 2, 500);
const heightField = numberField("height", "Height", "cm", 100, 250);
const creatinineField = numberField(
  "creatinine",
  "Serum creatinine",
  "mg/dL",
  0.1,
  20,
);

const calculators: CalculatorDefinition[] = [
  {
    id: "bmi",
    title: "Body Mass Index (BMI)",
    formula: "Weight (kg) ÷ height² (m²)",
    unit: "kg/m²",
    limitation:
      "A screening measure for adults; it does not distinguish fat from muscle or assess individual health.",
    fields: [weightField, heightField],
    calculate: (v) => calculateBmi(Number(v.weight), Number(v.height)),
    interpretation: (result) =>
      result < 18.5
        ? "Below 18.5: underweight range."
        : result < 25
          ? "18.5–24.9: usual healthy-weight range."
          : result < 30
            ? "25.0–29.9: overweight range."
            : "30 or above: obesity range.",
  },
  {
    id: "bmr",
    title: "Basal Metabolic Rate (BMR)",
    formula: "Mifflin–St Jeor: 10W + 6.25H − 5A + 5 (male) or −161 (female)",
    unit: "kcal/day",
    limitation:
      "An estimate of resting energy needs for adults, not a measured metabolic rate.",
    fields: [weightField, heightField, ageField, sexField],
    calculate: (v) =>
      calculateBmr(
        Number(v.weight),
        Number(v.height),
        Number(v.age),
        v.sex as BiologicalSex,
      ),
  },
  {
    id: "ibw",
    title: "Ideal Body Weight",
    formula:
      "Devine: 50 kg (male) or 45.5 kg (female) + 2.3 kg per inch over 5 ft",
    unit: "kg",
    limitation:
      "A historical estimate based on height and sex; it is not an individualized treatment target.",
    fields: [heightField, sexField],
    calculate: (v) =>
      calculateIdealBodyWeight(Number(v.height), v.sex as BiologicalSex),
  },
  {
    id: "bsa",
    title: "Body Surface Area (BSA)",
    formula: "Mosteller: √[height (cm) × weight (kg) ÷ 3600]",
    unit: "m²",
    limitation:
      "Mosteller is an estimate; use protocol-specific values for medication dosing.",
    fields: [weightField, heightField],
    calculate: (v) => calculateBsa(Number(v.weight), Number(v.height)),
  },
  {
    id: "calories",
    title: "Daily Calorie Requirement",
    formula: "Mifflin–St Jeor BMR × selected activity factor",
    unit: "kcal/day",
    limitation:
      "A starting estimate only; needs vary with health, pregnancy, goals, and actual activity.",
    fields: [
      weightField,
      heightField,
      ageField,
      sexField,
      selectField("activity", "Activity level", activityOptions),
    ],
    calculate: (v) =>
      calculateCalorieRequirement(
        Number(v.weight),
        Number(v.height),
        Number(v.age),
        v.sex as BiologicalSex,
        Number(v.activity),
      ),
  },
  {
    id: "creatinine-clearance",
    title: "Creatinine Clearance",
    formula:
      "Cockcroft–Gault: [(140 − age) × weight] ÷ [72 × serum creatinine]; ×0.85 (female)",
    unit: "mL/min",
    limitation:
      "Adult estimate; weight selection and changing kidney function affect accuracy. Not interchangeable with eGFR.",
    fields: [ageField, weightField, creatinineField, sexField],
    calculate: (v) =>
      calculateCreatinineClearance(
        Number(v.age),
        Number(v.weight),
        Number(v.creatinine),
        v.sex as BiologicalSex,
      ),
  },
  {
    id: "egfr",
    title: "eGFR (2021 CKD-EPI)",
    formula:
      "142 × min(SCr/κ, 1)^α × max(SCr/κ, 1)^−1.200 × 0.9938^Age × 1.012 (female); κ=0.9/0.7 and α=−0.302/−0.241 (male/female)",
    unit: "mL/min/1.73 m²",
    limitation:
      "For adults with stable creatinine; not reliable in acute kidney injury, pregnancy, or some body-composition extremes. Diagnosis needs clinical context.",
    fields: [creatinineField, ageField, sexField],
    calculate: (v) =>
      calculateEgfr2021(
        Number(v.creatinine),
        Number(v.age),
        v.sex as BiologicalSex,
      ),
  },
  {
    id: "corrected-calcium",
    title: "Corrected Calcium",
    formula: "Total calcium + 0.8 × (4 − albumin)",
    unit: "mg/dL",
    limitation:
      "Albumin correction can be inaccurate in critical illness and kidney disease; ionized calcium may be needed.",
    fields: [
      numberField("calcium", "Total calcium", "mg/dL", 2, 20),
      numberField("albumin", "Albumin", "g/dL", 0.1, 10),
    ],
    calculate: (v) =>
      calculateCorrectedCalcium(Number(v.calcium), Number(v.albumin)),
  },
  {
    id: "anion-gap",
    title: "Anion Gap",
    formula: "Sodium − (chloride + bicarbonate); potassium excluded",
    unit: "mmol/L",
    limitation:
      "Reference ranges vary by laboratory and albumin; interpret with the local lab range and clinical context.",
    fields: [
      numberField("sodium", "Sodium", "mmol/L", 50, 250),
      numberField("chloride", "Chloride", "mmol/L", 20, 200),
      numberField("bicarbonate", "Bicarbonate", "mmol/L", 1, 100),
    ],
    calculate: (v) =>
      calculateAnionGap(
        Number(v.sodium),
        Number(v.chloride),
        Number(v.bicarbonate),
      ),
  },
  {
    id: "map",
    title: "Mean Arterial Pressure (MAP)",
    formula: "(Systolic pressure + 2 × diastolic pressure) ÷ 3",
    unit: "mmHg",
    limitation:
      "An approximation for a regular heart rate; one reading alone does not establish a diagnosis.",
    fields: [
      numberField("systolic", "Systolic blood pressure", "mmHg", 20, 300, 1),
      numberField("diastolic", "Diastolic blood pressure", "mmHg", 10, 200, 1),
    ],
    calculate: (v) => calculateMap(Number(v.systolic), Number(v.diastolic)),
  },
];

function getValidationMessage(
  calculator: CalculatorDefinition,
  values: Record<string, string>,
): string | null {
  for (const field of calculator.fields) {
    const raw = values[`${calculator.id}.${field.key}`]?.trim() ?? "";
    if (!raw) return "Enter all required values to calculate.";
    if (field.type === "select") {
      if (!field.options.some((option) => option.value === raw)) {
        return "Choose a valid option.";
      }
      continue;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < field.min || value > field.max) {
      return `${field.label} must be between ${field.min} and ${field.max} ${field.unit}.`;
    }
  }
  if (calculator.id === "map") {
    const systolic = Number(values["map.systolic"]);
    const diastolic = Number(values["map.diastolic"]);
    if (systolic <= diastolic)
      return "Systolic pressure must exceed diastolic pressure.";
  }
  return null;
}

export default function MedicalCalculators() {
  const [values, setValues] = useState<Record<string, string>>({});

  const updateValue = (key: string, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  return (
    <section
      id="medical-calculators"
      className="px-4 py-16 sm:px-6"
      data-ocid="medical_calculators.section"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Calculator className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              Medical Calculators
            </h2>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Educational estimates only—not a diagnosis or substitute for a
            clinician’s judgment. Enter values with the displayed units;
            incomplete or out-of-range inputs are not calculated.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {calculators.map((calculator, index) => {
            const validationMessage = getValidationMessage(calculator, values);
            const result = validationMessage
              ? null
              : calculator.calculate(
                  Object.fromEntries(
                    calculator.fields.map((field) => [
                      field.key,
                      values[`${calculator.id}.${field.key}`],
                    ]),
                  ),
                );
            return (
              <Card
                key={calculator.id}
                className="flex flex-col"
                data-ocid={`medical_calculators.calculator.item.${index + 1}`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{calculator.title}</CardTitle>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Formula:
                    </span>{" "}
                    {calculator.formula}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {calculator.fields.map((field) => {
                      const inputId = `${calculator.id}-${field.key}`;
                      const valueKey = `${calculator.id}.${field.key}`;
                      return (
                        <div key={field.key} className="space-y-1.5">
                          <label
                            htmlFor={inputId}
                            className="text-sm font-medium"
                          >
                            {field.label}
                            {field.unit && (
                              <span className="ml-1 font-normal text-muted-foreground">
                                ({field.unit})
                              </span>
                            )}
                          </label>
                          {field.type === "select" ? (
                            <select
                              id={inputId}
                              value={values[valueKey] ?? ""}
                              onChange={(event) =>
                                updateValue(valueKey, event.target.value)
                              }
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              aria-label={field.label}
                            >
                              <option value="">Select</option>
                              {field.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              id={inputId}
                              type="number"
                              inputMode="decimal"
                              min={field.min}
                              max={field.max}
                              step={field.step}
                              value={values[valueKey] ?? ""}
                              onChange={(event) =>
                                updateValue(valueKey, event.target.value)
                              }
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              aria-label={`${field.label} in ${field.unit}`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div
                    className="rounded-lg bg-primary/5 p-3"
                    aria-live="polite"
                  >
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Result
                    </p>
                    {validationMessage ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {validationMessage}
                      </p>
                    ) : (
                      <>
                        <p className="mt-1 text-xl font-bold text-primary">
                          {result?.toFixed(2)}{" "}
                          <span className="text-sm font-medium">
                            {calculator.unit}
                          </span>
                        </p>
                        {calculator.interpretation && result !== null && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {calculator.interpretation(result)}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <p className="mt-auto text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Limitations:
                    </span>{" "}
                    {calculator.limitation}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
