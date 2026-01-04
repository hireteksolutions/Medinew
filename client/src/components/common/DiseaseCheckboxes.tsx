import { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { COMMON_DISEASES, CommonDiseaseId } from '../../constants/diseases';

interface DiseaseCheckboxesProps {
  selectedDiseases?: CommonDiseaseId[];
  onChange?: (selectedDiseases: CommonDiseaseId[]) => void;
  showDescription?: boolean;
}

export default function DiseaseCheckboxes({
  selectedDiseases: initialSelected = [],
  onChange,
  showDescription = true,
}: DiseaseCheckboxesProps) {
  const [selectedDiseases, setSelectedDiseases] = useState<CommonDiseaseId[]>(initialSelected);

  useEffect(() => {
    setSelectedDiseases(initialSelected);
  }, [initialSelected]);

  const handleDiseaseToggle = (diseaseId: CommonDiseaseId) => {
    const newSelected = selectedDiseases.includes(diseaseId)
      ? selectedDiseases.filter(id => id !== diseaseId)
      : [...selectedDiseases, diseaseId];
    
    setSelectedDiseases(newSelected);
    if (onChange) {
      onChange(newSelected);
    }
  };

  // Group diseases by category
  const diseasesByCategory = COMMON_DISEASES.reduce((acc, disease) => {
    if (!acc[disease.category]) {
      acc[disease.category] = [] as Array<typeof COMMON_DISEASES[number]>;
    }
    acc[disease.category].push(disease);
    return acc;
  }, {} as Record<string, Array<typeof COMMON_DISEASES[number]>>);

  const categoryLabels: Record<string, string> = {
    metabolic: 'Metabolic',
    cardiovascular: 'Cardiovascular',
    respiratory: 'Respiratory',
    musculoskeletal: 'Musculoskeletal',
    renal: 'Renal',
    endocrine: 'Endocrine',
    mental_health: 'Mental Health',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-primary-500" />
        <h3 className="text-lg font-semibold text-gray-800">
          Common Health Conditions
        </h3>
      </div>

      {showDescription && (
        <p className="text-sm text-gray-600 mb-4">
          Select any conditions you currently have or have been diagnosed with. This helps your doctor provide better care.
        </p>
      )}

      <div className="space-y-4">
        {Object.entries(diseasesByCategory).map(([category, diseases]) => (
          <div key={category} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              {categoryLabels[category] || category}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {diseases.map((disease) => (
                <label
                  key={disease.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedDiseases.includes(disease.id)}
                    onChange={() => handleDiseaseToggle(disease.id)}
                    className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
                  />
                  <span className="text-sm text-gray-700">{disease.name}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedDiseases.length > 0 && (
        <div className="mt-4 p-3 bg-primary-50 rounded-lg">
          <p className="text-sm font-medium text-primary-700 mb-1">
            Selected: {selectedDiseases.length} condition(s)
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedDiseases.map((diseaseId) => {
              const disease = COMMON_DISEASES.find(d => d.id === diseaseId);
              return (
                <span
                  key={diseaseId}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800"
                >
                  {disease?.name}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

