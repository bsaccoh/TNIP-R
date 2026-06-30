import client from './client';

export interface DriveTest {
  drive_test_id: number;
  operator_id: number;
  operator_name: string;
  test_name: string;
  test_date: string;
  route_type: string;
  technology: string;
  device_model: string;
  tester_name: string;
  notes: string;
  status: string;
  total_samples: number;
  distance_km: number;
  duration_min: number;
  created_at: string;
}

export interface Sample {
  sample_id: number;
  latitude: number;
  longitude: number;
  rsrp: number | null;
  rsrq: number | null;
  sinr: number | null;
  dl_throughput: number | null;
  ul_throughput: number | null;
  event_type: string | null;
  serving_cell: string | null;
}

export interface LiveSample {
  ts?: string;
  latitude: number;
  longitude: number;
  rsrp?: number | null;
  rsrq?: number | null;
  sinr?: number | null;
  rssi?: number | null;
  dl_throughput?: number | null;
  ul_throughput?: number | null;
  pci?: number | null;
  band?: string | null;
  event_type?: string | null;
  call_status?: string | null;
  serving_cell?: string | null;
}

export async function listTests(operatorId?: number) {
  const params = operatorId ? { operator_id: operatorId } : {};
  const { data } = await client.get('/drive-tests', { params });
  return data.data as DriveTest[];
}

export async function getSummary() {
  const { data } = await client.get('/drive-tests/summary');
  return data.data;
}

export async function getSamples(id: number) {
  const { data } = await client.get(`/drive-tests/${id}/samples`);
  return data.data as Sample[];
}

export async function getAnalysis(id: number) {
  const { data } = await client.get(`/drive-tests/${id}/analysis`);
  return data.data;
}

export async function getCompliance(id: number, thresholds?: Record<string, number>) {
  const { data } = await client.get(`/drive-tests/${id}/compliance`, { params: thresholds });
  return data.data;
}

export async function getSegments(id: number, size = 25) {
  const { data } = await client.get(`/drive-tests/${id}/segments`, { params: { size } });
  return data.data;
}

export async function getNearbySites(id: number, radius = 2) {
  const { data } = await client.get(`/drive-tests/${id}/nearby-sites`, { params: { radius } });
  return data.data;
}

export async function getCoverageGaps(id: number, threshold = -100) {
  const { data } = await client.get(`/drive-tests/${id}/coverage-gaps`, { params: { threshold } });
  return data.data;
}

export async function createLiveTest(payload: {
  operator_id: number;
  test_name: string;
  test_date?: string;
  route_type?: string;
  technology?: string;
  device_model?: string;
  tester_name?: string;
  notes?: string;
}) {
  const { data } = await client.post('/drive-tests/live', payload);
  return data.data as { drive_test_id: number };
}

export async function appendSamples(id: number, samples: LiveSample[]) {
  const { data } = await client.post(`/drive-tests/live/${id}/samples`, { samples });
  return data.data as { inserted: number };
}

export async function endLiveTest(id: number) {
  const { data } = await client.put(`/drive-tests/live/${id}/end`);
  return data.data as DriveTest;
}

export async function deleteTest(id: number) {
  await client.delete(`/drive-tests/${id}`);
}

export async function getOperators() {
  const { data } = await client.get('/operators');
  return data.data as { operator_id: number; operator_name: string }[];
}
