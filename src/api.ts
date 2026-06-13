const API_URL = `http://${window.location.hostname}:3001/api`;

export const api = {
  async register(username: any, email: any, password: any) {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.user;
  },
  
  async login(email: any, password: any) {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.user;
  },

  async deleteUser(userId: any) {
    await fetch(`${API_URL}/users/${userId}`, { method: 'DELETE' });
  },

  async forgotPassword(email: string) {
    const res = await fetch(`${API_URL}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async changePassword(userId: any, password: any) {
    const res = await fetch(`${API_URL}/users/${userId}/password`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async generateQrToken(userId: any) {
    const res = await fetch(`${API_URL}/users/generate-qr-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data;
  },

  async loginByToken(token: string) {
    const res = await fetch(`${API_URL}/users/login-by-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    return data.user;
  },


  async getData(userId: any, key: any, defaultValue: any = null) {
    try {
      const res = await fetch(`${API_URL}/data/${userId}/${key}`);
      const data = await res.json();
      return (data && data.value !== null && data.value !== undefined) ? data.value : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },

  async setData(userId: any, key: any, value: any) {
    await fetch(`${API_URL}/data/${userId}/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
  },

  async getSessions(userId: any) {
    const res = await fetch(`${API_URL}/sessions/${userId}`);
    return await res.json();
  },

  async saveSession(userId: any, session: any) {
    await fetch(`${API_URL}/sessions/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
  },

  async deleteSession(userId: any, sessionId: any) {
    await fetch(`${API_URL}/sessions/${userId}/${sessionId}`, { method: 'DELETE' });
  },

  async clearSessions(userId: any) {
    await fetch(`${API_URL}/sessions/${userId}`, { method: 'DELETE' });
  },

  async deleteSessions(userId: any) {
    await fetch(`${API_URL}/sessions/${userId}`, { method: 'DELETE' });
  },

  // Library Endpoints
  async getLibrary(userId: any) {
    const res = await fetch(`${API_URL}/library/${userId}`);
    return await res.json();
  },

  async uploadToLibrary(userId: any, documentData: any) {
    const res = await fetch(`${API_URL}/library/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(documentData)
    });
    return await res.json();
  },

  async deleteFromLibrary(userId: any, documentId: any) {
    await fetch(`${API_URL}/library/${userId}/${documentId}`, { method: 'DELETE' });
  },

  async updateLibraryFilename(userId: any, documentId: any, newFilename: string) {
    await fetch(`${API_URL}/library/${userId}/${documentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: newFilename })
    });
  },

  // Calendar Endpoints
  async getCalendar(userId: any) {
    const res = await fetch(`${API_URL}/calendar/${userId}`);
    return await res.json();
  },

  async addCalendarAgenda(userId: any, agendaData: { dateStr: string, time: string, title: string, color?: string }) {
    const res = await fetch(`${API_URL}/calendar/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agendaData)
    });
    return await res.json();
  },

  async editCalendarAgenda(userId: any, agendaId: any, agendaData: { dateStr: string, time: string, title: string, color?: string }) {
    const res = await fetch(`${API_URL}/calendar/${userId}/${agendaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agendaData)
    });
    return await res.json();
  },

  async deleteCalendarAgenda(userId: any, agendaId: any) {
    await fetch(`${API_URL}/calendar/${userId}/${agendaId}`, { method: 'DELETE' });
  },

  // Notes Endpoints
  async getNotes(userId: any) {
    const res = await fetch(`${API_URL}/notes/${userId}`);
    return await res.json();
  },

  async createNote(userId: any, noteData: any) {
    const res = await fetch(`${API_URL}/notes/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
    return await res.json();
  },

  async updateNote(userId: any, noteId: any, noteData: any) {
    const res = await fetch(`${API_URL}/notes/${userId}/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
    return await res.json();
  },

  async deleteNote(userId: any, noteId: any) {
    await fetch(`${API_URL}/notes/${userId}/${noteId}`, { method: 'DELETE' });
  },

  async reorderNotes(userId: any, orderedIds: string[]) {
    await fetch(`${API_URL}/notes/${userId}/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds })
    });
  },

  async uploadNoteImage(userId: any, base64: string, filename: string) {
    const res = await fetch(`${API_URL}/notes/image/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64, filename })
    });
    return await res.json();
  }
};
