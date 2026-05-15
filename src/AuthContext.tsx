import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from 'react';
import { fetchApi } from "./api";

interface AuthContextType {
  isLoggedIn: boolean;
  user: { id: string; email: string; displayName: string } | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  isSessionLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<{ id: string; email: string; displayName: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const { response, data } = await fetchApi("/api/auth/session");

        if (!isMounted) {
          return;
        }

        if (response.ok && data.authenticated && data.user) {
          setIsLoggedIn(true);
          setUser(data.user);
        } else {
          setIsLoggedIn(false);
          setUser(null);
        }
      } catch {
        if (isMounted) {
          setIsLoggedIn(false);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsSessionLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const trimmedEmail = email.trim();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        throw new Error("Please enter a valid email address");
      }

      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }

      const { response, data } = await fetchApi("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: trimmedEmail,
          password
        })
      });

      if (!response.ok || !data.user) {
        throw new Error(data.error ?? "Login failed");
      }

      setIsLoggedIn(true);
      setUser(data.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetchApi("/api/auth/logout", {
        method: "POST"
      });
    } catch {
      // Local logout still proceeds if the network is unavailable.
    }

    setIsLoggedIn(false);
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        user,
        login,
        logout,
        isLoading,
        isSessionLoading,
        error
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
