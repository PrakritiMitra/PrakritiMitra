import axios from "axios";

let isHandling401 = false;

const instance = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
});

instance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      if (isHandling401) {
        return Promise.reject(new Error('Session expired'));
      }
      
      isHandling401 = true;
      
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      alert('Your session has expired. Please log in again.');
      window.location.href = '/login';
      
      return Promise.reject(new Error('Session expired'));
    }
    return Promise.reject(error);
  }
);

window.addEventListener('load', () => {
  isHandling401 = false;
});

export default instance;
