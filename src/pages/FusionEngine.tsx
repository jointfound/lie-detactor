import ReactMarkdown from "react-markdown";
import { FUSION_ARCHITECTURE_MD } from "../constants/fusion_architecture";

export function FusionEngine() {
  return (
    <div className="p-8 h-full overflow-y-auto w-full mx-auto max-w-4xl">
      <div className="p-8 prose prose-invert prose-neon max-w-none border-l border-white/10 bg-black/40">
        <div className="markdown-body font-sans text-[#E0E0E0]">
           <style>{`
             .markdown-body h1, .markdown-body h2, .markdown-body h3 {
               color: #fff;
               font-family: 'Inter', sans-serif;
               text-transform: uppercase;
               letter-spacing: -0.05em;
               border-bottom: 1px solid rgba(255,255,255,0.1);
               padding-bottom: 0.5rem;
               margin-top: 2rem;
               margin-bottom: 1rem;
               font-weight: 900;
             }
             .markdown-body h1 { font-size: 2.5rem; color: #FFF; border-bottom: none; }
             .markdown-body h2 { font-size: 1.8rem; }
             .markdown-body h3 { font-size: 1.2rem; border-bottom: none; color: #00FF00; letter-spacing: 0.1em; }
             .markdown-body p { margin-bottom: 1rem; line-height: 1.8; }
             .markdown-body ul { list-style-type: square; padding-left: 1.5rem; margin-bottom: 1rem; }
             .markdown-body li { margin-bottom: 0.5rem; }
             .markdown-body code { font-family: 'JetBrains Mono', monospace; background: #000; padding: 0.2rem 0.4rem; border: 1px solid rgba(255,255,255,0.1); font-size: 0.9em; color: #00FF00; }
             .markdown-body pre { background: #000; padding: 1rem; overflow-x: auto; margin-bottom: 1rem; border: 1px solid rgba(255,255,255,0.1); font-weight: bold; }
             .markdown-body pre code { background: none; padding: 0; color: inherit; border: none; }
             .markdown-body hr { border-color: rgba(255,255,255,0.1); margin: 2rem 0; }
             .markdown-body strong { color: #fff; font-weight: 900; }
           `}</style>
          <ReactMarkdown>{FUSION_ARCHITECTURE_MD}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
