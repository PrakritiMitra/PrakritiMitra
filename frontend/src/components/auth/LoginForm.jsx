import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate(); // ⬅️ Needed for redirection

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });

      console.log('Logged in:', res.data);

      // Save token and user
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      // Redirect based on role
      if (res.data.user.role === 'organizer') {
        navigate('/organizer/dashboard');
      } else {
        navigate('/volunteer/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin} className="w-full max-w-xl mx-auto mt-10">
      <h2 className="text-xl font-semibold mb-4">Login</h2>
      {error && <div className="text-red-500">{error}</div>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="input w-full px-4 py-2 my-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="input w-full px-4 py-2 my-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        required
      />
      <button type="submit" className="w-full bg-blue-500 text-white p-2 my-2 rounded">
        Login
      </button>
    </form>
  );
}
