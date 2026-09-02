import axios from "axios";

const api = axios.create({
  // የፎልደር ስምህ 'placment_backend' መሆኑን አረጋግጥ
  baseURL: 'http://localhost/placment_backend/', 
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

export default api;