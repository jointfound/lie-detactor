import { Link, Outlet, useLocation } from "react-router-dom";
import { Activity, LayoutDashboard, History, Settings, FileText, Fingerprint, BrainCircuit } from "lucide-react";
import { cn } from "../lib/utils";

const NAV_ITEMS = [
  { name: "Live Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Session Review", path: "/sessions", icon: History },
  { name: "Intel Architecture", path: "/architecture", icon: FileText },
  { name: "Fusion Engine", path: "/fusion", icon: BrainCircuit },
  { name: "Admin Setup", path: "/settings", icon: Settings },
];

export function Layout() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#050505] text-[#E0E0E0] font-sans border border-white/10">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 bg-black flex flex-col justify-between">
        <div>
          <div className="h-14 flex items-center px-6 border-b border-white/10 bg-black/40">
            <Fingerprint className="w-5 h-5 text-[#00FF00] mr-2" />
            <span className="font-black text-xl tracking-tighter text-white">
              VERITAS <span className="text-[#00FF00]/60">//</span> CORE
            </span>
          </div>
          
          <nav className="p-4 space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center px-4 py-3 font-mono text-[10px] uppercase font-bold tracking-widest transition-all duration-200 border",
                    isActive 
                      ? "bg-white/5 text-[#00FF00] border-white/20"
                      : "text-white/40 border-transparent hover:border-white/10 hover:text-white"
                  )}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-white/10 m-4 glass-panel flex flex-col gap-3">
           <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">System Status</span>
              <div className="flex items-center">
                 <div className="w-2 h-2 bg-[#00FF00] animate-pulse mr-2" />
                 <span className="text-xs text-[#00FF00] font-mono">ONLINE</span>
              </div>
           </div>
           <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">GPU Temp</span>
               <span className="text-xs text-blue-400 font-mono">68°C</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative h-full bg-neutral-900/10">
        <Outlet />
      </main>
    </div>
  );
}
