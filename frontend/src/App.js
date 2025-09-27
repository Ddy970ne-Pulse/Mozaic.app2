import React, { useState } from 'react';
import './App.css';
import Homepage from './components/Homepage';
import Layout from './components/Layout';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
  };

  if (!user) {
    return <Homepage onLogin={handleLogin} />;
  }

  return (
    <Layout 
      user={user} 
      currentView={currentView} 
      setCurrentView={setCurrentView}
      onLogout={handleLogout}
    />
  );
}

export default App;