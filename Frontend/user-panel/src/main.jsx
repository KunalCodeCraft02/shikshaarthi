import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// --- ADD THESE IMPORT STATEMENTS ---
// This tells Vite to bundle all your necessary styles.
import './styles/lib/animate/animate.min.css';
import './styles/lib/lightbox/css/lightbox.min.css';
import './styles/lib/owlcarousel/owl.carousel.min.css';
import './styles/css/bootstrap.min.css';
import './styles/css/style.css';

// Note: Your old jQuery-based scripts like wow.js, easing.js, and your main.js
// might not work correctly just by importing them. They often need to be
// re-written in React using the `useEffect` hook to manipulate the DOM.
// For now, we will focus on getting the app to load without syntax errors.
// --- END OF ADDED IMPORTS ---

// Your original code to start the app
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);