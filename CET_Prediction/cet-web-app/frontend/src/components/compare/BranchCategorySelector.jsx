import React from 'react';
import { Loader2, BookOpen, Tag } from 'lucide-react';

export default function BranchCategorySelector({
  branches,
  selectedBranch,
  onBranchChange,
  selectedCategory,
  onCategoryChange,
  metric,
  onMetricChange,
  loading,
  disabled
}) {
  const categories = [
    { value: 'OPEN', label: 'OPEN', color: 'from-blue-500 to-blue-600' },
    { value: 'OBC', label: 'OBC', color: 'from-green-500 to-green-600' },
    { value: 'SC', label: 'SC', color: 'from-purple-500 to-purple-600' },
    { value: 'ST', label: 'ST', color: 'from-pink-500 to-pink-600' },
    { value: 'EWS', label: 'EWS', color: 'from-indigo-500 to-indigo-600' },
    { value: 'TFWS', label: 'TFWS', color: 'from-orange-500 to-orange-600' }
  ];

  const metrics = [
    { value: 'closing_percentile', label: 'Percentile' },
    { value: 'closing_rank', label: 'Rank' }
  ];

  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 p-6 shadow-lg">
      <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-orange-600" />
        Comparison Settings
      </h2>

      {/* Branch Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
          Select Branch
        </label>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
            <span className="ml-2 text-sm text-gray-600">Loading branches...</span>
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-6 px-4 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">
              Select at least 2 colleges to view available branches
            </p>
          </div>
        ) : (
          <select
            value={selectedBranch}
            onChange={(e) => onBranchChange(e.target.value)}
            disabled={disabled}
            className="w-full px-4 py-3.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 font-medium"
          >
            <option value="">Choose a branch...</option>
            {branches.map((branch) => (
              <option key={branch.branch_code} value={branch.branch_code}>
                {branch.branch_name}
              </option>
            ))}
          </select>
        )}
        
        {branches.length > 0 && (
          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1">
            <Tag className="w-3 h-3" />
            {branches.length} branch{branches.length !== 1 ? 'es' : ''} available
          </p>
        )}
      </div>

      {/* Category Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
          Select Category
        </label>
        
        <div className="grid grid-cols-3 gap-2.5">
          {categories.map((category) => (
            <button
              key={category.value}
              onClick={() => onCategoryChange(category.value)}
              disabled={disabled}
              className={`px-3 py-3 rounded-xl text-sm font-semibold transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedCategory === category.value
                  ? `bg-gradient-to-r ${category.color} text-white shadow-lg`
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
        
        <p className="mt-2 text-xs text-gray-500">
          Selected: <span className="font-semibold text-gray-700">{selectedCategory}</span>
        </p>
      </div>

      {/* Metric Toggle */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
          Display Metric
        </label>
        
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metricOption) => (
            <button
              key={metricOption.value}
              onClick={() => onMetricChange(metricOption.value)}
              disabled={disabled}
              className={`px-4 py-3.5 rounded-xl text-sm font-semibold transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                metric === metricOption.value
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {metricOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <p className="text-xs text-gray-700 leading-relaxed">
          <span className="font-semibold text-blue-700">💡 Tip:</span> Lower percentile values indicate more competitive cutoffs. 
          Compare trends across years to identify which colleges are becoming more or less competitive.
        </p>
      </div>
    </div>
  );
}