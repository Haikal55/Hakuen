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

  uploadToLibrary(userId: any, documentData: { filename: string, type: string, content?: string, file?: File, base64?: string, parent_id?: string | null }, onProgress?: (progressEvent: ProgressEvent) => void): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}/library/${userId}`);
      
      if (onProgress && xhr.upload) {
        xhr.upload.onprogress = onProgress;
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(xhr.responseText || 'Upload failed'));
        }
      };

      xhr.onerror = () => reject(new Error('Network Error'));

      if (documentData.file) {
        const formData = new FormData();
        formData.append('filename', documentData.filename);
        formData.append('type', documentData.type);
        if (documentData.parent_id) formData.append('parent_id', documentData.parent_id);
        if (documentData.content) formData.append('content', documentData.content);
        if (documentData.base64) formData.append('base64', documentData.base64);
        
        // Append file LAST so body fields are available to multer
        formData.append('file', documentData.file);
        
        xhr.send(formData);
      } else {
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(documentData));
      }
    });
  },

  async createFolder(userId: any, folderName: string, parentId?: string | null) {
    const res = await fetch(`${API_URL}/library/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: folderName,
        type: 'folder',
        content: null,
        parent_id: parentId || null
      })
    });
    return await res.json();
  },

  async deleteFromLibrary(userId: any, documentId: any) {
    await fetch(`${API_URL}/library/${userId}/${documentId}`, { method: 'DELETE' });
  },

  async updateLibraryItem(userId: any, documentId: any, updates: { filename?: string, parent_id?: string | null }) {
    await fetch(`${API_URL}/library/${userId}/${documentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
  },

  // Calendar Endpoints
  async getCalendar(userId: any) {
    const res = await fetch(`${API_URL}/calendar/${userId}`);
    return await res.json();
  },

  async addCalendarAgenda(userId: any, agendaData: { dateStr: string, time: string, endTime?: string, title: string, color?: string, description?: string, recurrence?: string, category?: string }) {
    const res = await fetch(`${API_URL}/calendar/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agendaData)
    });
    return await res.json();
  },

  async editCalendarAgenda(userId: any, agendaId: any, agendaData: { dateStr: string, time: string, endTime?: string, title: string, color?: string, description?: string, recurrence?: string, category?: string }) {
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
    const res = await fetch(`${API_URL}/notes/${userId}/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds })
    });
    if (!res.ok) throw new Error('Failed to reorder notes');
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
