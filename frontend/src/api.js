import axios from 'axios';

// Express Backend Service
export const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// FastAPI AI Service
export const aiApi = axios.create({
  baseURL: 'http://localhost:8001',
  headers: {
    'Content-Type': 'application/json',
  },
});
