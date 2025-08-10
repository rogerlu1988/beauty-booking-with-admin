import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

export const api = axios.create({ baseURL: API_BASE + '/api' });

// Attach JWT from localStorage if present
api.interceptors.request.use((config) => {
  const t = localStorage.getItem('token');
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export async function getServices() {
  const { data } = await api.get('/services');
  return data;
}

export async function getAvailability(date, serviceId, professionalUserId) {
  const params = { date, serviceId };
  if (professionalUserId) params.professionalUserId = professionalUserId;
  const { data } = await api.get('/availability', { params });
  return data.slots;
}

export async function createBooking(payload) {
  const { data } = await api.post('/bookings', payload);
  return data;
}

export async function getProfessionals(params = {}) {
  // params: { q?: string }
  const { data } = await api.get('/users', { params: { role: 'professional', ...params } });
  return data; // [{ _id, name, email, phone, role }]
}

// --- Professional self-service APIs ---
export async function getProProfile() {
  const { data } = await api.get('/pro/profile');
  return data; // { userId, services: [...], businessHours: { open, close } }
}

export async function updateProProfile(payload) {
  const { data } = await api.patch('/pro/profile', payload);
  return data;
}

// --- Booking management ---
export async function rescheduleBooking(id, start) {
  const { data } = await api.patch(`/bookings/${id}/reschedule`, { start });
  return data;
}

export async function restoreBooking(id) {
  const { data } = await api.patch(`/bookings/${id}/restore`);
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

export async function assignBooking(id, payload) {
  // payload: { professionalUserId? , professionalEmail? }
  const { data } = await api.patch(`/bookings/${id}/assign`, payload);
  return data;
}

// --- Auth helpers ---
export async function login(email, password) {
  const { data } = await axios.post(API_BASE + '/api/auth/login', { email, password });
  return data;
}

export async function registerUser(payload) {
  // payload: { email, password, role, name?, phone? }
  const { data } = await axios.post(API_BASE + '/api/auth/register', payload);
  return data;
}
