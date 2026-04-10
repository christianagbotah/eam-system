import api, { getMeterReadings } from './api';

export async function listMeters(nodeType: string, nodeId: number) {
  return api.get(`/assets/${nodeType}/${nodeId}/meters`);
}

export async function addReading(meterId: number, value: number) {
  return api.post(`/meters/${meterId}/readings`, { value });
}

export async function createMeter(data: any) {
  return api.post('/meters', data);
}

export { getMeterReadings };
