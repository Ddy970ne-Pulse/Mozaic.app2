import React, { useState, useEffect } from 'react';
import './App.css';
import Homepage from './components/Homepage';
import Layout from './components/Layout';

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  // Vérifier si un utilisateur est connecté au chargement
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          // Vérifier que le token est toujours valide
          const response = await fetch(
            `${process.env.REACT_APP_BACKEND_URL}/api/auth/me`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );
          
          if (response.ok) {
            // Token valide, restaurer l'utilisateur avec les données à jour
            const userData = await response.json();
            setUser(userData);
            // Mettre à jour localStorage avec les données fraîches
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            // Token invalide ou expiré, nettoyer
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Erreur vérification auth:', error);
          // En cas d'erreur réseau, on garde l'utilisateur connecté localement
          const userData = JSON.parse(storedUser);
          setUser(userData);
        }
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    // Sauvegarder dans localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    // Nettoyer localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentView('dashboard');
  };

  // Afficher un loader pendant la vérification
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

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