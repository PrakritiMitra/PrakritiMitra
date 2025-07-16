import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // <--- make sure this is here
import OrganizerPublicPage from './pages/OrganizerPublicPage';
import { FaInstagram } from 'react-icons/fa';

console.log('FaInstagram:', FaInstagram);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
