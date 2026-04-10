'use client';

import { useState, useEffect } from 'react';
import { Clock, Play, Pause, Square, Coffee, Activity } from 'lucide-react';
import api from '@/lib/api';
import { alert } from '@/components/AlertModalProvider';

interface TimeLog {
  id: number;
  clock_in: string;
  clock_out?: string;
  actual_hours?: number;
  activity_description?: string;
  work_type: string;
  status: string;
  technician_name: string;
}

export default function TimeTracker({ workOrderId }: { workOrderId: string }) {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pausedTime, setPausedTime] = useState(0);
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [activityDesc, setActivityDesc] = useState('');
  const [workType, setWorkType] = useState('repair');
  const [breakDuration, setBreakDuration] = useState(0);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [showTeamTimeModal, setShowTeamTimeModal] = useState(false);
  const [teamTimeData, setTeamTimeData] = useState<any[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);

  // Load timer state from localStorage on mount
  useEffect(() => {
    // Always check database for active logs (source of truth)
    checkActiveLog();
  }, [workOrderId]);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    if (isActive || startTime) {
      localStorage.setItem(`timer_${workOrderId}`, JSON.stringify({
        isActive,
        isPaused,
        startTime
      }));
    } else {
      localStorage.removeItem(`timer_${workOrderId}`);
    }
  }, [isActive, isPaused, startTime, workOrderId]);

  useEffect(() => {
    loadLogs();
    loadSummary();
    loadTeamMembers();
  }, [workOrderId]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && !isPaused) {
      interval = setInterval(() => {
        if (startTime) {
          setTime(Math.floor((Date.now() - startTime) / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, isPaused, startTime]);

  const checkActiveLog = async () => {
    try {
      const res = await api.get(`/maintenance/work-orders/${workOrderId}/time-logs`);
      const logsData = res.data?.data?.logs || res.data?.data || [];
      const activeLogs = Array.isArray(logsData) ? logsData.filter((l: any) => l.status === 'active' || l.status === 'paused') : [];
      
      console.log('Active logs found:', activeLogs);
      
      if (activeLogs?.length > 0) {
        const log = activeLogs[0];
        const logStartTime = new Date(log.clock_in).getTime();
        const elapsed = Math.floor((Date.now() - logStartTime) / 1000);
        
        console.log('Timer state:', { logStartTime, elapsed, status: log.status });
        
        setIsActive(true);
        setIsPaused(log.status === 'paused');
        setTime(elapsed);
        setPausedTime(elapsed);
        
        // Adjust startTime so timer continues from current elapsed time
        setStartTime(Date.now() - (elapsed * 1000));
      } else {
        console.log('No active or paused logs found');
      }
    } catch (error) {
      console.error('Failed to check active log:', error);
    }
  };

  const loadLogs = async () => {
    try {
      const res = await api.get(`/maintenance/work-orders/${workOrderId}/time-logs`);
      const logsData = res.data?.data?.logs || res.data?.data || [];
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (error) {
      console.error('Failed to load logs');
      setLogs([]);
    }
  };

  const loadSummary = async () => {
    try {
      const res = await api.get(`/maintenance/work-orders/${workOrderId}/time-logs/summary`);
      setSummary(res.data?.data);
    } catch (error) {
      console.error('Failed to load summary');
    }
  };

  const loadTeamMembers = async () => {
    try {
      const res = await api.get(`/work-orders/${workOrderId}`);
      const wo = res.data?.data;
      const members = wo?.team_members || [];
      setTeamMembers(members);
    } catch (error) {
      console.error('Failed to load team members');
    }
  };

  const handleStart = async () => {
    setIsStarting(true);
    try {
      await api.post(`/maintenance/work-orders/${workOrderId}/time-logs/start`);
      const now = Date.now();
      setStartTime(now);
      setIsActive(true);
      setIsPaused(false);
      setTime(0);
      alert.success('Success', 'Time tracking started');
      loadLogs();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to start timer');
    } finally {
      setIsStarting(false);
    }
  };

  const handlePause = async () => {
    setIsPausing(true);
    try {
      await api.post(`/maintenance/work-orders/${workOrderId}/time-logs/pause`);
      const currentElapsed = Math.floor((Date.now() - (startTime || 0)) / 1000);
      setPausedTime(currentElapsed);
      setIsPaused(true);
      alert.success('Success', 'Time tracking paused');
      await loadLogs();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to pause timer');
    } finally {
      setIsPausing(false);
    }
  };

  const handleResume = async () => {
    setIsResuming(true);
    try {
      await api.post(`/maintenance/work-orders/${workOrderId}/time-logs/resume`);
      setStartTime(Date.now() - (pausedTime * 1000));
      setIsPaused(false);
      alert.success('Success', 'Time tracking resumed');
      await loadLogs();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to resume timer');
    } finally {
      setIsResuming(false);
    }
  };

  const handleStop = async () => {
    if (!activityDesc.trim()) {
      alert.error('Required', 'Please describe the activity performed');
      return;
    }

    setIsStopping(true);
    try {
      await api.post(`/maintenance/work-orders/${workOrderId}/time-logs/stop`, {
        activity_description: activityDesc,
        work_type: workType,
        break_duration: breakDuration
      });
      setIsActive(false);
      setIsPaused(false);
      setTime(0);
      setStartTime(null);
      setPausedTime(0);
      setActivityDesc('');
      setBreakDuration(0);
      setWorkType('repair');
      setShowStopDialog(false);
      alert.success('Success', 'Time log completed');
      await loadLogs();
      await loadSummary();
      await checkActiveLog();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to stop timer');
    } finally {
      setIsStopping(false);
    }
  };

  const handleOpenTeamTime = () => {
    const initialData = teamMembers.map(member => ({
      technician_id: member.technician_id || member.user_id,
      technician_name: member.technician_name || member.name,
      clock_in: '',
      clock_out: '',
      break_minutes: 0,
      work_type: 'repair',
      activity_description: ''
    }));
    setTeamTimeData(initialData);
    setShowTeamTimeModal(true);
  };

  const handleSaveTeamTime = async () => {
    const validEntries = teamTimeData.filter(entry => entry.clock_in && entry.clock_out && entry.activity_description);
    
    if (validEntries.length === 0) {
      alert.error('Required', 'Please fill in at least one team member time entry');
      return;
    }

    try {
      for (const entry of validEntries) {
        // Calculate actual hours
        const clockIn = new Date(entry.clock_in).getTime();
        const clockOut = new Date(entry.clock_out).getTime();
        const totalSeconds = (clockOut - clockIn) / 1000;
        const actualHours = (totalSeconds - (entry.break_minutes * 60)) / 3600;

        await api.post(`/maintenance/work-orders/${workOrderId}/time-logs/manual`, {
          technician_id: entry.technician_id,
          clock_in: entry.clock_in,
          clock_out: entry.clock_out,
          break_duration: entry.break_minutes,
          work_type: entry.work_type,
          activity_description: entry.activity_description,
          actual_hours: Math.round(actualHours * 100) / 100
        });
      }
      alert.success('Success', `Time logged for ${validEntries.length} team member(s)`);
      setShowTeamTimeModal(false);
      loadLogs();
      loadSummary();
    } catch (error: any) {
      alert.error('Error', error.response?.data?.message || 'Failed to save team time');
    }
  };

  const updateTeamMember = (index: number, field: string, value: any) => {
    const updated = [...teamTimeData];
    updated[index] = { ...updated[index], [field]: value };
    setTeamTimeData(updated);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + 
           ', ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Team Time Entry Button */}
      {teamMembers.length > 0 && (
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-1">👥 Team Time Entry</h3>
              <p className="text-purple-100 text-sm">Log work hours for all team members</p>
            </div>
            <button
              onClick={handleOpenTeamTime}
              className="px-6 py-3 bg-white text-purple-600 rounded-xl hover:bg-purple-50 transition-all font-bold shadow-lg inline-flex items-center gap-2"
            >
              <Clock className="w-5 h-5" /> Log Team Time
            </button>
          </div>
        </div>
      )}

      {/* Active Timer */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-2xl">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
          <Clock className="w-16 h-16 lg:w-20 lg:h-20 animate-pulse" />
          <div className="text-5xl lg:text-7xl font-bold font-mono tracking-wider">
            {formatTime(time)}
          </div>
          
          {!isActive ? (
            <button
              onClick={handleStart}
              disabled={isStarting}
              className="px-8 py-4 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all font-bold shadow-lg inline-flex items-center gap-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" /> Start Work
                </>
              )}
            </button>
          ) : (
            <div className="flex gap-4">
              {isPaused ? (
                <button
                  onClick={handleResume}
                  disabled={isResuming}
                  className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all font-bold shadow-lg inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResuming ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Resuming...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" /> Resume
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handlePause}
                  disabled={isPausing}
                  className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-all font-bold shadow-lg inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPausing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Pausing...
                    </>
                  ) : (
                    <>
                      <Pause className="w-5 h-5" /> Pause
                    </>
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  setShowStopDialog(true);
                  setIsPaused(true);
                }}
                className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-bold shadow-lg inline-flex items-center gap-2"
              >
                <Square className="w-5 h-5" /> Stop & Log
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stop Dialog */}
      {showStopDialog && isActive && (
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
          <h3 className="text-lg font-bold mb-4">Complete Time Log</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Work Type *</label>
              <select
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="diagnosis">Diagnosis</option>
                <option value="repair">Repair</option>
                <option value="testing">Testing</option>
                <option value="documentation">Documentation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Break Duration (minutes)</label>
              <input
                type="number"
                min="0"
                value={breakDuration}
                onChange={(e) => setBreakDuration(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Activity Description *</label>
              <textarea
                value={activityDesc}
                onChange={(e) => setActivityDesc(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe what you worked on..."
                required
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleStop}
              disabled={isStopping}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {isStopping ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Completing...
                </>
              ) : (
                'Complete Log'
              )}
            </button>
            <button
              onClick={() => setShowStopDialog(false)}
              className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Total Hours</p>
                <p className="text-3xl font-bold text-gray-900">{summary.total_hours}</p>
              </div>
              <Activity className="w-12 h-12 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-amber-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Break Time</p>
                <p className="text-3xl font-bold text-gray-900">{summary.total_break_minutes}m</p>
              </div>
              <Coffee className="w-12 h-12 text-amber-500" />
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-semibold">Sessions</p>
                <p className="text-3xl font-bold text-gray-900">{summary.total_sessions}</p>
              </div>
              <Clock className="w-12 h-12 text-green-500" />
            </div>
          </div>
        </div>
      )}

      {/* Time Logs History */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b bg-gray-50">
          <h3 className="text-lg font-bold text-gray-900">Time Log History</h3>
        </div>
        <div className="divide-y">
          {logs.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No time logs yet</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        log.status === 'completed' ? 'bg-green-100 text-green-800' :
                        log.status === 'active' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {(log.status || 'active').toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{log.technician_name}</span>
                      {log.work_type && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                          {log.work_type}
                        </span>
                      )}
                    </div>
                    {log.activity_description && <p className="text-sm text-gray-600 mb-2">{log.activity_description}</p>}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>🕐 Started: {formatDate(log.start_time || log.clock_in)}</span>
                      {log.pause_time && <span>⏸️ Paused: {formatDate(log.pause_time)}</span>}
                      {log.end_time && <span>🏁 Ended: {formatDate(log.end_time)}</span>}
                      {log.duration_minutes && <span>⏱️ Duration: {Math.floor(log.duration_minutes / 60)}h {log.duration_minutes % 60}m</span>}
                    </div>
                  </div>
                  {log.actual_hours && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-blue-600">{log.actual_hours}h</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Team Time Modal */}
      {showTeamTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
              <h2 className="text-2xl font-bold">Team Time Entry</h2>
              <p className="text-purple-100 text-sm">Fill in start and end times for team members</p>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="space-y-4">
                {teamTimeData.map((member, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                    <h4 className="font-bold text-gray-900 mb-4 text-lg">{member.technician_name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time</label>
                        <input
                          type="datetime-local"
                          value={member.clock_in}
                          onChange={(e) => updateTeamMember(index, 'clock_in', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">End Time</label>
                        <input
                          type="datetime-local"
                          value={member.clock_out}
                          onChange={(e) => updateTeamMember(index, 'clock_out', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Break (min)</label>
                        <input
                          type="number"
                          min="0"
                          value={member.break_minutes}
                          onChange={(e) => updateTeamMember(index, 'break_minutes', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Work Type</label>
                        <select
                          value={member.work_type}
                          onChange={(e) => updateTeamMember(index, 'work_type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="diagnosis">Diagnosis</option>
                          <option value="repair">Repair</option>
                          <option value="testing">Testing</option>
                          <option value="documentation">Documentation</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Activity Description</label>
                        <input
                          type="text"
                          value={member.activity_description}
                          onChange={(e) => updateTeamMember(index, 'activity_description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          placeholder="What did this person work on?"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t p-6 bg-gray-50 flex gap-3">
              <button
                onClick={handleSaveTeamTime}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-bold shadow-lg"
              >
                Save Team Time
              </button>
              <button
                onClick={() => setShowTeamTimeModal(false)}
                className="px-6 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
