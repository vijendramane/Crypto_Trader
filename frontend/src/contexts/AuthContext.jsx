import React, { createContext, useContext, useReducer, useEffect } from 'react';
import Cookies from 'js-cookie';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

// Initial state
const initialState = {
  user: null,
  loading: true,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        loading: false,
        error: null,
      };
    
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        loading: false,
      };
    
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: action.payload,
      };
    
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Token management utilities
const TOKEN_KEY = 'primetrade_token';
const REFRESH_TOKEN_KEY = 'primetrade_refresh_token';

const getStoredTokens = () => {
  const accessToken = Cookies.get(TOKEN_KEY);
  const refreshToken = Cookies.get(REFRESH_TOKEN_KEY);
  return { accessToken, refreshToken };
};

const setStoredTokens = (tokens) => {
  if (tokens.accessToken) {
    Cookies.set(TOKEN_KEY, tokens.accessToken, {
      expires: 1, // 1 day
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  }
  
  if (tokens.refreshToken) {
    Cookies.set(REFRESH_TOKEN_KEY, tokens.refreshToken, {
      expires: 7, // 7 days
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
  }
};

const removeStoredTokens = () => {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(REFRESH_TOKEN_KEY);
};

// Check if token is expired or about to expire
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime + 300; // 5 minutes buffer
  } catch (error) {
    return true;
  }
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      
      const { accessToken, refreshToken } = getStoredTokens();
      
      if (!accessToken || !refreshToken) {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return;
      }

      try {
        // Check if access token is expired
        if (isTokenExpired(accessToken)) {
          // Try to refresh token
          const tokens = await authAPI.refreshToken(refreshToken);
          setStoredTokens(tokens);
        }

        // Get user profile
        const user = await authAPI.getProfile();
        dispatch({ 
          type: AUTH_ACTIONS.LOGIN_SUCCESS, 
          payload: { user } 
        });
      } catch (error) {
        console.error('Auth initialization error:', error);
        removeStoredTokens();
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    initializeAuth();
  }, []);

  // Login function
  const login = async (credentials) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const data = await authAPI.login(credentials);
      
      setStoredTokens(data.tokens);
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_SUCCESS, 
        payload: { user: data.user } 
      });

      toast.success('Welcome back!');
      return data;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Login failed';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Register function
  const register = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const data = await authAPI.register(userData);
      
      setStoredTokens(data.tokens);
      dispatch({ 
        type: AUTH_ACTIONS.LOGIN_SUCCESS, 
        payload: { user: data.user } 
      });

      toast.success('Account created successfully!');
      return data;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Registration failed';
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      toast.error(errorMessage);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error('Logout API error:', error);
    }

    removeStoredTokens();
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
    toast.success('Logged out successfully');
  };

  // Update user profile
  const updateUser = async (userData) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

    try {
      const updatedUser = await authAPI.updateProfile(userData);
      dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updatedUser });
      toast.success('Profile updated successfully');
      return updatedUser;
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Update failed';
      toast.error(errorMessage);
      throw error;
    } finally {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  };

  // Request password reset
  const requestPasswordReset = async (email) => {
    try {
      await authAPI.requestPasswordReset(email);
      toast.success('Password reset link sent to your email');
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || 'Reset request failed';
      toast.error(errorMessage);
      throw error;
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!state.user;
  };

  // Check if user is admin
  const isAdmin = () => {
    return state.user?.role === 'admin';
  };

  // Auto token refresh
  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      const { accessToken, refreshToken } = getStoredTokens();
      
      if (accessToken && refreshToken && isTokenExpired(accessToken)) {
        try {
          const tokens = await authAPI.refreshToken(refreshToken);
          setStoredTokens(tokens);
        } catch (error) {
          console.error('Auto token refresh failed:', error);
          logout();
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(refreshInterval);
  }, []);

  const value = {
    user: state.user,
    loading: state.loading,
    error: state.error,
    login,
    register,
    logout,
    updateUser,
    requestPasswordReset,
    isAuthenticated,
    isAdmin,
    clearError: () => dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR }),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;