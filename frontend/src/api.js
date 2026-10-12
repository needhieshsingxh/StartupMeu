const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('The service could not be reached. Check that the API is running and try again.');
  }
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || 'The request could not be completed. Please try again.');
  return payload;
}

export function listStartups(filters, signal) {
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
