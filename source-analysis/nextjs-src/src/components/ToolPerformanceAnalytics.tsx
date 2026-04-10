import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface UsagePattern {
  id: number;
  name: string;
  code: string;
  category: string;
  total_requests: number;
  avg_usage_days: number;
  overdue_count: number;
  last_used: string;
}

interface EfficiencyData {
  id: number;
  name: string;
  code: string;
  usage_count: number;
  on_time_return_rate: number;
  damage_incidents: number;
  cost_per_use: number;
}

const ToolPerformanceAnalytics: React.FC = () => {
  const [usagePatterns, setUsagePatterns] = useState<UsagePattern[]>([]);
  const [efficiency, setEfficiency] = useState<EfficiencyData[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [optimization, setOptimization] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('usage');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [usageRes, efficiencyRes, trendsRes, optimizationRes] = await Promise.all([
        fetch('/factorymanager/public/index.php/api/v1/eam/tool-performance/usage-patterns', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/factorymanager/public/index.php/api/v1/eam/tool-performance/efficiency', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/factorymanager/public/index.php/api/v1/eam/tool-performance/trends', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/factorymanager/public/index.php/api/v1/eam/tool-performance/optimization', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      const [usageData, efficiencyData, trendsData, optimizationData] = await Promise.all([
        usageRes.json(),
        efficiencyRes.json(),
        trendsRes.json(),
        optimizationRes.json()
      ]);

      if (usageData.status === 'success') setUsagePatterns(usageData.data);
      if (efficiencyData.status === 'success') setEfficiency(efficiencyData.data);
      if (trendsData.status === 'success') setTrends(trendsData.data);
      if (optimizationData.status === 'success') setOptimization(optimizationData.data);

    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Tool Performance Analytics</h1>
        
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
          {[
            { key: 'usage', label: 'Usage Patterns' },
            { key: 'efficiency', label: 'Efficiency' },
            { key: 'trends', label: 'Trends' },
            { key: 'optimization', label: 'Optimization' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === tab.key 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'usage' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Tool Usage Frequency</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={usagePatterns.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="code" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total_requests" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Average Usage Duration</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={usagePatterns.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="code" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avg_usage_days" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Top Usage by Category</h3>
              <div className="space-y-3">
                {usagePatterns.slice(0, 5).map((tool, index) => (
                  <div key={tool.id} className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{tool.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({tool.category})</span>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {tool.total_requests} uses
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'efficiency' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Avg Return Rate</h3>
              <p className="text-2xl font-bold text-green-600">
                {efficiency.length > 0 ? Math.round(efficiency.reduce((sum, tool) => sum + tool.on_time_return_rate, 0) / efficiency.length) : 0}%
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Damage Incidents</h3>
              <p className="text-2xl font-bold text-red-600">
                {efficiency.reduce((sum, tool) => sum + tool.damage_incidents, 0)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Avg Cost Per Use</h3>
              <p className="text-2xl font-bold text-blue-600">
                ${efficiency.length > 0 ? (efficiency.reduce((sum, tool) => sum + tool.cost_per_use, 0) / efficiency.length).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Tool Efficiency Metrics</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tool</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Damage Incidents</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost/Use</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {efficiency.slice(0, 10).map(tool => (
                    <tr key={tool.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{tool.name}</div>
                        <div className="text-sm text-gray-500">{tool.code}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tool.usage_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          tool.on_time_return_rate >= 90 ? 'bg-green-100 text-green-800' :
                          tool.on_time_return_rate >= 70 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {Math.round(tool.on_time_return_rate)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tool.damage_incidents}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${tool.cost_per_use.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">30-Day Usage Trends</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="requests" stroke="#3B82F6" name="Requests" />
              <Line type="monotone" dataKey="returns" stroke="#10B981" name="Returns" />
              <Line type="monotone" dataKey="overdue" stroke="#EF4444" name="Overdue" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {activeTab === 'optimization' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-orange-600">Underutilized Tools</h3>
              <div className="space-y-3">
                {optimization.underutilized?.slice(0, 5).map((tool: any) => (
                  <div key={tool.id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{tool.name}</div>
                      <div className="text-sm text-gray-500">{tool.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-orange-600">{tool.usage_count} uses</div>
                      <div className="text-xs text-gray-500">{tool.days_since_last_use}d ago</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-600">High Demand Tools</h3>
              <div className="space-y-3">
                {optimization.high_demand?.slice(0, 5).map((tool: any) => (
                  <div key={tool.id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{tool.name}</div>
                      <div className="text-sm text-gray-500">{tool.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-red-600">{tool.requests} requests</div>
                      <div className="text-xs text-gray-500">{tool.pending_requests} pending</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-purple-600">Maintenance Heavy</h3>
              <div className="space-y-3">
                {optimization.maintenance_heavy?.slice(0, 5).map((tool: any) => (
                  <div key={tool.id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{tool.name}</div>
                      <div className="text-sm text-gray-500">{tool.code}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-purple-600">{tool.maintenance_count} services</div>
                      <div className="text-xs text-gray-500">${tool.total_maintenance_cost}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolPerformanceAnalytics;