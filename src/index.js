import React from 'react';
import ReactDOM from 'react-dom/client';
import AppWrapper from './AppWrapper';
import './styles/animations.css';

// --- ENFORCE HTTPS ---
// Automatically redirects HTTP traffic to HTTPS on production (kloudkoach.com)
// Skips this check for localhost so development isn't affected.
if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
    window.location.href = window.location.href.replace('http:', 'https:');
}
// ---------------------

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <AppWrapper />
);