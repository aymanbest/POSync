const React = require('react');
const ReactDOM = require('react-dom/client');
const App = require('./src/components/App').default;

// Wait for the DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize React
  const root = ReactDOM.createRoot(document.getElementById('app'));
  root.render(
    React.createElement(React.StrictMode, null,
      React.createElement(App)
    )
  );
}); 