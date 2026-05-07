import { useEffect, useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { Activity, AlertTriangle, Eye, Mic, BrainCircuit, ScanFace, FileText } from "lucide-react";
import { cn } from "../lib/utils";
import { FaceLandmarker, FilesetResolver, DrawingUtils } from "@mediapipe/tasks-vision";
import { MultimodalFusionEngine } from "../lib/fusion";
import { addSession } from "../lib/sessionStore";
import Meyda from "meyda";

const QUESTION_BANK = [
  "What is your full name?",
  "Where were you yesterday evening at 8 PM?",
  "Were you with anyone else?",
  "Can you describe what you were doing in detail?",
  "Have you ever lied in a professional situation?",
  "Tell me about a recent stressful event in your life.",
  "What is your primary motivation in your career?",
  "Have you ever stolen anything from a workplace?",
  "How do you react when you are wrongly accused?",
  "Describe a time you failed to meet a deadline.",
  "Have you ever taken credit for someone else's work?",
  "How do you handle conflict with a superior?",
  "Tell me about a time you broke the rules to succeed.",
  "Are you completely comfortable with ambiguity?",
  "Explain a situation where you had to deceive someone for a good reason."
];

const generateMockData = () => {
  return Array.from({ length: 20 }).map((_, i) => ({
    time: i,
    visualStress: 20 + Math.random() * 30,
    audioStress: 15 + Math.random() * 25,
    fusionProbability: 18 + Math.random() * 28,
    dominantModality: 'System Initialization',
    isCalibrating: false
  }));
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/90 border border-white/20 p-3 rounded-lg shadow-xl font-mono text-[10px] uppercase tracking-widest min-w-[150px]">
        <p className="text-white/60 mb-2 border-b border-white/10 pb-1 font-bold">T+{label}ms</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex justify-between items-center py-1">
            <span style={{ color: entry.color }} className="font-bold">{entry.name}:</span>
            <span className="text-white ml-4 font-bold">{typeof entry.value === 'number' ? Math.round(entry.value) : entry.value}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isAnalyzingRef = useRef(isAnalyzing);
  const [data, setData] = useState<any[]>([]);
  const [currentScore, setCurrentScore] = useState(25);
  const [questionIndex, setQuestionIndex] = useState(-1);
  const [sessionQuestions, setSessionQuestions] = useState<string[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [autoApprove, setAutoApprove] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
  const currentVisualStressRef = useRef<number>(20);
  const sessionStartTimeRef = useRef<number>(0);
  const maxStressRef = useRef<number>(0);
  const autoAdvTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previousHeadPoseRef = useRef<{matrix: number[]} | null>(null);
  const requestRef = useRef<number>(0);
  
  // Keystroke Dynamics Refs
  const lastKeyTimeRef = useRef<number>(0);
  const flightTimesRef = useRef<number[]>([]);
  const typingStressRef = useRef<number>(0);
  const fusionEngineRef = useRef(new MultimodalFusionEngine());
  
  // Real-time capturing refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const meydaAnalyzerRef = useRef<any>(null);
  const currentAudioStressRef = useRef<number>(20);
  const audioAnimationFrameRef = useRef<number>(0);
  
  // Transcription State
  const recognitionRef = useRef<any>(null);
  const [transcriptionContext, setTranscriptionContext] = useState<{time: string, text: string, isFinal: boolean}[]>([]);

  // Initialize MediaPipe
  useEffect(() => {
    const initMediaPipe = async () => {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm"
        );
        // Temporarily intercept console to silence XNNPACK info message
        const originalInfo = console.info;
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        console.info = (...args) => {
           if (args[0] && typeof args[0] === 'string' && args[0].includes('XNNPACK')) return;
           originalInfo(...args);
        };
        console.log = (...args) => {
           if (args[0] && typeof args[0] === 'string' && args[0].includes('XNNPACK')) return;
           originalLog(...args);
        };
        console.warn = (...args) => {
           if (args[0] && typeof args[0] === 'string' && args[0].includes('XNNPACK')) return;
           originalWarn(...args);
        };
        console.error = (...args) => {
           if (args[0] && typeof args[0] === 'string' && args[0].includes('XNNPACK')) return;
           originalError(...args);
        };

        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "CPU"
          },
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.4,
          minFacePresenceConfidence: 0.4,
          minTrackingConfidence: 0.4
        });
        
        console.info = originalInfo;
        console.log = originalLog;
        console.warn = originalWarn;
        console.error = originalError;
        
        faceLandmarkerRef.current = faceLandmarker;
        console.log("MediaPipe FaceLandmarker loaded.");
      } catch (error) {
        console.error("Failed to init MediaPipe:", error);
      }
    };
    initMediaPipe();

    return () => {
       if (faceLandmarkerRef.current) {
         try {
           faceLandmarkerRef.current.close();
         } catch(e) {
           console.error(e);
         }
       }
    };
  }, []);

  const handleUserMedia = useCallback((stream: MediaStream) => {
    let sourceNode: MediaStreamAudioSourceNode | null = null;
    // 1. Setup Audio processing (Web Audio API) for live stress/volume mapping
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      
      sourceNode = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      sourceNode.connect(analyser);
      audioAnalyserRef.current = analyser;
      console.log("AudioContext and Analyser connected via WebRTC stream.");
    } catch (err) {
      console.error("Failed to initialize Web Audio API", err);
    }

    // 2. Setup MediaRecorder for "chunking" (backend streaming simulation)
    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0 && isAnalyzing) {
           // In a full implementation, we'd send these chunks to the backend via WebSocket
        }
      };
      
      mediaRecorder.start(256); // 256ms chunks
      mediaRecorderRef.current = mediaRecorder;
      console.log("MediaRecorder started, pushing chunks.");
    } catch (err) {
      console.error("MediaRecorder init failed", err);
    }
    
    // 3. Start live audio stress analysis loop using Meyda
    let meydaAnalyzer: any = null;
    try {
      if (!audioContextRef.current || !sourceNode) throw new Error("Audio setup incomplete");
      meydaAnalyzer = Meyda.createMeydaAnalyzer({
        audioContext: audioContextRef.current,
        source: sourceNode,
        bufferSize: 512,
        featureExtractors: ['mfcc', 'energy', 'zcr', 'spectralCentroid'],
        callback: (features: any) => {
          if (!isAnalyzing) return;
          
          if (features && features.energy > 0.1) {
            // Calculate pseudo "stress proxy" based on MFCC variance, zero crossing rate, and spectral centroid
            const mfccs = features.mfcc || [];
            let mfccVariance = 0;
            for(let i=1; i<mfccs.length; i++) {
               mfccVariance += Math.abs(mfccs[i] - mfccs[i-1]);
            }
            
            // High ZCR (instability), high MFCC variance, and higher spectral centroid (pitch/brightness)
            // can indicate stress/pitch instability
            let newStress = 20 + (mfccVariance * 3) + (features.zcr * 0.5) + (features.spectralCentroid * 0.2) + (features.energy * 2);
            
            // Smooth the stress over frames
            currentAudioStressRef.current = currentAudioStressRef.current * 0.8 + Math.min(100, newStress) * 0.2;
          } else {
            // Silence degrades stress to baseline
            currentAudioStressRef.current = currentAudioStressRef.current * 0.95 + 10 * 0.05;
          }
        }
      });
      meydaAnalyzer.start();
      meydaAnalyzerRef.current = meydaAnalyzer;
    } catch (err) {
      console.error("Meyda init failed", err);
    }
  }, [isAnalyzing]);

  const predictWebcam = useCallback(() => {
    if (
      !isAnalyzing || 
      !webcamRef.current || 
      !webcamRef.current.video || 
      !canvasRef.current || 
      !faceLandmarkerRef.current
    ) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    
    if (video.readyState !== 4) {
      requestRef.current = requestAnimationFrame(predictWebcam);
      return;
    }

    // Sync canvas size
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const startTimeMs = performance.now();
    const results = faceLandmarkerRef.current.detectForVideo(video, startTimeMs);

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (results.faceLandmarks) {
      const drawingUtils = new DrawingUtils(ctx);
      for (const landmarks of results.faceLandmarks) {
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
          color: "rgba(0, 255, 0, 0.2)",
          lineWidth: 1
        });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "rgba(255,49,49,1)" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "rgba(255,49,49,1)" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: "rgba(0,255,0,0.8)" });
      }
    }
    
    if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
       const categories = results.faceBlendshapes[0].categories;
       let stressScore = 0;
       
       // Calculate stress based on specific facial action units (micro-expressions)
       const stressCategories = [
         "browDownLeft", "browDownRight", "browInnerUp",
         "eyeSquintLeft", "eyeSquintRight",
         "jawTighten", "mouthFrownLeft", "mouthFrownRight",
         "mouthDimpleLeft", "mouthDimpleRight",
         "mouthPressLeft", "mouthPressRight"
       ];
       
       categories.forEach((cat: any) => {
          if (stressCategories.includes(cat.categoryName)) {
             stressScore += cat.score;
          }
       });
       
       let poseStress = 0;
       if (results.facialTransformationMatrixes && results.facialTransformationMatrixes.length > 0) {
          const matrix = results.facialTransformationMatrixes[0].data;
          if (previousHeadPoseRef.current) {
             let delta = 0;
             for (let i = 0; i < 16; i++) {
                delta += Math.abs(matrix[i] - previousHeadPoseRef.current.matrix[i]);
             }
             // Exaggerate micro-movements of the head as anxiety proxy
             poseStress = delta * 25; 
          }
          previousHeadPoseRef.current = { matrix: Array.from(matrix) };
       }
       
       // Normalize to 0-100 (assuming max active AUs around 3.0 sum)
       let normalizedStress = Math.min(100, ((stressScore / 3.0) * 100) + poseStress);
       
       // Smooth out the visual stress readings
       currentVisualStressRef.current = currentVisualStressRef.current * 0.8 + normalizedStress * 0.2;
    }

    ctx.restore();

    requestRef.current = requestAnimationFrame(predictWebcam);
  }, [isAnalyzing]);

  useEffect(() => {
    if (isAnalyzing) {
      requestRef.current = requestAnimationFrame(predictWebcam);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isAnalyzing, predictWebcam]);

  const questionIndexRef = useRef(-1);

  // Sync ref with state
  useEffect(() => {
    questionIndexRef.current = questionIndex;
  }, [questionIndex]);

  // Setup SpeechRecognition
  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscripts: string[] = [];
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
             finalTranscripts.push(event.results[i][0].transcript);
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscripts.length > 0 || interimTranscript) {
          setTranscriptionContext(prev => {
             const newCtx = [...prev.filter(item => item.isFinal)]; // Remove previous interims
             
             finalTranscripts.forEach(text => {
                newCtx.push({ time: new Date().toLocaleTimeString(), text, isFinal: true });
             });
             
             if (interimTranscript) {
                newCtx.push({ time: new Date().toLocaleTimeString(), text: interimTranscript, isFinal: false });
             }
             return newCtx;
          });
        }
      };

      recognition.onerror = (event: any) => {
         // Silently handle common errors like network or no-speech
         console.warn("Speech recognition error:", event.error);
      };

      recognition.onend = () => {
         // Auto-restart if we are still analyzing
         if (isAnalyzingRef.current && recognitionRef.current) {
             try { recognitionRef.current.start(); } catch (e) {}
         }
      };

      recognitionRef.current = recognition;
    } else {
       console.warn("SpeechRecognition API not supported in this browser.");
    }
    
    return () => {
       if (recognitionRef.current) {
          try { recognitionRef.current.abort(); } catch (e) {}
       }
    }
  }, []);

  useEffect(() => {
    isAnalyzingRef.current = isAnalyzing;
  }, [isAnalyzing]);

  // Keystroke monitor logic
  const handleKeyDown = useCallback(() => {
    const now = performance.now();
    if (lastKeyTimeRef.current !== 0) {
      const flightTime = now - lastKeyTimeRef.current;
      flightTimesRef.current.push(flightTime);
      if (flightTimesRef.current.length > 20) flightTimesRef.current.shift(); // Keep last 20 strokes
      
      // Calculate variance as proxy for cognitive load
      if (flightTimesRef.current.length > 5) {
        const mean = flightTimesRef.current.reduce((a, b) => a + b) / flightTimesRef.current.length;
        const variance = flightTimesRef.current.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / flightTimesRef.current.length;
        // Map variance to a 0-100 stress score heuristically
        const loadScore = Math.min(100, Math.max(0, (Math.sqrt(variance) / mean) * 100));
        typingStressRef.current = loadScore;
      }
    }
    lastKeyTimeRef.current = now;
  }, []);

  const hasAnswered = typedAnswer.trim().length > 2 || transcriptionContext.length > 0;

  const handleNextQuestion = useCallback(() => {
    if (questionIndex >= sessionQuestions.length - 1) {
       setIsAnalyzing(false);
       setShowSummary(true);
       
       const durationMs = performance.now() - sessionStartTimeRef.current;
       const durationMins = Math.floor(durationMs / 60000);
       const durationSecs = Math.floor((durationMs % 60000) / 1000);
       const pmax = maxStressRef.current;
       const status = pmax > 75 ? "FLAGGED" : pmax > 40 ? "REVIEW_NEEDED" : "CLEARED";
       
       addSession({
         subject: `Subject ${Math.floor(Math.random() * 900) + 100}`,
         date: new Date().toLocaleString(),
         duration: `${durationMins.toString().padStart(2, '0')}m ${durationSecs.toString().padStart(2, '0')}s`,
         maxStress: Math.round(pmax),
         status: status
       });
    } else {
       setQuestionIndex(prev => prev + 1);
    }
    setTypedAnswer("");
    setTranscriptionContext([]);
  }, [questionIndex, sessionQuestions.length]);

  useEffect(() => {
    if (autoApprove && isAnalyzing && questionIndex > 0 && hasAnswered) {
      const timer = setTimeout(() => {
         handleNextQuestion();
      }, 5000);
      autoAdvTimerRef.current = timer;
      return () => clearTimeout(timer);
    }
  }, [autoApprove, isAnalyzing, questionIndex, hasAnswered, typedAnswer, transcriptionContext, handleNextQuestion]);

  // Session Management (Questions & Mock telemetry)
  useEffect(() => {
    let questionTimer: NodeJS.Timeout;
    let dataInterval: NodeJS.Timeout;

    if (isAnalyzing) {
      // Start session
      fusionEngineRef.current.resetBaseline();
      setData(generateMockData());
      sessionStartTimeRef.current = performance.now();
      maxStressRef.current = 0;
      
      const shuffled = [...QUESTION_BANK].sort(() => 0.5 - Math.random());
      const selected = ["Establishing Baseline...", ...shuffled.slice(0, 7)];
      setSessionQuestions(selected);
      setQuestionIndex(0);
      setCurrentScore(25);

      // Auto-advance past baseline establishment after 5 seconds
      questionTimer = setTimeout(() => {
        setQuestionIndex(1);
      }, 5000);
      
      // Start Transcription
      setTranscriptionContext([]);
      if (recognitionRef.current) {
         try { recognitionRef.current.start(); } catch (e) { console.warn("Failed to start speech recognition", e); }
      }

      // Data telemetry
      let timeCounter = 19;
      dataInterval = setInterval(() => {
        timeCounter++;
        setData((prev) => {
          const newData = [...prev.slice(1)];
          // Extrapolate independent stream signals
          const visual = currentVisualStressRef.current || 10;
          const audio = currentAudioStressRef.current; // Real-time value from Web Audio API
          const keystrokes = typingStressRef.current; 
          
          // For linguistics, mock cognitive load based on answer length & keystroke hesitation
          const textLength = typedAnswer.trim().length;
          const linguistics = textLength > 0 ? Math.min(100, (100 / textLength) * 20 + (typingStressRef.current * 0.3)) : 20;

          // Execute Multimodal Fusion
          const fusionEngine = fusionEngineRef.current;
          const fusionResult = fusionEngine.calculateProbability(visual, audio, linguistics, keystrokes);

          newData.push({
            time: timeCounter,
            visualStress: visual,
            audioStress: audio,
            fusionProbability: fusionResult.score,
            dominantModality: fusionResult.dominantModality,
            isCalibrating: fusionResult.isCalibrating,
            verdict: fusionResult.verdict,
            confidence: fusionResult.confidence,
            explanations: fusionResult.explanations
          });
          
          if (fusionResult.score > maxStressRef.current && !fusionResult.isCalibrating) {
             maxStressRef.current = fusionResult.score;
          }
          
          setCurrentScore(Math.round(fusionResult.score));
          // Degrade typing stress naturally if no keys pressed
          if (performance.now() - lastKeyTimeRef.current > 2000) {
             typingStressRef.current = Math.max(0, typingStressRef.current - 5);
          }

          return newData;
        });
      }, 1000);
      
    } else {
      // Terminate Session Cleanup
      setQuestionIndex(-1);
      setData(generateMockData());
      setCurrentScore(0);
      setTypedAnswer("");
      flightTimesRef.current = [];
      typingStressRef.current = 0;
      
      if (audioAnimationFrameRef.current) {
        cancelAnimationFrame(audioAnimationFrameRef.current);
        audioAnimationFrameRef.current = 0;
      }
      
      if (meydaAnalyzerRef.current) {
        try {
          meydaAnalyzerRef.current.stop();
        } catch (e) {
          console.error(e);
        }
        meydaAnalyzerRef.current = null;
      }
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
        console.log("MediaRecorder stopped.");
      }
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch(e) {
          console.error(e);
        }
        audioContextRef.current = null;
        console.log("AudioContext closed.");
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch(e) {}
      }
    }

    return () => {
      clearTimeout(questionTimer);
      clearInterval(dataInterval);
    };
  }, [isAnalyzing]);

  // Determine current active question
  const currentQuestionText = questionIndex >= 0 && sessionQuestions.length > 0 
      ? sessionQuestions[Math.min(questionIndex, sessionQuestions.length - 1)] 
      : "System idle. Awaiting session start.";

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter text-white">Live Intelligence Dashboard</h1>
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40 mt-1">Multi-modal behavioral analysis & stress probability mapping</p>
        </div>
        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-white/10 px-3 py-1.5 hover:bg-white/10 transition-colors">
            <span className={cn("text-[8px] uppercase tracking-[0.2em] font-bold", autoApprove ? "text-[#00FF00]" : "text-white/40")}>Auto-Advance</span>
            <div className={cn("w-6 h-3 border transition-colors relative", autoApprove ? "bg-[#00FF00]/20 border-[#00FF00]" : "bg-black border-white/20")}>
               <input type="checkbox" checked={autoApprove} onChange={() => setAutoApprove(!autoApprove)} className="hidden" />
               <div className={cn("absolute top-0.5 bottom-0.5 w-2 bg-white transition-all", autoApprove ? "left-[10px] bg-[#00FF00]" : "left-0.5 bg-white/40")} />
            </div>
          </label>
          <button
            onClick={() => setIsAnalyzing(!isAnalyzing)}
            className={cn(
              "px-4 py-1.5 font-mono text-[10px] uppercase font-black tracking-widest transition-all border",
              isAnalyzing 
                ? "bg-white/5 text-[#FF3131] border-[#FF3131]/50 hover:bg-[#FF3131]/10" 
                : "bg-white/5 text-[#00FF00] border-white/20 hover:border-[#00FF00]/50"
            )}
          >
            <span className="relative z-10 flex items-center">
              {isAnalyzing ? (
                <>
                  <div className="w-2 h-2 bg-[#FF3131] animate-pulse mr-2" />
                  END SESSION
                </>
              ) : (
                <>
                  <ScanFace className="w-3 h-3 mr-2" />
                  INITIATE ANALYSIS
                </>
              )}
            </span>
          </button>
        </div>
      </header>

      {/* Question Engine Overlay */}
      {isAnalyzing && (
         <div className="flex flex-col gap-4">
           <div className="w-full bg-[#00FF00]/5 border border-[#00FF00]/20 p-4 flex items-start gap-4">
              <div className="bg-[#00FF00]/20 p-2 text-[#00FF00]">
                 <FileText className="w-5 h-5" />
              </div>
              <div className="flex-1">
                 <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#00FF00]/70 mb-1">Active Interrogation Prompt {questionIndex > 0 && sessionQuestions.length > 0 ? `(${questionIndex}/${sessionQuestions.length - 1})` : ''}</h3>
                                   <p className="font-mono text-lg text-[#E0E0E0]">{currentQuestionText}</p>
               </div>
               {questionIndex > 0 && (
                 <div className="flex-shrink-0 flex items-center justify-center">
                    <button 
                      onClick={handleNextQuestion}
                      disabled={!hasAnswered}
                      className={cn(
                        "px-4 py-2 font-mono text-[10px] uppercase font-black tracking-widest transition-all border",
                        hasAnswered 
                          ? "bg-[#00FF00]/10 text-[#00FF00] border-[#00FF00]/50 hover:bg-[#00FF00]/20" 
                          : "bg-white/5 text-white/30 border-white/10 cursor-not-allowed"
                      )}
                    >
                      {questionIndex >= sessionQuestions.length - 1 ? 'Conclude Analysis' : 'Next Prompt'}
                    </button>
                 </div>
               )}
            </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="w-full bg-black border border-white/5 p-4 flex flex-col min-h-[120px]">
                <h3 className="text-[10px] uppercase font-bold text-white/40 mb-2">Subject Response Panel <span className="text-white/20">(Keystroke Dynamics Active)</span></h3>
                <textarea
                  className="w-full h-full bg-neutral-900/50 border border-white/10 text-white p-3 font-mono text-sm outline-none focus:border-[#00FF00]/50 transition-colors resize-none flex-1"
                  placeholder="Subject typing response here..."
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
             </div>

             <div className="w-full bg-black border border-white/5 p-4 flex flex-col min-h-[120px] max-h-[120px]">
                <h3 className="text-[10px] uppercase font-bold text-[#00FF00]/80 mb-2 flex items-center">
                  <Mic className="w-3 h-3 mr-2" /> Live Audio Transcription
                </h3>
                <div className="flex-1 overflow-y-auto font-mono text-sm text-white/80 pr-2 space-y-1">
                   {transcriptionContext.length === 0 && <span className="text-white/30 italic">Awaiting speech input via WebRTC...</span>}
                   {transcriptionContext.map((item, idx) => (
                      <span key={idx} className={item.isFinal ? "text-white" : "text-white/50 italic transition-all"}>
                         {item.text}{" "}
                      </span>
                   ))}
                </div>
             </div>
           </div>
         </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Video Canvas Section */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-panel relative overflow-hidden flex-1 border border-white/5 flex items-center justify-center bg-black min-h-[300px]">
            {isAnalyzing ? (
              <>
                <Webcam 
                  audio={true}
                  muted={true}
                  onUserMedia={handleUserMedia}
                  ref={webcamRef} 
                  className="absolute inset-0 w-full h-full object-cover opacity-70 grayscale"
                  videoConstraints={{ facingMode: "user" }}
                  audioConstraints={{ 
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                  }}
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none mix-blend-screen" 
                />
                {/* Simulated UI Overlay */}
                <div className="absolute inset-0 border-[0.5px] border-white/5 flex flex-col justify-between p-4 pointer-events-none">
                     <div className="flex justify-between">
                       <div className="w-12 h-12 border-t border-l border-[#00FF00]"></div>
                       <div className="w-12 h-12 border-t border-r border-[#00FF00]"></div>
                     </div>
                     <div className="flex justify-between">
                       <div className="w-12 h-12 border-b border-l border-[#00FF00]"></div>
                       <div className="w-12 h-12 border-b border-r border-[#00FF00]"></div>
                     </div>
                  </div>
                
                <div className="absolute inset-0 m-4 pointer-events-none">
                    <div className="absolute top-6 left-6 text-[10px] font-mono text-[#00FF00] bg-black/80 px-2 py-1">
                      REC // 60FPS
                    </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500">
                <ScanFace className="w-16 h-16 mb-4 opacity-50" />
                <p className="font-mono text-[10px] tracking-widest uppercase font-bold">System Standby</p>
              </div>
            )}
          </div>
          
          {/* Main Chart */}
          <div className="glass-panel p-4 h-56 flex flex-col">
            <h3 className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40 mb-4 flex items-center">
              <Activity className="w-3 h-3 mr-2 text-blue-500" />
              Integrated Fusion Waveform
            </h3>
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="time" hide />
                  <YAxis stroke="#444" tick={{ fill: '#666', fontSize: 10 }} domain={[0, 100]} />
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Line type="monotone" dataKey="fusionProbability" stroke="var(--color-neon-cyan)" strokeWidth={2} dot={false} isAnimationActive={false} name="Fusion Probability %" />
                  <Line type="stepAfter" dataKey="visualStress" stroke="var(--color-neon-blue)" strokeWidth={1} dot={false} opacity={0.6} isAnimationActive={false} name="Visual (AUs)" />
                  <Line type="stepAfter" dataKey="audioStress" stroke="var(--color-neon-red)" strokeWidth={1} dot={false} opacity={0.6} isAnimationActive={false} name="Audio (MFCC)" />
                </LineChart>
              </ResponsiveContainer>
              {currentScore > 75 && (
                <div className="absolute top-0 right-0 bg-red-500/20 text-[#FF3131] border border-[#FF3131]/50 px-2 py-1 text-[9px] font-black uppercase tracking-widest animate-pulse">
                  Anomaly Spike
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel Metrics */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 flex flex-col items-center justify-center relative overflow-hidden">
            <div className={cn(
              "absolute inset-0 opacity-10 transition-colors duration-500",
              currentScore > 75 ? "bg-neon-red" : currentScore > 40 ? "bg-neon-yellow" : "bg-neon-green"
            )} />
            <h3 className="text-[11px] font-black tracking-[0.3em] uppercase text-white/40 mb-2 w-full text-left">
               Anomalous Probability
            </h3>
            
            <div className="flex items-baseline gap-4 w-full justify-start mt-4">
              {data[data.length - 1]?.isCalibrating ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-2xl font-black text-[#00FF00] tracking-widest uppercase flex flex-col"
                >
                  <span className="text-[40px]">CALIBRATING</span>
                  <span className="text-[12px] opacity-70">Establishing Baseline</span>
                </motion.div>
              ) : (
                <>
                  <motion.span 
                    key={currentScore}
                    initial={{ opacity: 0.5, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className={cn(
                    "text-[80px] font-black leading-none tracking-tighter",
                    currentScore > 75 ? "text-[#FF3131]" : currentScore > 40 ? "text-[#f97316]" : "text-[#00FF00]"
                  )}>
                    {currentScore}
                  </motion.span>
                  <div className="flex flex-col">
                    <span className={cn(
                       "text-2xl font-black",
                       currentScore > 75 ? "text-[#FF3131]" : currentScore > 40 ? "text-[#f97316]" : "text-[#00FF00]"
                    )}>%</span>
                    <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                       {currentScore > 75 ? "Level: High" : currentScore > 40 ? "Level: Mod" : "Level: Low"}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="w-full h-1 bg-white/10 mt-6 relative">
               <div className={cn("h-full transition-all duration-500 ease-out", currentScore > 75 ? "bg-[#FF3131]" : currentScore > 40 ? "bg-[#f97316]" : "bg-[#00FF00]")} style={{ width: `${currentScore}%` }}></div>
            </div>
          </div>

          <div className="glass-panel p-4 flex-1 overflow-y-auto">
             <h3 className="text-[10px] font-black tracking-widest uppercase text-white/40 mb-4 sticky top-0 bg-[#050505]/90 backdrop-blur pb-2 flex items-center gap-2">
              <motion.span 
                animate={isAnalyzing ? { opacity: [1, 0.3, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                className={cn("w-1 h-3", isAnalyzing ? "bg-[#00FF00]" : "bg-white/20")}
              /> Explainability Engine
            </h3>
            <div className="space-y-3 font-mono text-[11px]">
              {data.slice(-8).reverse().map((d, i) => (
                <motion.div 
                  key={d.time}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex gap-4 border-b border-white/5 pb-2"
                >
                  <span className={cn(
                    d.fusionProbability > 75 ? "text-[#FF3131]" : d.fusionProbability > 40 ? "text-[#f97316]" : "text-[#00FF00]"
                  )}>
                    [{String(d.time).padStart(4, '0')}ms]
                  </span>
                  <span className="text-white/80">
                  {d.fusionProbability > 75 ? (
                    <span className="uppercase font-bold text-[#FF3131]">Anomaly Spike: Elevated variance in {d.dominantModality || 'Modality'}.</span>
                  ) : d.fusionProbability > 40 ? (
                    <span className="text-white/70">Elevated activity tracing from {d.dominantModality || 'Visual'} analysis.</span>
                  ) : (
                    <span className="text-white/50">Baseline normalization active.</span>
                  )}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Summary Modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel p-8 max-w-2xl w-full flex flex-col gap-6"
          >
            <h2 className="text-2xl font-black text-[#00FF00] tracking-widest uppercase border-b border-white/10 pb-4">Analysis Concluded</h2>
            
            {data.length > 0 ? (
              (() => {
                const finalState = data[data.length - 1];
                const verdictColor = finalState.verdict === 'DECEPTION' ? 'text-[#FF3131]' : finalState.verdict === 'TRUTH' ? 'text-[#00FF00]' : 'text-[#f97316]';
                
                return (
                  <>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Final Verdict</span>
                        <span className={cn("text-4xl font-black", verdictColor)}>
                          {finalState.verdict || 'INCONCLUSIVE'}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Confidence Score</span>
                        <div className="flex items-end gap-1">
                          <span className={cn("text-4xl font-black", verdictColor)}>{Math.round(finalState.confidence || 0)}</span>
                          <span className="text-xl font-bold mb-1 opacity-60">%</span>
                        </div>
                      </div>
                    </div>

                    <div>
                       <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">Multimodal Findings</h3>
                       {finalState.explanations && finalState.explanations.length > 0 ? (
                         <ul className="list-disc list-inside text-white/80 space-y-2 font-mono text-xs pl-2">
                           {finalState.explanations.map((exp: string, idx: number) => (
                             <li key={idx} className={exp.includes('spike') || exp.includes('suppression') ? "text-[#f97316]" : ""}>
                               {exp}
                             </li>
                           ))}
                         </ul>
                       ) : (
                         <p className="font-mono text-xs text-white/40 italic">No significant variations recorded.</p>
                       )}
                    </div>
                  </>
                );
              })()
            ) : (
               <p className="text-center font-mono text-white/40">Insufficient data gathered for comprehensive analysis.</p>
            )}

            
            <button 
              onClick={() => setShowSummary(false)}
              className="mt-4 w-full bg-[#00FF00]/10 hover:bg-[#00FF00]/20 text-[#00FF00] font-bold py-3 rounded-none uppercase tracking-widest border border-[#00FF00]/30 transition-colors"
            >
              Export & Close Report
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
