import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync auth session with profiles table
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('Profile fetch failed:', err);
      return null;
    }
  };

  // Self-healing: Creates profile client-side if trigger is not present or failed
  const ensureProfileExists = async (sessionUser, metadata) => {
    try {
      const existing = await fetchProfile(sessionUser.id);
      if (existing) return existing;

      // If profile does not exist, create it
      const newProfile = {
        id: sessionUser.id,
        full_name: metadata?.full_name || sessionUser.user_metadata?.full_name || 'Student User',
        register_number: metadata?.register_number || sessionUser.user_metadata?.register_number || 'N/A',
        department: metadata?.department || sessionUser.user_metadata?.department || 'N/A',
        section: metadata?.section || sessionUser.user_metadata?.section || null,
        year: metadata?.year || sessionUser.user_metadata?.year || 'N/A',
        email: sessionUser.email,
        phone: metadata?.phone || sessionUser.user_metadata?.phone || 'N/A',
        role: metadata?.role || sessionUser.user_metadata?.role || 'user'
      };

      const { data, error } = await supabase
        .from('profiles')
        .insert([newProfile])
        .select()
        .single();

      if (error) {
        console.error('Failed to self-heal profile:', error.message);
        return null;
      }
      return data;
    } catch (err) {
      console.error('ensureProfileExists error:', err);
      return null;
    }
  };

  useEffect(() => {
    // Get initial session
    const initSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        const userProfile = await ensureProfileExists(session.user);
        setProfile(userProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    };

    initSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session?.user) {
        setUser(session.user);
        const userProfile = await ensureProfileExists(session.user);
        setProfile(userProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Register
  const register = async (email, password, metadata) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.fullName,
          register_number: metadata.registerNumber,
          department: metadata.department,
          section: metadata.section || null,
          year: metadata.year,
          phone: metadata.phone,
          role: metadata.role || 'user'
        }
      }
    });

    if (error) throw error;
    
    // Explicitly seed profile to be safe and fast
    if (data.user) {
      await ensureProfileExists(data.user, {
        full_name: metadata.fullName,
        register_number: metadata.registerNumber,
        department: metadata.department,
        section: metadata.section || null,
        year: metadata.year,
        phone: metadata.phone,
        role: metadata.role || 'user'
      });
    }
    return data;
  };

  // Login
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  // Logout
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  };

  // Password reset email
  const sendPasswordReset = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    if (error) throw error;
    return data;
  };

  // Update password (on reset password page)
  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return data;
  };

  // Update profile details
  const updateProfileDetails = async (updates) => {
    if (!user) throw new Error('No authenticated user found');
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isAdmin,
        loading,
        register,
        login,
        logout,
        sendPasswordReset,
        updatePassword,
        updateProfileDetails,
        refreshProfile: () => fetchProfile(user?.id).then(setProfile)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
