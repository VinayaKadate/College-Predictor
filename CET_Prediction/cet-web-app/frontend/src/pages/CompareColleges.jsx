import React, { useState, useEffect } from 'react';
import { Search, GitCompare, TrendingUp, X, Loader2, AlertCircle, BarChart3 } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api/compare';

export default function CompareColleges() {
  const [searchQuery, setSearchQuery] = useState('');
  const [colleges, setColleges] = useState([]);
  const [selectedColleges, setSelectedColleges] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState({ 
    search: false, 
    branches: false, 
    compare: false,
    initial: true 
  });
  const [error, setError] = useState('');

  // Load initial colleges on mount
  useEffect(() => {
    loadInitialColleges();
  }, []);

  // Load colleges when component mounts
  const loadInitialColleges = async () => {
    setLoading(prev => ({ ...prev, search: true, initial: true }));
    setError('');
    
    try {
      const res = await fetch(`${API_BASE}/colleges?query=`);
      if (!res.ok) throw new Error('Failed to load colleges');
      
      const data = await res.json();
      setColleges(data.colleges || data || []);
    } catch (err) {
      console.error('Error loading colleges:', err);
      setError('Failed to load colleges. Please check if the backend is running.');
    } finally {
      setLoading(prev => ({ ...prev, search: false, initial: false }));
    }
  };

  // Search colleges
  const handleSearch = async (query) => {
    setSearchQuery(query);
    
    // If query is too short, load all colleges
    if (query.length < 2 && query.length > 0) {
      return;
    }
    
    setLoading(prev => ({ ...prev, search: true }));
    setError('');
    
    try {
      const res = await fetch(`${API_BASE}/colleges?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search failed');
      
      const data = await res.json();
      setColleges(data.colleges || data || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search colleges');
    } finally {
      setLoading(prev => ({ ...prev, search: false }));
    }
  };

  // Select college
  const selectCollege = (college) => {
    // Check if already selected
    if (selectedColleges.find(c => c.college_code === college.college_code)) {
      setError('This college is already selected');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    // Check max limit
    if (selectedColleges.length >= 3) {
      setError('Maximum 3 colleges can be selected');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    const newSelection = [...selectedColleges, college];
    setSelectedColleges(newSelection);
    setSearchQuery('');
    setError('');
    setComparisonData(null);
    
    // Load branches when we have 2+ colleges
    if (newSelection.length >= 2) {
      loadBranches(newSelection.map(c => c.college_code));
    }
  };

  // Remove college
  const removeCollege = (code) => {
    const newSelection = selectedColleges.filter(c => c.college_code !== code);
    setSelectedColleges(newSelection);
    setComparisonData(null);
    setError('');
    
    if (newSelection.length < 2) {
      setBranches([]);
      setSelectedBranch('');
    } else {
      loadBranches(newSelection.map(c => c.college_code));
    }
  };

  // Load branches for selected colleges
  const loadBranches = async (codes) => {
    setLoading(prev => ({ ...prev, branches: true }));
    
    try {
      const res = await fetch(`${API_BASE}/branches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ college_codes: codes })
      });
      
      if (!res.ok) throw new Error('Failed to load branches');
      
      const data = await res.json();
      setBranches(data.branches || data || []);
      
      // Auto-select first branch if available
      if ((data.branches && data.branches.length > 0) || (data && data.length > 0)) {
        const firstBranch = data.branches?.[0] || data?.[0];
        setSelectedBranch(firstBranch.branch_code || firstBranch.code);
      }
    } catch (err) {
      console.error('Error loading branches:', err);
      setError('Failed to load branches');
    } finally {
      setLoading(prev => ({ ...prev, branches: false }));
    }
  };

  // Compare colleges - ✅ FIXED: Changed from /trend to /compare
  const handleCompare = async () => {
    // Validation
    if (selectedColleges.length < 2) {
      setError('Please select at least 2 colleges');
      return;
    }
    
    if (!selectedBranch) {
      setError('Please select a branch');
      return;
    }
    
    setLoading(prev => ({ ...prev, compare: true }));
    setError('');
    
    try {
      console.log('📡 Making request to:', `${API_BASE}/compare`);
      console.log('📦 Request payload:', {
        college_codes: selectedColleges.map(c => c.college_code),
        branch_code: selectedBranch
      });

      const res = await fetch(`${API_BASE}/compare`, {  // ✅ CHANGED: /trend → /compare
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          college_codes: selectedColleges.map(c => c.college_code),
          branch_code: selectedBranch
        })
      });
      
      console.log('📨 Response status:', res.status);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `HTTP ${res.status}: Comparison failed`);
      }
      
      const data = await res.json();
      console.log('✅ Success response:', data);
      
      if (data.success && data.data) {
        setComparisonData(data.data);
      } else if (data.error) {
        setError(data.error);
        setComparisonData(null);
      } else {
        setError('Failed to compare colleges - invalid response format');
        setComparisonData(null);
      }
    } catch (err) {
      console.error('Comparison error:', err);
      setError(err.message || 'Failed to compare colleges');
      setComparisonData(null);
    } finally {
      setLoading(prev => ({ ...prev, compare: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
              <GitCompare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Compare Colleges</h1>
              <p className="text-gray-600 text-sm mt-1">
                Compare cutoff percentile trends across multiple colleges
              </p>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm flex-1">{error}</p>
            <button 
              onClick={() => setError('')} 
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading Initial State */}
        {loading.initial ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-orange-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading colleges...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel - Selection */}
            <div className="space-y-6">
              {/* College Search */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 shadow-lg">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Search className="w-5 h-5 text-orange-600" />
                  Search Colleges
                </h2>
                
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by name or city..."
                    className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                  {loading.search && (
                    <Loader2 className="absolute right-3 top-3.5 w-5 h-5 text-orange-600 animate-spin" />
                  )}
                </div>

                {/* Search Results */}
                {colleges.length > 0 && searchQuery && (
                  <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar">
                    {colleges.map((college) => (
                      <button
                        key={college.college_code || college.code}
                        onClick={() => selectCollege(college)}
                        disabled={selectedColleges.find(c => c.college_code === (college.college_code || college.code))}
                        className="w-full text-left p-3 bg-gray-50 hover:bg-orange-50 rounded-xl transition-all border border-gray-100 hover:border-orange-200 disabled:opacity-50 disabled:cursor-not-allowed group"
                      >
                        <p className="font-medium text-gray-900 text-sm group-hover:text-orange-600 transition-colors">
                          {college.college_name || college.name}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {college.city || 'Unknown'} • {college.type || 'Unknown'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Colleges */}
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-between">
                    <span>Selected Colleges</span>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                      {selectedColleges.length}/3
                    </span>
                  </h3>
                  
                  <div className="space-y-2">
                    {selectedColleges.map((college, idx) => (
                      <div
                        key={college.college_code}
                        className="flex items-start gap-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100 animate-fade-in"
                      >
                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {college.college_name}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{college.city}</p>
                        </div>
                        <button
                          onClick={() => removeCollege(college.college_code)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Remove college"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    {selectedColleges.length === 0 && (
                      <div className="text-center py-8 px-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                          <GitCompare className="w-8 h-8 text-gray-400" />
                        </div>
                        <p className="text-sm text-gray-500">
                          Search and select 2-3 colleges to compare
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Branch Selection & Compare Button */}
              {selectedColleges.length >= 2 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 shadow-lg animate-fade-in">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-orange-600" />
                    Select Branch
                  </h2>
                  
                  {loading.branches ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
                      <span className="ml-2 text-gray-600">Loading branches...</span>
                    </div>
                  ) : (
                    <>
                      <select
                        value={selectedBranch}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all mb-4"
                      >
                        <option value="">-- Select a Branch --</option>
                        {branches.map((branch) => (
                          <option key={branch.branch_code || branch.code} value={branch.branch_code || branch.code}>
                            {branch.branch_name || branch.name}
                          </option>
                        ))}
                      </select>
                      
                      <button
                        onClick={handleCompare}
                        disabled={!selectedBranch || loading.compare}
                        className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading.compare ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Comparing...
                          </>
                        ) : (
                          <>
                            <GitCompare className="w-5 h-5" />
                            Compare Colleges
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Right Panel - Results */}
            <div className="lg:col-span-2">
              {comparisonData ? (
                <div className="space-y-6 animate-fade-in">
                  {/* Comparison Graph */}
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                        Cutoff Trends - {comparisonData.branch_name || comparisonData.branch_code}
                      </h2>
                    </div>
                    <ComparisonGraph data={comparisonData} />
                  </div>

                  {/* Key Insights */}
                  {comparisonData.insights && comparisonData.insights.length > 0 && (
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 shadow-lg">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h2>
                      <div className="space-y-3">
                        {comparisonData.insights.map((insight, idx) => (
                          <div
                            key={idx}
                            className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
                          >
                            <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailed Statistics */}
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-6 shadow-lg">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Statistics</h2>
                    <div className="space-y-4">
                      {comparisonData.comparison && comparisonData.comparison.map((college, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{college.college_name}</h3>
                              <p className="text-xs text-gray-600 mt-1">{college.city} • {college.type}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              college.analysis?.trend_direction === 'increasing' 
                                ? 'bg-red-100 text-red-700' 
                                : college.analysis?.trend_direction === 'decreasing'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {college.analysis?.trend_direction || 'stable'}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <div className="bg-white p-3 rounded-lg">
                              <p className="text-gray-600 text-xs mb-1">Starting Percentile</p>
                              <p className="font-semibold text-gray-900">{college.analysis?.start_value || 'N/A'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                              <p className="text-gray-600 text-xs mb-1">Current Percentile</p>
                              <p className="font-semibold text-gray-900">{college.analysis?.end_value || 'N/A'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                              <p className="text-gray-600 text-xs mb-1">Change</p>
                              <p className={`font-semibold ${
                                college.analysis?.change > 0 ? 'text-red-600' : 
                                college.analysis?.change < 0 ? 'text-green-600' : 
                                'text-gray-600'
                              }`}>
                                {college.analysis?.change > 0 ? '+' : ''}{college.analysis?.change || 0}
                              </p>
                            </div>
                            <div className="bg-white p-3 rounded-lg">
                              <p className="text-gray-600 text-xs mb-1">Average</p>
                              <p className="font-semibold text-gray-900">
                                {college.trend && college.trend.length > 0 
                                  ? (college.trend.reduce((sum, t) => sum + t.value, 0) / college.trend.length).toFixed(2)
                                  : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 p-12 shadow-lg text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <GitCompare className="w-10 h-10 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready to Compare</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Select 2-3 colleges, choose a branch, and click "Compare Colleges" to see detailed percentile trends and insights
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f97316;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #ea580c;
        }
      `}</style>
    </div>
  );
}

// Comparison Graph Component
function ComparisonGraph({ data }) {
  if (!data || !data.comparison || data.comparison.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No comparison data available
      </div>
    );
  }

  const colors = ['#f97316', '#3b82f6', '#10b981'];
  const colleges = data.comparison;
  
  // Extract all years from trend data
  const allYears = [...new Set(
    colleges.flatMap(c => 
      (c.trend || []).map(t => t.year)
    )
  )].sort((a, b) => a - b);
  
  if (allYears.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No trend data available
      </div>
    );
  }
  
  // Calculate min/max for scaling
  const allValues = colleges.flatMap(c => 
    (c.trend || []).map(t => t.value)
  );
  const minVal = Math.floor(Math.min(...allValues) - 2);
  const maxVal = Math.ceil(Math.max(...allValues) + 2);
  const range = maxVal - minVal || 1;
  
  const graphHeight = 320;
  const graphWidth = 700;
  const padding = { left: 60, right: 30, top: 20, bottom: 60 };
  const chartWidth = graphWidth - padding.left - padding.right;
  const chartHeight = graphHeight - padding.top - padding.bottom;

  return (
    <div className="space-y-6">
      {/* Graph */}
      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 overflow-x-auto">
        <svg width={graphWidth} height={graphHeight} className="mx-auto">
          {/* Grid lines and Y-axis labels */}
          {[0, 25, 50, 75, 100].map((percent, i) => {
            const value = minVal + (percent / 100) * range;
            const y = padding.top + chartHeight - (percent / 100) * chartHeight;
            
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={graphWidth - padding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600 font-medium"
                >
                  {value.toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Lines and points for each college */}
          {colleges.map((college, collegeIdx) => {
            const trend = college.trend || [];
            const points = trend.map((point, i) => {
              const x = padding.left + (i / (trend.length - 1)) * chartWidth;
              const normalized = ((point.value - minVal) / range) * chartHeight;
              const y = padding.top + chartHeight - normalized;
              return { x, y, value: point.value, year: point.year };
            });

            const pathD = points
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
              .join(' ');

            return (
              <g key={collegeIdx}>
                {/* Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={colors[collegeIdx]}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Points */}
                {points.map((p, i) => (
                  <g key={i}>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="6"
                      fill="white"
                      stroke={colors[collegeIdx]}
                      strokeWidth="2.5"
                      className="hover:r-8 transition-all cursor-pointer"
                    />
                    <title>
                      {college.college_name}
                      {'\n'}Year: {p.year}
                      {'\n'}Percentile: {p.value}%
                    </title>
                  </g>
                ))}
              </g>
            );
          })}

          {/* X-axis labels (Years) */}
          {allYears.map((year, i) => {
            const x = padding.left + (i / (allYears.length - 1)) * chartWidth;
            return (
              <text
                key={i}
                x={x}
                y={graphHeight - padding.bottom + 25}
                textAnchor="middle"
                className="text-sm fill-gray-700 font-semibold"
              >
                {year}
              </text>
            );
          })}

          {/* Axis labels */}
          <text
            x={padding.left / 2}
            y={graphHeight / 2}
            transform={`rotate(-90, ${padding.left / 2}, ${graphHeight / 2})`}
            textAnchor="middle"
            className="text-sm fill-gray-700 font-semibold"
          >
            Percentile (%)
          </text>
          <text
            x={graphWidth / 2}
            y={graphHeight - 10}
            textAnchor="middle"
            className="text-sm fill-gray-700 font-semibold"
          >
            Year
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {colleges.map((college, idx) => (
          <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
            <div
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: colors[idx] }}
            />
            <span className="text-sm text-gray-700 font-medium">
              {college.college_name.length > 40
                ? college.college_name.substring(0, 40) + '...'
                : college.college_name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}