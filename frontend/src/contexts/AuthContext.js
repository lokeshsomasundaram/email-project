import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(sessionStorage.getItem('access_token'));

  useEffect(() => {
    // Check if token exists on mount
    const storedToken = sessionStorage.getItem('access_token');
    if (storedToken) {
      setToken(storedToken);
      // You might want to validate the token here
    }
  }, []);

  const login = (userData, authToken) => {
    sessionStorage.setItem('access_token', authToken);
    localStorage.setItem('access_token', authToken);
    setToken(authToken);
    setUser(userData);
  };

  const logout = () => {
    sessionStorage.removeItem('access_token');
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = () => {
    return !!token;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout, 
      isAuthenticated 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
