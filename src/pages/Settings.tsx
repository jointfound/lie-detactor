import { Server, Database, Shield, Cpu, Activity, Video, Mic } from "lucide-react";

export function Settings() {
  return (
    <div className="p-8 h-full flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <header className="border-b border-white/10 pb-4">
        <h1 className="text-xl font-black uppercase tracking-tighter text-white">System Configuration</h1>
        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 mt-1">Admin panel for routing, model selection, and security policies</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {/* Inference Engine Target */}
         <div className="glass-panel p-6 flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-white flex items-center border-b border-white/10 pb-4">
               <Cpu className="w-5 h-5 mr-3 text-[#00FF00]" />
               Inference Engine Target
            </h2>
            <div className="space-y-4 font-mono text-[10px] uppercase font-bold tracking-widest mt-2">
               <div className="bg-black p-4 border border-white/10 flex items-center justify-between cursor-pointer hover:border-[#00FF00]/50 transition-colors">
                  <div>
                     <p className="text-[#00FF00]">Cloud GPU Cluster (Primary)</p>
                     <p className="text-white/40 text-[9px] mt-1">TensorRT optimized • asia-east1</p>
                  </div>
                  <div className="w-4 h-4 border-2 border-[#00FF00] flex items-center justify-center">
                     <div className="w-2 h-2 bg-[#00FF00]"></div>
                  </div>
               </div>
                <div className="bg-black p-4 border border-white/10 flex items-center justify-between cursor-pointer hover:border-white/30 transition-colors opacity-50">
                  <div>
                     <p className="text-white/80">Local Edge Device (Fallback)</p>
                     <p className="text-white/40 text-[9px] mt-1">MediaPipe Wasm • Client processing</p>
                  </div>
                  <div className="w-4 h-4 border-2 border-white/30"></div>
               </div>
            </div>
         </div>

         {/* Multi-modal Settings */}
         <div className="glass-panel p-6 flex flex-col gap-4">
            <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-white flex items-center border-b border-white/10 pb-4">
               <Activity className="w-5 h-5 mr-3 text-[#00FF00]" />
               Multi-modal Processing
            </h2>
            <div className="space-y-6 font-mono text-[10px] uppercase font-bold tracking-widest mt-2">
               
               <div className="flex items-center justify-between">
                  <div className="flex items-center text-white/60">
                     <Video className="w-4 h-4 mr-3" />
                     Facial AU Extraction Rate
                  </div>
                  <span className="text-[#00FF00]">60 FPS</span>
               </div>
               
               <div className="flex items-center justify-between">
                  <div className="flex items-center text-white/60">
                     <div className="w-4 h-4 mr-3 border border-white/40"></div>
                     Dense Optical Flow Tracking
                  </div>
                  <div className="w-10 h-5 bg-[#00FF00]/20 relative cursor-pointer border border-[#00FF00]/50">
                     <div className="absolute right-1 top-0.5 w-4 h-4 bg-[#00FF00] shadow-[0_0_10px_rgba(0,255,0,0.5)]"></div>
                  </div>
               </div>

               <div className="flex items-center justify-between border-t border-white/10 pt-6">
                  <div className="flex items-center text-white/60">
                     <Mic className="w-4 h-4 mr-3" />
                     Audio Chunk Size (MFCC)
                  </div>
                  <span className="text-[#00FF00]">256 ms</span>
               </div>

                 <div className="flex items-center justify-between">
                  <div className="flex items-center text-white/60">
                     <div className="w-4 h-4 mr-3 border border-white/40"></div>
                     Background Noise Subtraction
                  </div>
                  <div className="w-10 h-5 bg-[#00FF00]/20 relative cursor-pointer border border-[#00FF00]/50">
                     <div className="absolute right-1 top-0.5 w-4 h-4 bg-[#00FF00] shadow-[0_0_10px_rgba(0,255,0,0.5)]"></div>
                  </div>
               </div>

            </div>
         </div>
      </div>
    </div>
  )
}
