import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api
        .get("/accounts/profile/")
        .then((res) => {
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  async function login(username, password) {
    const res = await api.post("/accounts/login/", { username, password });
    const { token: authToken, user: userData } = res.data;
    setToken(authToken);
    setUser(userData);
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(userData));
    return userData;
  }

  async function register(formData) {
    const res = await api.post("/accounts/register/", formData);
    const { token: authToken, user: userData } = res.data;
    setToken(authToken);
    setUser(userData);
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(userData));
    return userData;
  }

  async function logout() {
    try {
      if (token) {
        await api.post("/accounts/logout/");
      }
    } catch {
      // ignore
    } finally {
      setToken("");
      setUser(null);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
