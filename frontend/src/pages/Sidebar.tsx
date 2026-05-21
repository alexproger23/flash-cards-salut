import { useAuth } from "../context/AuthContext";
import { LogOut, LayoutGrid, PlusCircle, UserCircle2, Sun, Moon, BrainCircuit } from "lucide-react";
import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useVoiceAssistant } from "../voice/VoiceAssistantProvider";

export function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { sendAssistantAction } = useVoiceAssistant();

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }

    sendAssistantAction("set_theme", { theme: isDark ? "dark" : "light" });
  }, [isDark, sendAssistantAction]);

  useEffect(() => {
    const handleThemeChange = (event: Event) => {
      const theme = (event as CustomEvent<{ theme?: string }>).detail?.theme;
      if (theme === "dark") setIsDark(true);
      if (theme === "light") setIsDark(false);
    };

    window.addEventListener("flashcards-theme-change", handleThemeChange);
    return () => window.removeEventListener("flashcards-theme-change", handleThemeChange);
  }, []);

  if (!user) return null;

  return (
    <div className="fixed left-6 top-6 z-50">
      {/* Контейнер всей группы с наведением */}
      <div className="group relative inline-block">
        
        {/* Кнопка-триггер */}
        <button className="flex items-center gap-3 bg-card border border-border p-1.5 pr-4 rounded-full transition-all hover:border-primary/50 hover:shadow-lg active:scale-95 group-hover:bg-background relative z-10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center text-white shadow-md">
            <UserCircle2 size={20} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Аккаунт</span>
            <span className="text-sm font-bold truncate max-w-[100px] text-foreground">
              {user.email?.split("@")[0]}
            </span>
          </div>
        </button>

        {/* ВЫПАДАЮЩЕЕ МЕНЮ С МОСТИКОМ */}
        <div className="absolute top-full left-0 pt-3 w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-left group-hover:scale-100 scale-95">
          
          <div className="bg-card border border-border rounded-[2rem] p-3 shadow-2xl overflow-hidden">
            
            <div className="px-4 py-3 mb-2 bg-muted/30 rounded-[1.5rem]">
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter mb-1 opacity-50">Email</p>
              <p className="text-sm text-foreground font-bold truncate">{user.email}</p>
            </div>

            <div className="space-y-1">
              <button
                onClick={() => navigate("/")}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 hover:text-primary rounded-[1.25rem] transition-all text-sm font-bold"
              >
                <LayoutGrid size={18} strokeWidth={2.5} /> Главная
              </button>
              <button
                onClick={() => navigate("/tests")}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 hover:text-primary rounded-[1.25rem] transition-all text-sm font-bold"
              >
                <BrainCircuit size={18} strokeWidth={2.5} /> Режим теста
              </button>
              <button
                onClick={() => navigate("/topics/new")}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 hover:text-primary rounded-[1.25rem] transition-all text-sm font-bold"
              >
                <PlusCircle size={18} strokeWidth={2.5} /> Создать тему
              </button>
            </div>

            <div className="h-px bg-border my-2 mx-2" />

            {/* ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDark(!isDark);
              }}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted rounded-[1.25rem] transition-all text-sm font-bold group/item"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-5 h-5 flex items-center justify-center">
                  <Sun 
                    className={`absolute transition-all duration-500 ${isDark ? "scale-0 rotate-90" : "scale-100 rotate-0 text-amber-500"}`} 
                    size={18} strokeWidth={2.5} 
                  />
                  <Moon 
                    className={`absolute transition-all duration-500 ${!isDark ? "scale-0 -rotate-90" : "scale-100 rotate-0 text-emerald-400"}`} 
                    size={18} strokeWidth={2.5} 
                  />
                </div>
                <span className="text-foreground">Оформление</span>
              </div>
              <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1 bg-muted-foreground/10 rounded-lg group-hover/item:bg-primary/20 group-hover/item:text-primary transition-colors">
                {isDark ? "Темная" : "Светлая"}
              </div>
            </button>

            <div className="h-px bg-border my-2 mx-2" />

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-destructive hover:bg-destructive/10 rounded-[1.25rem] transition-all text-sm font-bold"
            >
              <LogOut size={18} strokeWidth={2.5} /> Выйти
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
