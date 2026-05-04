import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

// Определяем, какие данные будут доступны в приложении
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Добавляем состояние загрузки

  useEffect(() => {
    // 1. Проверяем сессию при первой загрузке приложения
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    initAuth();

    // 2. Слушаем изменения (вход, выход, смена пароля)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Функция для выхода из аккаунта
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
    } catch (error) {
      console.error("Ошибка при выходе:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      loading, 
      logout 
    }}>
      {!loading && children} 
      {/* !loading && children гарантирует, что приложение не начнет рендериться, 
          пока мы не узнаем, залогинен юзер или нет */}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};