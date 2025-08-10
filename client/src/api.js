import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export const api = axios.create({ baseURL: API_BASE + '/api' });

export async function getServices() {
  const { data } = await api.get('/services');
  return data;
}

export async function getAvailability(date, serviceId) {
  const { data } = await api.get('/availability', { params: { date, serviceId } });
  return data.slots;
}

export async function createBooking(payload) {
  const { data } = await api.post('/bookings', payload);
  return data;
}


export async function listBookingsAdmin(params) {
  const { data } = await api.get('/bookings/admin', { params });
  return data;
}

export async function cancelBooking(id) {
  const { data } = await api.patch(`/bookings/${id}/cancel`);
  return data;
}
