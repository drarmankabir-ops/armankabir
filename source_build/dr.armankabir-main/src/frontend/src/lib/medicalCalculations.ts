export type BiologicalSex = "male" | "female";

function positiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive number.`);
  }
  return value;
}

function nonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative number.`);
  }
  return value;
}

function requireAdultAge(age: number): number {
  if (!Number.isFinite(age) || age < 18 || age > 120) {
    throw new RangeError("Age must be between 18 and 120 years.");
  }
  return age;
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const weight = positiveFinite(weightKg, "Weight");
  const heightM = positiveFinite(heightCm, "Height") / 100;
  return weight / (heightM * heightM);
}

export function calculateBmr(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: BiologicalSex,
): number {
  const weight = positiveFinite(weightKg, "Weight");
  const height = positiveFinite(heightCm, "Height");
  const age = requireAdultAge(ageYears);
  return 10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161);
}

export function calculateIdealBodyWeight(
  heightCm: number,
  sex: BiologicalSex,
): number {
  const heightInches = positiveFinite(heightCm, "Height") / 2.54;
  const baseWeight = sex === "male" ? 50 : 45.5;
  return baseWeight + 2.3 * (heightInches - 60);
}

export function calculateBsa(weightKg: number, heightCm: number): number {
  const weight = positiveFinite(weightKg, "Weight");
  const height = positiveFinite(heightCm, "Height");
  return Math.sqrt((height * weight) / 3600);
}

export function calculateCalorieRequirement(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: BiologicalSex,
  activityFactor: number,
): number {
  const factor = positiveFinite(activityFactor, "Activity factor");
  return calculateBmr(weightKg, heightCm, ageYears, sex) * factor;
}

export function calculateCreatinineClearance(
  ageYears: number,
  weightKg: number,
  creatinineMgDl: number,
  sex: BiologicalSex,
): number {
  const age = requireAdultAge(ageYears);
  const weight = positiveFinite(weightKg, "Weight");
  const creatinine = positiveFinite(creatinineMgDl, "Serum creatinine");
  const clearance = ((140 - age) * weight) / (72 * creatinine);
  return sex === "female" ? clearance * 0.85 : clearance;
}

export function calculateEgfr2021(
  creatinineMgDl: number,
  ageYears: number,
  sex: BiologicalSex,
): number {
  const creatinine = positiveFinite(creatinineMgDl, "Serum creatinine");
  const age = requireAdultAge(ageYears);
  const kappa = sex === "female" ? 0.7 : 0.9;
  const alpha = sex === "female" ? -0.241 : -0.302;
  const sexFactor = sex === "female" ? 1.012 : 1;
  return (
    142 *
    Math.min(creatinine / kappa, 1) ** alpha *
    Math.max(creatinine / kappa, 1) ** -1.2 *
    0.9938 ** age *
    sexFactor
  );
}

export function calculateCorrectedCalcium(
  calciumMgDl: number,
  albuminGDl: number,
): number {
  const calcium = positiveFinite(calciumMgDl, "Total calcium");
  const albumin = nonNegativeFinite(albuminGDl, "Albumin");
  return calcium + 0.8 * (4 - albumin);
}

export function calculateAnionGap(
  sodiumMmolL: number,
  chlorideMmolL: number,
  bicarbonateMmolL: number,
): number {
  const sodium = positiveFinite(sodiumMmolL, "Sodium");
  const chloride = positiveFinite(chlorideMmolL, "Chloride");
  const bicarbonate = positiveFinite(bicarbonateMmolL, "Bicarbonate");
  return sodium - chloride - bicarbonate;
}

export function calculateMap(
  systolicMmHg: number,
  diastolicMmHg: number,
): number {
  const systolic = positiveFinite(systolicMmHg, "Systolic pressure");
  const diastolic = positiveFinite(diastolicMmHg, "Diastolic pressure");
  if (systolic <= diastolic) {
    throw new RangeError(
      "Systolic pressure must be greater than diastolic pressure.",
    );
  }
  return (systolic + 2 * diastolic) / 3;
}
