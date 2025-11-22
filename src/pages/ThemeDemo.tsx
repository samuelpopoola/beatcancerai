import React from 'react';
import ThemeToggle from '../components/ThemeToggle';

const ThemeDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-8">
      <div className="card max-w-xl w-full text-center">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Theme Demo</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">Use the toggle to switch between light and dark themes. This page demonstrates cards, buttons and alerts under both themes.</p>

        <div className="space-y-4">
          <button className="btn-primary w-full">Primary Action</button>
          <div className="p-4 bg-blue-50 rounded-lg">Info alert (blue)</div>
          <div className="p-4 bg-green-50 rounded-lg">Success alert (green)</div>
        </div>
      </div>
    </div>
  );
};

export default ThemeDemo;
