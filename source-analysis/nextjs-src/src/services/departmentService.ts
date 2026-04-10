import api from '@/lib/api';

export const departmentService = {
  getDepartments: async (hierarchical = false) => {
    const { data } = await api.get(`/departments${hierarchical ? '?hierarchical=true' : ''}`);
    return data;
  },

  getMainDepartments: async () => {
    const { data } = await api.get('/departments/main');
    return data;
  },

  getSubDepartments: async (parentId: number) => {
    const { data } = await api.get(`/departments/${parentId}/sub`);
    return data;
  },

  getDepartment: async (id: number) => {
    const { data } = await api.get(`/departments/${id}`);
    return data;
  },

  createDepartment: async (deptData: any) => {
    const { data } = await api.post('/departments', deptData);
    return data;
  },

  updateDepartment: async (id: number, deptData: any) => {
    const { data } = await api.put(`/departments/${id}`, deptData);
    return data;
  },

  deleteDepartment: async (id: number) => {
    const { data } = await api.delete(`/departments/${id}`);
    return data;
  }
};
