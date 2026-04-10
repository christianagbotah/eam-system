'use client';

import { useState } from 'react';

const API_BASE = '/api/v1/eam';

export default function SkillSearch() {
  const [skill, setSkill] = useState('');
  const [level, setLevel] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const searchTechnicians = async () => {
    if (!skill) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ skill });
      if (level) params.append('level', level);
      
      const res = await fetch(`${API_BASE}/technicians/search-by-skill?${params}`);
      const data = await res.json();
      setResults(data.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">🇬🇭 Search Technicians by Skill</h3>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Skill</label>
          <input
            type="text"
            placeholder="e.g., Electrical, Mechanical"
            className="w-full px-3 py-2 border rounded"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Proficiency Level</label>
          <select
            className="w-full px-3 py-2 border rounded"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
            <option value="expert">Expert</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={searchTechnicians}
            disabled={!skill || loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold">Found {results.length} technician(s)</h4>
          {results.map((tech) => (
            <div key={tech.technician_id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">{tech.username || `Technician #${tech.technician_id}`}</div>
                  <div className="text-sm text-gray-600">
                    Skill: {tech.skill_name} | Level: {tech.proficiency_level}
                  </div>
                  {tech.years_experience > 0 && (
                    <div className="text-sm text-gray-600">
                      Experience: {tech.years_experience} years
                    </div>
                  )}
                  {tech.certified && (
                    <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      ✓ Certified
                    </span>
                  )}
                </div>
                <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                  Assign
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length === 0 && skill && !loading && (
        <div className="text-center text-gray-500 py-8">
          No technicians found with this skill
        </div>
      )}
    </div>
  );
}
