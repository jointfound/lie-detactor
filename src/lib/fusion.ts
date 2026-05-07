export class MultimodalFusionEngine {
  private visualWeights = 0.3;
  private audioWeights = 0.3;
  private linguisticWeights = 0.2;
  private behavioralWeights = 0.2;

  private baselineReadings: number[] = [];
  private isCalibrating = true;
  private calibrationOffset = 0;

  constructor(visualWeight?: number, audioWeight?: number, linguisticWeight?: number, behavioralWeight?: number) {
    if (visualWeight) this.visualWeights = visualWeight;
    if (audioWeight) this.audioWeights = audioWeight;
    if (linguisticWeight) this.linguisticWeights = linguisticWeight;
    if (behavioralWeight) this.behavioralWeights = behavioralWeight;
  }

  public get isCalibrated() {
    return !this.isCalibrating;
  }

  public get currentBaselineOffset() {
    return this.calibrationOffset;
  }

  public resetBaseline() {
    this.baselineReadings = [];
    this.isCalibrating = true;
    this.calibrationOffset = 0;
  }

  /**
   * Late fusion algorithm using weighted confidence scoring and temporal smoothing
   * In a full Python backend, this would be a multi-head attention neural network.
   * Here we implement a deterministic heuristic to simulate the ML classification layer.
   */
  public calculateProbability(
    visualAnomalies: number, // 0-100 (Facial AU & Micro-expressions)
    audioStress: number,     // 0-100 (Pitch / MFCCs)
    linguisticLoad: number,  // 0-100 (Text analysis / Distancing)
    behavioralShift: number  // 0-100 (Pose variance / Keystrokes)
  ): { score: number; dominantModality: string; isCalibrating: boolean; verdict: string; confidence: number; explanations: string[] } {
    
    // 1. Feature normalization and weighting
    let wVisual = visualAnomalies * this.visualWeights;
    let wAudio = audioStress * this.audioWeights;
    let wLinguistics = linguisticLoad * this.linguisticWeights;
    let wBehavior = behavioralShift * this.behavioralWeights;

    // Attention Mechanism for Contradictory Signals (e.g. calm voice, panicked face)
    const variance = Math.max(visualAnomalies, audioStress, linguisticLoad, behavioralShift) 
                   - Math.min(visualAnomalies, audioStress, linguisticLoad, behavioralShift);
    
    let explanations: string[] = [];

    if (variance > 50) {
       // High contradiction
       if (audioStress < 30 && visualAnomalies > 70) {
          // Suspect is controlling voice but leaking visuals
          wAudio *= 0.5; // Discount audio
          wVisual *= 1.5; // Heavily weigh visuals
          explanations.push("Vocal delivery consciously controlled while autonomic visual signals spiked.");
       } else if (linguisticLoad > 70 && audioStress < 40) {
          wLinguistics *= 1.5;
          explanations.push("Cognitive linguistic load is high despite calm vocal delivery (indicates script rehearsal).");
       } else {
          explanations.push(`High multi-variable variance detected (${variance.toFixed(1)}%). Possible suppression behavior.`);
       }
    }

    // 2. Non-linear activation for high stress spikes
    const maxSpike = Math.max(visualAnomalies, audioStress, linguisticLoad, behavioralShift);
    let fusionScore = (wVisual + wAudio + wLinguistics + wBehavior);
    
    // Dynamic Baseline Calibration
    if (this.isCalibrating) {
      this.baselineReadings.push(fusionScore);
      // Require 10 ticks (seconds) of baseline for reliable normalized start
      if (this.baselineReadings.length >= 10) { 
        this.isCalibrating = false;
        const mean = this.baselineReadings.reduce((a, b) => a + b) / this.baselineReadings.length;
        this.calibrationOffset = 20 - mean;
      }
      return { score: fusionScore, dominantModality: 'Calibrating Baseline...', isCalibrating: true, verdict: "MEASURING", confidence: 0, explanations: ["Establishing baseline nervous system response."] };
    }

    if (maxSpike > 75) {
       fusionScore += (maxSpike - 75) * 0.45; // Exaggerate critical spikes
    }

    // 3. Calibration adjustment & clamping
    fusionScore = Math.max(0, Math.min(100, fusionScore + this.calibrationOffset));

    // 4. Modality dominance extraction for explainability
    let dominantModality = 'Visual (Micro-expressions)';
    let maxWeight = wVisual;
    
    if (wAudio > maxWeight) { dominantModality = 'Audio (Tremors)'; maxWeight = wAudio; }
    if (wLinguistics > maxWeight) { dominantModality = 'Linguistics (Content)'; maxWeight = wLinguistics; }
    if (wBehavior > maxWeight) { dominantModality = 'Behavioral (Kinesthetics)'; maxWeight = wBehavior; }

    if (visualAnomalies > 65) explanations.push("Detected asymmetric facial micro-expressions.");
    if (audioStress > 65) explanations.push("Fundamental frequency (f0) micro-tremors detected.");
    if (linguisticLoad > 65) explanations.push("High semantic cognitive load or distancing language.");
    if (behavioralShift > 65) explanations.push("Anomalous kinesthetic posture shifts.");

    // Decision Logic
    let verdict = "INCONCLUSIVE";
    let confidence = 0;

    if (fusionScore > 70) {
      verdict = "DECEPTION";
      confidence = Math.min(99, fusionScore + 10);
    } else if (fusionScore < 40) {
      verdict = "TRUTH";
      confidence = 100 - fusionScore;
      if (explanations.length === 0) explanations.push("No significant autonomic stressors detected.");
    } else {
      verdict = "INCONCLUSIVE";
      confidence = 100 - Math.abs(55 - fusionScore); // Closer to boundary = more confident in inconclusiveness
      if (variance > 40) {
         explanations.push("Signal contradictions preventing absolute verdict classification.");
      } else {
         explanations.push("Stressors present but below critical deception threshold.");
      }
    }

    // De-dupe explanations
    explanations = Array.from(new Set(explanations));

    if (explanations.length === 0) explanations.push("Normal baseline variance.");

    return { score: fusionScore, dominantModality, isCalibrating: false, verdict, confidence, explanations };
  }
}
