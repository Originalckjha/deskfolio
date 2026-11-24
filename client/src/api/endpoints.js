import { api } from './client.js';

const data = (p) => p.then((r) => r.data);

export const authApi = {
  register: (body) => data(api.post('/auth/register', body)),
  login: (body) => data(api.post('/auth/login', body)),
  me: () => data(api.get('/auth/me')),
};

export const spacesApi = {
  create: (body) => data(api.post('/spaces', body)),
  mine: () => data(api.get('/spaces/my')),
  join: (joinCode) => data(api.post('/spaces/join', { joinCode })),
  get: (spaceId) => data(api.get(`/spaces/${spaceId}`)),
};

export const lockerApi = {
  list: (spaceId) => data(api.get(`/spaces/${spaceId}/locker`)),
  get: (id) => data(api.get(`/locker/${id}`)),
  /** `payload` is a plain object (note/link) or FormData (file upload). */
  create: (spaceId, payload, onUploadProgress) =>
    data(api.post(`/spaces/${spaceId}/locker`, payload, { onUploadProgress })),
  download: (id) => data(api.patch(`/locker/${id}/download`)),
  remove: (id) => data(api.delete(`/locker/${id}`)),
};

export const sessionsApi = {
  create: (spaceId, body) => data(api.post(`/spaces/${spaceId}/sessions`, body)),
  update: (id, body) => data(api.patch(`/sessions/${id}`, body)),
  history: (spaceId) => data(api.get(`/spaces/${spaceId}/history`)),
};

export const educatorsApi = {
  profile: (slug) => data(api.get(`/educators/${encodeURIComponent(slug)}`)),
  rate: (educatorId, body) => data(api.post(`/educators/${educatorId}/rate`, body)),
  leaderboard: (params) => data(api.get('/leaderboard', { params })),
  subjects: () => data(api.get('/leaderboard/subjects')),
};
