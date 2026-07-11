/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  settings: {
    theme: string;
    defaultVoices: string;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        try {
          const response = await fetch("/api/auth/me", {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            setToken(storedToken);
          } else {
            localStorage.removeItem("token");
            setToken(null);
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log("Sending login request with:", { email });

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      console.log("Login response status:", response.status);
      const text = await response.text();
      console.log("Login response text:", text);

      if (!text) {
        throw new Error("Server returned an empty response");
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse response as JSON:", text);
        throw new Error(
          `Invalid JSON response: ${text.substring(0, 100)}${text.length > 100 ? "..." : ""}`,
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to login");
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signup = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ) => {
    try {
      console.log("Sending signup request with:", {
        email,
        firstName,
        lastName,
      });

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      console.log("Signup response status:", response.status);
      const text = await response.text();
      console.log("Signup response text:", text);

      if (!text) {
        throw new Error("Server returned an empty response");
      }
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse response as JSON:", text);
        throw new Error(
          `Invalid JSON response: ${text.substring(0, 100)}${text.length > 100 ? "..." : ""}`,
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Failed to register");
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem("token", data.token);
      navigate("/dashboard");
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    navigate("/signin");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
