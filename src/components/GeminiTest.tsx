// src/components/GeminiTest.tsx
import React, { useState } from 'react';
import { geminiMedicalService } from '../services/geminiMedicalService';

const GeminiTest: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const runTest = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      console.log('🧪 Starting Gemini test...');
      
      const testText = "Patient with Stage II breast cancer, ER positive, HER2 negative. Tumor size 2.5cm.";
      const userContext = {
        cancer_type: "Breast Cancer",
        cancer_stage: "II",
        age: 52,
        gender: "female",
        treatment_goal: "curative"
      };
      
      console.log('📤 Sending test request to Gemini...');
      const analysis = await geminiMedicalService.analyzeMedicalDocument(testText, userContext);
      
      console.log('✅ Gemini test successful:', analysis);
      setResult(analysis);
      
    } catch (err: any) {
      console.error('❌ Gemini test failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto mt-6">
      <h2 className="text-2xl font-bold mb-4 text-blue-800">Gemini AI Integration Test</h2>
      
      <div className="mb-4 p-3 bg-green-100 border border-green-400 rounded">
        <p className="text-green-800">
          <strong>✅ Environment Check:</strong> VITE_GEMINI_API_KEY is loaded
        </p>
      </div>
      
      <button
        onClick={runTest}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded disabled:bg-gray-400 transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Testing Gemini AI...
          </span>
        ) : (
          'Test Gemini AI Integration'
        )}
      </button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <h3 className="font-bold text-lg mb-2">Test Failed</h3>
          <p><strong>Error:</strong> {error}</p>
          <div className="mt-2 text-sm">
            <p>Common solutions:</p>
            <ul className="list-disc list-inside mt-1">
              <li>Check if your Gemini API key is valid</li>
              <li>Verify internet connection</li>
              <li>Check Google AI Studio for quota issues</li>
            </ul>
          </div>
        </div>
      )}
      
      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="font-bold text-lg mb-2 text-green-800">✅ Test Successful!</h3>
          <p className="text-green-700 mb-3">Gemini AI is working correctly.</p>
          
          <div className="bg-white p-3 rounded border">
            <h4 className="font-semibold mb-2">Response Preview:</h4>
            <div className="max-w-full max-h-72 overflow-auto bg-gray-100 p-2 rounded">
              <pre className="text-xs font-mono">{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeminiTest;