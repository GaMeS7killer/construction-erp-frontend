import axios from 'axios'

const api = axios.create({
  baseURL: 'https://construction-erp-backend-production.up.railway.app/api/v1',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

export default api
