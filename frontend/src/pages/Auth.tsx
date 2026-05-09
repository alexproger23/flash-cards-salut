import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext"; 
import { Mail, Lock, LogIn, UserPlus, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
const API_URL = import.meta.env.VITE_API_URL;


export function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { login } = useAuth(); 

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    
    const endpoint = isLogin ? `${API_URL}/auth/login` : `${API_URL}/auth/register`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Произошла ошибка");
      }

      if (isLogin) {
        
        login(data.token, data.user);
        toast.success("С возвращением!");
        navigate("/");
      } else {
        setIsLogin(true);
        toast.success("Регистрация успешна!", {
          description: "Теперь вы можете войти в свой аккаунт"
        });
      }
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      <form 
        onSubmit={handleSubmit} 
        className="w-full max-w-md bg-card border border-border p-8 md:p-10 rounded-[2.5rem] shadow-2xl backdrop-blur-xl z-10 transition-all duration-500"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4">
            {isLogin ? <LogIn size={32} /> : <UserPlus size={32} />}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {isLogin ? "С возвращением" : "Создать аккаунт"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isLogin ? "Введите свои данные для входа" : "Заполните форму для регистрации"}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle size={18} className="shrink-0" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium ml-1 text-foreground/70">Электронная почта</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
              <input 
                type="email" 
                placeholder="email@example.com" 
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMsg(null); }}
                required
                className="w-full pl-12 pr-5 py-4 rounded-2xl bg-input-background border border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium ml-1 text-foreground/70">Пароль</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={20} />
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                required
                className="w-full pl-12 pr-5 py-4 rounded-2xl bg-input-background border border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-6 bg-primary text-primary-foreground py-4 rounded-2xl font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Обработка...</span>
              </>
            ) : (
              isLogin ? "Войти в систему" : "Зарегистрироваться"
            )}
          </button>
        </div>

        <div className="mt-8 text-center">
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setErrorMsg(null); }}
            className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors p-2"
          >
            {isLogin ? "Нет аккаунта? Создать сейчас" : "Уже есть аккаунт? Войти"}
          </button>
        </div>
      </form>
    </div>
  );
}