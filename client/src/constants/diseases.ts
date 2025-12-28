/**
 * Common diseases/conditions list for easy selection
 */
export const COMMON_DISEASES = [
  { id: 'diabetes', name: 'Diabetes', category: 'metabolic' },
  { id: 'hypertension', name: 'High Blood Pressure (Hypertension)', category: 'cardiovascular' },
  { id: 'asthma', name: 'Asthma', category: 'respiratory' },
  { id: 'arthritis', name: 'Arthritis', category: 'musculoskeletal' },
  { id: 'heart_disease', name: 'Heart Disease', category: 'cardiovascular' },
  { id: 'copd', name: 'COPD (Chronic Obstructive Pulmonary Disease)', category: 'respiratory' },
  { id: 'kidney_disease', name: 'Kidney Disease', category: 'renal' },
  { id: 'thyroid', name: 'Thyroid Disorders', category: 'endocrine' },
  { id: 'depression', name: 'Depression', category: 'mental_health' },
  { id: 'anxiety', name: 'Anxiety', category: 'mental_health' },
  { id: 'obesity', name: 'Obesity', category: 'metabolic' },
  { id: 'osteoporosis', name: 'Osteoporosis', category: 'musculoskeletal' },
] as const;

export type CommonDiseaseId = typeof COMMON_DISEASES[number]['id'];

