import axios from 'axios';

// Express Backend Service
export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// FastAPI AI Service
export const aiApi = axios.create({
  baseURL: import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8001',
  headers: {
    'Content-Type': 'application/json',
  },
});
