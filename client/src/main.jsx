import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

window.onerror = function (msg, url, lineNo, columnNo, error) {
  console.error("Global Error: ", msg, url, lineNo, columnNo, error);
  return false;
};

window.onunhandledrejection = function (event) {
  console.error("Unhandled Promise Rejection: ", event.reason);
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
