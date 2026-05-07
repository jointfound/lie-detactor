import { useState, useEffect } from "react";
import { Search, Filter, Play, FileText, Download, Trash2 } from "lucide-react";
import { getSessions, SessionRecord, clearSessions } from "../lib/sessionStore";

export function Sessions() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useEffect(() => {
    // Load sessions initially
    setSessions(getSessions());
  }, []);

  const handleReset = () => {
    if (confirm("Are you sure you want to clear all logged sessions?")) {
      clearSessions();
      setSessions([]);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col gap-6">
      <header className="border-b border-white/10 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-white">Session Review Archive</h1>
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 mt-1">Historical analysis data and post-session reporting</p>
        </div>
        <button 
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-1.5 border border-red-500/30 text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors text-[10px] uppercase tracking-widest font-bold"
        >
          <Trash2 className="w-3 h-3" />
          Reset Logs
        </button>
      </header>

      <div className="flex gap-4 mb-4">
        <div className="flex-1 glass-panel px-4 py-2 flex items-center">
            <Search className="w-4 h-4 text-white/40 mr-2" />
            <input 
              type="text" 
              placeholder="Search by ID or Subject..." 
              className="bg-transparent border-none outline-none text-[10px] uppercase font-bold tracking-widest text-white w-full placeholder-white/30"
            />
        </div>
        <button className="glass-panel px-4 py-2 flex items-center text-[10px] tracking-widest uppercase font-bold text-white/60 hover:text-white transition-colors border-white/10 hover:border-white/30">
          <Filter className="w-4 h-4 mr-2" />
          FILTER
        </button>
      </div>

      <div className="glass-panel overflow-hidden border border-white/10 flex-1 flex flex-col">
         <div className="overflow-y-auto flex-1">
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="border-b border-white/10 bg-black/40 text-[9px] font-black uppercase tracking-[0.2em] text-white/40 sticky top-0 backdrop-blur-md">
                    <th className="p-4">Session ID</th>
                    <th className="p-4">Subject</th>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Peak Stress Index</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-[10px] uppercase tracking-widest">
                 {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-white/30">No sessions logged yet.</td>
                    </tr>
                 ) : (
                    sessions.map((session) => (
                      <tr key={session.id} className="hover:bg-white/10 transition-all duration-300 cursor-pointer group hover:shadow-[inset_2px_0_0_#00FF00]">
                         <td className="p-4 text-[#00FF00] font-bold group-hover:text-white transition-colors">{session.id}</td>
                         <td className="p-4 text-white/60 group-hover:text-white/90 transition-colors">{session.subject}</td>
                         <td className="p-4 text-white/40 group-hover:text-white/70 transition-colors">{session.date}</td>
                         <td className="p-4 text-white/60 group-hover:text-white/90 transition-colors">{session.duration}</td>
                         <td className="p-4">
                            <span className={`px-2 py-1 font-bold ${
                               session.maxStress > 75 ? 'bg-[#FF3131]/10 text-[#FF3131] border border-[#FF3131]/30' :
                               session.maxStress > 40 ? 'bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30' :
                               'bg-[#00FF00]/10 text-[#00FF00] border border-[#00FF00]/30'
                            }`}>
                              {session.maxStress}%
                            </span>
                         </td>
                         <td className="p-4">
                            <span className="text-white/40 font-bold">{session.status}</span>
                         </td>
                         <td className="p-4 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button className="p-2 bg-black hover:text-[#00FF00] border border-white/10 hover:border-[#00FF00]/50 transition-colors" title="Replay Session">
                                  <Play className="w-3 h-3" />
                               </button>
                               <button className="p-2 bg-black hover:text-[#00FF00] border border-white/10 hover:border-[#00FF00]/50 transition-colors" title="View Report">
                                  <FileText className="w-3 h-3" />
                               </button>
                                <button className="p-2 bg-black hover:text-[#00FF00] border border-white/10 hover:border-[#00FF00]/50 transition-colors" title="Download Export">
                                  <Download className="w-3 h-3" />
                               </button>
                            </div>
                         </td>
                      </tr>
                    ))
                 )}
              </tbody>
           </table>
         </div>
      </div>
    </div>
  )
}
