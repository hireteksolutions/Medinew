import { useState } from 'react';
import { Calculator, Info } from 'lucide-react';

interface BMICalculatorProps {
  height?: number; // in cm
  weight?: number; // in kg
  onHeightChange?: (height: number) => void;
  onWeightChange?: (weight: number) => void;
  showDetails?: boolean;
}

export default function BMICalculator({
  height: initialHeight,
  weight: initialWeight,
  onHeightChange,
  onWeightChange,
  showDetails = true,
}: BMICalculatorProps) {
  const [height, setHeight] = useState<number>(initialHeight || 0);
  const [weight, setWeight] = useState<number>(initialWeight || 0);
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  // Convert height to cm
  const heightInCm = heightUnit === 'ft' 
    ? height * 30.48 // 1 ft = 30.48 cm
    : height;

  // Convert weight to kg
  const weightInKg = weightUnit === 'lbs'
    ? weight * 0.453592 // 1 lb = 0.453592 kg
    : weight;

  // Calculate BMI: BMI = weight (kg) / (height (m))^2
  const heightInMeters = heightInCm / 100;
  const bmi = heightInMeters > 0 && weightInKg > 0
    ? (weightInKg / (heightInMeters * heightInMeters))
    : 0;

  // Get BMI category
  const getBMICategory = (bmi: number): { category: string; color: string; description: string } => {
    if (bmi === 0) return { category: 'Enter values', color: 'text-gray-500', description: '' };
    if (bmi < 18.5) return { category: 'Underweight', color: 'text-blue-600', description: 'You may need to gain weight' };
    if (bmi < 25) return { category: 'Normal', color: 'text-green-600', description: 'Healthy weight range' };
    if (bmi < 30) return { category: 'Overweight', color: 'text-yellow-600', description: 'Consider weight management' };
    return { category: 'Obese', color: 'text-red-600', description: 'Consult with a healthcare provider' };
  };

  const bmiInfo = getBMICategory(bmi);

  const handleHeightChange = (value: number) => {
    setHeight(value);
    if (onHeightChange) {
      const heightInCm = heightUnit === 'ft' ? value * 30.48 : value;
      onHeightChange(heightInCm);
    }
  };

  const handleWeightChange = (value: number) => {
    setWeight(value);
    if (onWeightChange) {
      const weightInKg = weightUnit === 'lbs' ? value * 0.453592 : value;
      onWeightChange(weightInKg);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="w-5 h-5 text-primary-500" />
        <h3 className="text-lg font-semibold text-gray-800">BMI Calculator</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Height Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Height
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={height || ''}
              onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
              placeholder={heightUnit === 'cm' ? '170' : '5.6'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="0"
              step={heightUnit === 'cm' ? '1' : '0.1'}
            />
            <select
              value={heightUnit}
              onChange={(e) => {
                setHeightUnit(e.target.value as 'cm' | 'ft');
                // Convert current value
                if (height > 0) {
                  const newValue = e.target.value === 'ft'
                    ? height / 30.48
                    : height * 30.48;
                  handleHeightChange(newValue);
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="cm">cm</option>
              <option value="ft">ft</option>
            </select>
          </div>
        </div>

        {/* Weight Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Weight
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              value={weight || ''}
              onChange={(e) => handleWeightChange(parseFloat(e.target.value) || 0)}
              placeholder={weightUnit === 'kg' ? '70' : '154'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="0"
              step={weightUnit === 'kg' ? '0.1' : '0.1'}
            />
            <select
              value={weightUnit}
              onChange={(e) => {
                setWeightUnit(e.target.value as 'kg' | 'lbs');
                // Convert current value
                if (weight > 0) {
                  const newValue = e.target.value === 'lbs'
                    ? weight / 0.453592
                    : weight * 0.453592;
                  handleWeightChange(newValue);
                }
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
        </div>
      </div>

      {/* BMI Result */}
      {showDetails && height > 0 && weight > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Your BMI:</span>
            <span className={`text-2xl font-bold ${bmiInfo.color}`}>
              {bmi.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${bmiInfo.color}`}>
              {bmiInfo.category}
            </span>
            {bmiInfo.description && (
              <span className="text-xs text-gray-600">({bmiInfo.description})</span>
            )}
          </div>
          
          {/* BMI Scale */}
          <div className="mt-3">
            <div className="flex items-center gap-1 text-xs">
              <div className="flex-1 bg-blue-200 h-2 rounded-l"></div>
              <div className="flex-1 bg-green-200 h-2"></div>
              <div className="flex-1 bg-yellow-200 h-2"></div>
              <div className="flex-1 bg-red-200 h-2 rounded-r"></div>
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>&lt;18.5</span>
              <span>18.5-25</span>
              <span>25-30</span>
              <span>&gt;30</span>
            </div>
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs text-gray-600">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              BMI is a screening tool and does not diagnose health. Consult with a healthcare provider for a complete health assessment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

