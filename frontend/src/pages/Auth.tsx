import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login("test@example.com"); // Имитация
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card border border-border shadow-xl rounded-[2.5rem] p-10 backdrop-blur-xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            {isLogin ? "С возвращением" : "Создать аккаунт"}
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            {isLogin ? "Войдите в свой профиль" : "Зарегистрируйтесь для синхронизации"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isLogin && (
            <input 
              type="text" placeholder="Ваше имя" 
              className="px-5 py-4 rounded-2xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
            />
          )}
          <input 
            type="email" placeholder="Email" 
            className="px-5 py-4 rounded-2xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
          />
          <input 
            type="password" placeholder="Пароль" 
            className="px-5 py-4 rounded-2xl bg-background border border-border focus:ring-2 focus:ring-primary outline-none"
          />
          <button className="bg-primary text-primary-foreground py-4 rounded-2xl font-semibold hover:opacity-90 transition-all mt-2">
            {isLogin ? "Войти" : "Создать профиль"}
          </button>
        </form>

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full text-center mt-6 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          {isLogin ? "Нет аккаунта? Регистрация" : "Уже есть аккаунт? Войти"}
        </button>
      </div>
    </div>
  );
}