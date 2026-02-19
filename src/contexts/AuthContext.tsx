"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  role: "staff" | "admin" | "manager"
  isEmailVerified: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => void
  refreshToken: () => Promise<boolean>
  isAuthenticated: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored tokens on app start
    const storedAccessToken = localStorage.getItem("access_token")
    const storedRefreshToken = localStorage.getItem("refresh_token")
    const storedUser = localStorage.getItem("auth_user")

    if (storedAccessToken && storedRefreshToken && storedUser) {
      setToken(storedAccessToken)
      setUser(JSON.parse(storedUser))

      // Verify token is still valid
      verifyToken(storedAccessToken)
    }

    setIsLoading(false)
  }, [])

  /**
   * Attempt to verify the token, retrying up to `maxAttempts` times with a
   * delay between each try.  This handles the packaged-build race condition
   * where the React app loads before the Express backend is fully ready.
   */
  const verifyToken = async (accessToken: string, maxAttempts = 4, delayMs = 2000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })

        if (!response.ok) {
          // Token is invalid — try to refresh, then give up
          const refreshed = await refreshToken()
          if (!refreshed) logout()
        }
        return; // success, exit loop
      } catch (error) {
        const isLastAttempt = attempt === maxAttempts;
        if (isLastAttempt) {
          console.error('Token verification failed after all retries:', error)
          logout()
        } else {
          console.warn(`Token verify attempt ${attempt} failed — backend may still be starting. Retrying in ${delayMs}ms...`)
          await new Promise(res => setTimeout(res, delayMs))
        }
      }
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        const { user: userData, accessToken, refreshToken: refreshTokenValue } = data.data

        setUser(userData)
        setToken(accessToken)

        localStorage.setItem("access_token", accessToken)
        localStorage.setItem("refresh_token", refreshTokenValue)
        localStorage.setItem("auth_user", JSON.stringify(userData))

        toast.success('Login successful!', {
          description: `Welcome back, ${userData.name}!`
        })

        return { success: true }
      } else {
        // Handle different error types
        if (data.message.includes('Too many login attempts')) {
          toast.error('Too Many Attempts', {
            description: `Please try again in ${Math.ceil(data.retryAfter / 60)} minutes`
          })
        } else {
          toast.error('Login Failed', {
            description: data.message
          })
        }
        return { success: false, message: data.message }
      }
    } catch (error) {
      console.error("Login failed:", error)
      toast.error('Network Error', {
        description: 'Please check your connection and try again.'
      })
      return { success: false, message: "Network error. Please try again." }
    }
  }

  const refreshToken = async (): Promise<boolean> => {
    try {
      const storedRefreshToken = localStorage.getItem("refresh_token")

      if (!storedRefreshToken) {
        return false
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      })

      const data = await response.json()

      if (data.success) {
        const { accessToken } = data.data
        setToken(accessToken)
        localStorage.setItem("access_token", accessToken)
        return true
      } else {
        logout()
        return false
      }
    } catch (error) {
      console.error("Token refresh failed:", error)
      logout()
      return false
    }
  }

  const logout = async () => {
    try {
      const storedRefreshToken = localStorage.getItem("refresh_token")

      if (storedRefreshToken) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        })
      }
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setUser(null)
      setToken(null)
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("auth_user")
    }
  }

  useEffect(() => {
    const handleTokenExpired = () => {
      logout();
    };

    window.addEventListener('token-expired', handleTokenExpired);

    return () => {
      window.removeEventListener('token-expired', handleTokenExpired);
    };
  }, []);

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    refreshToken,
    isAuthenticated: !!user && !!token,
    isLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
