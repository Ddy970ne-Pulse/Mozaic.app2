import React, { useState } from 'react';

const Homepage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const demoAccounts = [
    { email: 'sophie.martin@company.com', password: 'demo123', name: 'Sophie Martin', role: 'admin', department: 'RH' },
    { email: 'jean.dupont@company.com', password: 'demo123', name: 'Jean Dupont', role: 'manager', department: 'IT' },
    { email: 'marie.leblanc@company.com', password: 'demo123', name: 'Marie Leblanc', role: 'employee', department: 'Commercial', isDelegateCSE: true },
    { email: 'pierre.cse@company.com', password: 'demo123', name: 'Pierre Moreau', role: 'employee', department: 'Production', isDelegateCSE: true }
  ];

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    const user = demoAccounts.find(acc => acc.email === email && acc.password === password);
    
    setTimeout(() => {
      if (user) {
        onLogin(user);
      } else {
        alert('Email ou mot de passe incorrect');
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleDemoLogin = (account) => {
    setEmail(account.email);
    setPassword(account.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
      {/* Animated Clouds */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="cloud cloud-1"></div>
        <div className="cloud cloud-2"></div>
        <div className="cloud cloud-3"></div>
      </div>

      <div className="min-h-screen flex items-center justify-center p-6 relative z-10">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20 max-w-md w-full">
          {/* Logo MOZAIK */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center transform rotate-12">
              <span className="text-white font-bold text-xl transform -rotate-12">M</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">MOZAIK RH</h1>
          </div>

          {/* Formulaire de connexion */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/30"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-pink-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          {/* Comptes de démonstration */}
          <div className="mt-8 pt-6 border-t border-white/20">
            <p className="text-white/80 text-sm text-center mb-4">Comptes de démonstration :</p>
            <div className="space-y-2">
              {demoAccounts.map((account, index) => (
                <button
                  key={index}
                  onClick={() => handleDemoLogin(account)}
                  className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/90 text-sm transition-all duration-200"
                >
                  <div className="font-medium">{account.name}</div>
                  <div className="text-white/60 text-xs">{account.role} • {account.department}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;