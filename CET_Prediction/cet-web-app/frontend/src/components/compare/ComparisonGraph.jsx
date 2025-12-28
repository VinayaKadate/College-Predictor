import React from 'react';

export default function ComparisonGraph({ data }) {
  if (!data || !data.comparison || data.comparison.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No comparison data available
      </div>
    );
  }

  const colors = ['#f97316', '#3b82f6', '#10b981'];
  const colleges = data.comparison;
  
  console.log('📊 Graph data received:', colleges);
  
  // Extract all years from trend data with validation
  const allYears = [];
  colleges.forEach(college => {
    if (college.trend && Array.isArray(college.trend)) {
      college.trend.forEach(trend => {
        if (trend.year !== undefined && trend.year !== null && !isNaN(trend.year)) {
          allYears.push(Number(trend.year));
        }
      });
    }
  });
  
  const uniqueYears = [...new Set(allYears)].sort((a, b) => a - b);
  
  console.log('📅 Unique years:', uniqueYears);
  
  if (uniqueYears.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No valid trend data available. Check if CSV has year data.
      </div>
    );
  }
  
  // Calculate min/max for scaling with validation
  let allValues = [];
  colleges.forEach(college => {
    if (college.trend && Array.isArray(college.trend)) {
      college.trend.forEach(trend => {
        if (trend.value !== undefined && trend.value !== null && !isNaN(trend.value)) {
          allValues.push(Number(trend.value));
        }
      });
    }
  });
  
  console.log('📈 All values:', allValues);
  
  if (allValues.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No valid percentile values found in data
      </div>
    );
  }
  
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = Math.max(maxVal - minVal, 1); // Ensure range is at least 1
  
  console.log(`📊 Min: ${minVal}, Max: ${maxVal}, Range: ${range}`);
  
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
          {/* Y-axis labels */}
          <text
            x={padding.left / 2}
            y={graphHeight / 2}
            transform={`rotate(-90, ${padding.left / 2}, ${graphHeight / 2})`}
            textAnchor="middle"
            className="text-sm fill-gray-700 font-semibold"
          >
            Percentile (%)
          </text>
          
          {/* Grid lines and Y-axis values */}
          {[minVal, minVal + range/4, minVal + range/2, minVal + 3*range/4, maxVal].map((value, i) => {
            const y = padding.top + chartHeight - ((value - minVal) / range) * chartHeight;
            
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
                  {value.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Lines and points for each college */}
          {colleges.map((college, collegeIdx) => {
            const trend = college.trend || [];
            
            // Filter and sort valid trend points
            const validPoints = trend
              .filter(t => 
                t.year !== undefined && t.year !== null && !isNaN(t.year) &&
                t.value !== undefined && t.value !== null && !isNaN(t.value)
              )
              .map(t => ({
                year: Number(t.year),
                value: Number(t.value),
                originalIndex: trend.indexOf(t)
              }))
              .sort((a, b) => a.year - b.year);
            
            console.log(`🏫 College ${collegeIdx} valid points:`, validPoints);
            
            if (validPoints.length === 0) {
              return null;
            }

            const points = validPoints.map((point, i) => {
              const yearIndex = uniqueYears.indexOf(point.year);
              const x = yearIndex >= 0 
                ? padding.left + (yearIndex / Math.max(uniqueYears.length - 1, 1)) * chartWidth
                : padding.left + (i / Math.max(validPoints.length - 1, 1)) * chartWidth;
              
              const normalized = ((point.value - minVal) / range) * chartHeight;
              const y = padding.top + chartHeight - normalized;
              
              return { 
                x, 
                y, 
                value: point.value, 
                year: point.year,
                isValid: !isNaN(x) && !isNaN(y)
              };
            });

            // Filter out invalid points for path
            const validPathPoints = points.filter(p => p.isValid);
            
            if (validPathPoints.length < 2) {
              return null;
            }

            const pathD = validPathPoints
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
                {validPathPoints.map((p, i) => (
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
          {uniqueYears.map((year, i) => {
            const x = padding.left + (i / Math.max(uniqueYears.length - 1, 1)) * chartWidth;
            
            return (
              <g key={i}>
                <text
                  x={x}
                  y={graphHeight - padding.bottom + 25}
                  textAnchor="middle"
                  className="text-sm fill-gray-700 font-semibold"
                >
                  {year}
                </text>
                <line
                  x1={x}
                  y1={graphHeight - padding.bottom}
                  x2={x}
                  y2={graphHeight - padding.bottom + 5}
                  stroke="#374151"
                  strokeWidth="2"
                />
              </g>
            );
          })}

          {/* X-axis label */}
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
              {college.college_name?.length > 40
                ? college.college_name.substring(0, 40) + '...'
                : college.college_name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}