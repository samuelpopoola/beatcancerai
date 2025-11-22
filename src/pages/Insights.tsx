import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, Heart, Thermometer, Zap, CheckCircle, AlertCircle } from 'lucide-react';

interface SymptomEntry {
  date: string;
  pain: number;
  fatigue: number;
  nausea: number;
  mood: number;
}

const Insights: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<string>('pain');
  const [timeRange, setTimeRange] = useState<string>('7days');

  const symptomData: SymptomEntry[] = [
    { date: '2025-10-22', pain: 3, fatigue: 6, nausea: 2, mood: 7 },
    { date: '2025-10-23', pain: 4, fatigue: 7, nausea: 3, mood: 6 },
    { date: '2025-10-24', pain: 2, fatigue: 5, nausea: 1, mood: 8 },
    { date: '2025-10-25', pain: 3, fatigue: 6, nausea: 2, mood: 7 },
    { date: '2025-10-26', pain: 2, fatigue: 4, nausea: 1, mood: 8 },
    { date: '2025-10-27', pain: 3, fatigue: 5, nausea: 2, mood: 7 },
    { date: '2025-10-28', pain: 2, fatigue: 4, nausea: 1, mood: 9 },
  ];

  const labResults = [
    { test: 'White Blood Cells', value: '4.5', unit: 'K/uL', range: '4.0-11.0', status: 'normal' },
    { test: 'Hemoglobin', value: '12.1', unit: 'g/dL', range: '12.0-16.0', status: 'normal' },
    { test: 'Platelets', value: '180', unit: 'K/uL', range: '150-400', status: 'normal' },
    { test: 'Neutrophils', value: '2.8', unit: 'K/uL', range: '2.0-7.0', status: 'normal' },
  ];

  const guidelineAdherence = [
    {
      category: 'Screening & Surveillance',
      status: 'complete',
      items: [
        { name: 'Baseline CT Scan', completed: true },
        { name: 'Genetic Testing', completed: true },
        { name: 'Cardiac Function Assessment', completed: true },
      ],
    },
    {
      status: 'on-track',
      items: [
        { name: 'Chemotherapy Cycles', completed: true },
        { name: 'Pre-treatment Lab Work', completed: true },
        { name: 'Symptom Management', completed: true },
      ],
    },
    {
      category: 'Supportive Care',
      status: 'needs-attention',
      items: [
        { name: 'Nutritional Counseling', completed: true },
        { name: 'Physical Activity Plan', completed: false },
        { name: 'Psychosocial Support', completed: false },
      ],
    },
  ];

  const getAverageSymptom = (metric: keyof Omit<SymptomEntry, 'date'>) => {
    const sum = symptomData.reduce((acc, entry) => acc + entry[metric], 0);
    return (sum / symptomData.length).toFixed(1);
  };

  const getTrend = (metric: keyof Omit<SymptomEntry, 'date'>) => {
    if (symptomData.length < 2) return 'stable';
    const recent = symptomData.slice(-3);
    const older = symptomData.slice(0, 3);
    const recentAvg = recent.reduce((acc, entry) => acc + entry[metric], 0) / recent.length;
    const olderAvg = older.reduce((acc, entry) => acc + entry[metric], 0) / older.length;

    if (metric === 'mood') {
      return recentAvg > olderAvg ? 'improving' : recentAvg < olderAvg ? 'declining' : 'stable';
    }
    return recentAvg < olderAvg ? 'improving' : recentAvg > olderAvg ? 'declining' : 'stable';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Insights & Metrics</h1>
        <p className="text-gray-600 mt-1">
          Track your progress and identify patterns in your treatment journey
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Pain', metric: 'pain', icon: Activity, color: 'red' },
          { label: 'Fatigue', metric: 'fatigue', icon: Zap, color: 'orange' },
          { label: 'Nausea', metric: 'nausea', icon: Thermometer, color: 'yellow' },
          { label: 'Mood', metric: 'mood', icon: Heart, color: 'green' },
        ].map((item) => {
          const Icon = item.icon;
          const avg = getAverageSymptom(item.metric as keyof Omit<SymptomEntry, 'date'>);
              const trend = getTrend(item.metric as keyof Omit<SymptomEntry, 'date'>);

                return (
                <button
              key={item.metric}
              onClick={() => setSelectedMetric(item.metric)}
              className={`p-4 rounded-xl text-left transition-all ${
                selectedMetric === item.metric
                  ? 'bg-white shadow-lg ring-2 ring-blue-500'
                  : 'bg-white shadow-md hover:shadow-lg'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    item.color === 'red'
                      ? 'bg-red-100 text-red-600'
                      : item.color === 'orange'
                      ? 'bg-orange-100 text-orange-600'
                      : item.color === 'yellow'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-green-100 text-green-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                {trend === 'improving' ? (
                  <TrendingDown className="w-5 h-5 text-green-600" />
                ) : trend === 'declining' ? (
                  <TrendingUp className="w-5 h-5 text-red-600" />
                ) : null}
                </div>
              <div className="text-2xl font-bold text-gray-800 mb-1">{avg}/10</div>
              <div className="text-sm text-gray-600">{item.label}</div>
              <div
                className={`text-xs mt-2 ${
                  trend === 'improving'
                    ? 'text-green-600'
                    : trend === 'declining'
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {trend === 'improving'
                  ? 'Improving'
                  : trend === 'declining'
                  ? 'Needs attention'
                  : 'Stable'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Symptom Trends</h2>
          <div className="flex space-x-2">
            {['7days', '30days', '90days'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        <div className="h-64 flex items-end justify-between space-x-2">
          {symptomData.map((entry, index) => {
            const value = entry[selectedMetric as keyof Omit<SymptomEntry, 'date'>];
            const height = (value / 10) * 100;

            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    selectedMetric === 'pain'
                      ? 'bg-red-500'
                      : selectedMetric === 'fatigue'
                      ? 'bg-orange-500'
                      : selectedMetric === 'nausea'
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${value}/10`}
                ></div>
                <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-top-left">
                  {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Pattern Detected:</strong> Your {selectedMetric} levels tend to be higher 2-3 days
            after treatment. Consider adjusting medication timing with your care team.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Recent Lab Results</h2>
          <div className="space-y-4">
            {labResults.map((result, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{result.test}</h3>
                  <p className="text-sm text-gray-600">Normal range: {result.range}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-gray-800 mr-2">
                      {result.value} {result.unit}
                    </span>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-gray-600">
            Last updated: October 26, 2025
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Clinical Guideline Adherence</h2>
          <div className="space-y-4">
            {guidelineAdherence.map((category, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">{category.category}</h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      category.status === 'complete'
                        ? 'bg-green-100 text-green-700'
                        : category.status === 'on-track'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {category.status === 'complete'
                      ? 'Complete'
                      : category.status === 'on-track'
                      ? 'On Track'
                      : 'Needs Attention'}
                  </span>
                </div>
                <div className="space-y-2">
                  {category.items.map((item, itemIndex) => (
                    <div key={itemIndex} className="flex items-center text-sm">
                      {item.completed ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-yellow-600 mr-2" />
                      )}
                      <span className={item.completed ? 'text-gray-600' : 'text-gray-800 font-medium'}>
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <div className="ml-4">
            <h3 className="text-xl font-bold mb-2">Treatment Progress Summary</h3>
            <p className="text-blue-100 mb-4">
              Based on your data and clinical guidelines, your treatment is progressing well. Your symptom
              management is effective, and all key screening milestones have been met.
            </p>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span>Lab values stable</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span>Guidelines followed</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span>Symptoms managed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Insights;
