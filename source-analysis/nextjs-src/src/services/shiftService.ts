import api from '@/lib/api';

export const shiftService = {
  getShifts: async () => {
    try {
      const { data } = await api.get('/shifts');
      return data;
    } catch (error) {
      console.error('Error fetching shifts:', error);
      return { data: [] };
    }
  },

  createShift: async (shiftData: any) => {
    try {
      const { data } = await api.post('/shifts', shiftData);
      return data;
    } catch (error) {
      console.error('Error creating shift:', error);
      throw error;
    }
  },

  assignShift: async (assignmentData: any) => {
    try {
      const { data } = await api.post('/employee-shifts', assignmentData);
      return data;
    } catch (error) {
      console.error('Error assigning shift:', error);
      throw error;
    }
  },

  bulkAssign: async (assignments: any[]) => {
    try {
      const { data } = await api.post('/employee-shifts/bulk-assign', { assignments });
      return data;
    } catch (error) {
      console.error('Error bulk assigning shifts:', error);
      throw error;
    }
  },

  bulkImportCSV: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/employee-shifts/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return data;
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw error;
    }
  },

  getDepartmentRoster: async (departmentId: number, date: string) => {
    try {
      const { data } = await api.get(`/departments/${departmentId}/roster?date=${date}`);
      return data;
    } catch (error) {
      console.error('Error fetching department roster:', error);
      return { data: [] };
    }
  },

  getEmployeeShifts: async (filters?: { user_id?: number; shift_id?: number }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.user_id) params.append('user_id', filters.user_id.toString());
      if (filters?.shift_id) params.append('shift_id', filters.shift_id.toString());
      const { data } = await api.get(`/employee-shifts?${params}`);
      return data;
    } catch (error) {
      console.error('Error fetching employee shifts:', error);
      return { data: [] };
    }
  },

  deleteAssignment: async (id: number) => {
    try {
      const { data } = await api.delete(`/employee-shifts/${id}`);
      return data;
    } catch (error) {
      console.error('Error deleting assignment:', error);
      throw error;
    }
  }
};
