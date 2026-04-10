import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'issued' | 'maintenance';
  color: string;
}

interface Tool {
  id: number;
  name: string;
  code: string;
  category_name: string;
}

const ToolAvailabilityCalendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<number | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    tool_id: '',
    start_date: '',
    end_date: '',
    purpose: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTools();
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedTool) {
      fetchEvents();
    }
  }, [selectedTool]);

  const fetchTools = async () => {
    try {
      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tools', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (data.status === 'success') {
        setTools(data.data);
      }
    } catch (error) {
      console.error('Error fetching tools:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const startDate = moment().startOf('month').format('YYYY-MM-DD');
      const endDate = moment().endOf('month').format('YYYY-MM-DD');
      
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        ...(selectedTool && { tool_id: selectedTool.toString() })
      });

      const response = await fetch(`/factorymanager/public/index.php/api/v1/eam/tool-calendar/events?${params}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        const formattedEvents = data.data.map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end)
        }));
        setEvents(formattedEvents);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    if (!selectedTool) {
      alert('Please select a tool first');
      return;
    }
    
    setBookingData({
      tool_id: selectedTool.toString(),
      start_date: moment(start).format('YYYY-MM-DD'),
      end_date: moment(end).format('YYYY-MM-DD'),
      purpose: ''
    });
    setShowBookingModal(true);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/factorymanager/public/index.php/api/v1/eam/tool-calendar/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(bookingData)
      });

      const data = await response.json();
      if (data.status === 'success') {
        alert('Booking request created successfully');
        setShowBookingModal(false);
        fetchEvents();
      } else {
        alert(data.message || 'Error creating booking');
      }
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Error creating booking');
    } finally {
      setLoading(false);
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => ({
    style: {
      backgroundColor: event.color,
      borderRadius: '4px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block'
    }
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Tool Availability Calendar</h1>
        
        <div className="flex gap-4 mb-4">
          <select
            value={selectedTool || ''}
            onChange={(e) => setSelectedTool(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tools</option>
            {tools.map(tool => (
              <option key={tool.id} value={tool.id}>
                {tool.code} - {tool.name} ({tool.category_name})
              </option>
            ))}
          </select>
          
          <button
            onClick={() => fetchEvents()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        <div className="flex gap-4 mb-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Tool Issued</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>Maintenance Scheduled</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6" style={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day']}
          defaultView="month"
        />
      </div>

      {showBookingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Book Tool</h3>
            
            <form onSubmit={handleBooking}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tool
                </label>
                <select
                  value={bookingData.tool_id}
                  onChange={(e) => setBookingData({...bookingData, tool_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Tool</option>
                  {tools.map(tool => (
                    <option key={tool.id} value={tool.id}>
                      {tool.code} - {tool.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={bookingData.start_date}
                    onChange={(e) => setBookingData({...bookingData, start_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={bookingData.end_date}
                    onChange={(e) => setBookingData({...bookingData, end_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose
                </label>
                <textarea
                  value={bookingData.purpose}
                  onChange={(e) => setBookingData({...bookingData, purpose: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolAvailabilityCalendar;