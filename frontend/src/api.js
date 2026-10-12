const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
const TOKEN_KEY = 'startupmeu_auth_token';
const USER_KEY = 'startupmeu_auth_user';

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Ignore localStorage errors
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

async function request(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('The service could not be reached. Check that the API is running and try again.');
  }

  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/auth/register')) {
      clearAuthSession();
    }
    throw new Error(payload?.error || 'The request could not be completed. Please try again.');
  }
  return payload;
}

export async function loginUser(credentials) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  if (result?.data?.token && result?.data?.user) {
    setAuthSession(result.data.token, result.data.user);
  }
  return result?.data;
}

export async function registerUser(details) {
  const result = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(details),
  });
  if (result?.data?.token && result?.data?.user) {
    setAuthSession(result.data.token, result.data.user);
  }
  return result?.data;
}

export async function getMe() {
  const token = getStoredToken();
  if (!token) return null;
  const result = await request('/auth/me');
  if (result?.data?.user) {
    setAuthSession(null, result.data.user);
  }
  return result?.data?.user;
}

export function logoutUser() {
  clearAuthSession();
}

export function listStartups(filters = {}, signal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== null && value !== undefined) params.set(key, value);
  }
  return request(`/startups${params.size ? `?${params}` : ''}`, { signal });
}

export function getStartup(id) {
  return request(`/startups/${id}`);
}

export function saveStartup(startup, values) {
  const editing = Boolean(startup?._id);
  return request(editing ? `/startups/${startup._id}` : '/startups', {
    method: editing ? 'PATCH' : 'POST',
    body: JSON.stringify(values),
  });
}

export function removeStartup(id) {
  return request(`/startups/${id}`, { method: 'DELETE' });
}

export function createConnectionRequest(id, values) {
  return request(`/startups/${id}/connection-requests`, {
    method: 'POST',
    body: JSON.stringify(values),
  });
}

export function getConnectionRequests(id) {
  return request(`/startups/${id}/connection-requests`);
}
