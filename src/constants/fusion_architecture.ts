export const FUSION_ARCHITECTURE_MD = `
# Multi-Modal Biometric Fusion: Deep Learning Architecture

## 1. Facial Analysis Module (Visual Modality)
**Capabilities:** Tracks 46 Facial Action Units (AUs), gaze vectors, pupillometry, micro-expressions, and eyelid kinematics (blink rate variance).
**Implementation:** 
- **Client-Side:** Sub-millisecond tracking via MediaPipe Face Mesh utilizing WebAssembly (Webgl-accelerated) for 478-point landmark inference.
- **Server-Side (Target):** OpenCV combined with 3D-CNNs (like OpenFace) to extract dense AU intensity vectors.
**Processing & Features:** Frames cropped using MTCNN face detector, converted to grayscale, and passed to a ResNet-50 backbone. Feature extraction isolates asymmetric lips (AU12/14) and eyebrow tension (AU4) which heavily index cognitive load.

## 2. Voice and Speech Analysis (Audio Modality)
**Capabilities:** Assesses vocal pitch (F0 instability), formants, shimmer, jitter, and Mel-Frequency Cepstral Coefficients (MFCCs).
**Implementation:** 
- **Preprocessing:** Librosa library extracts 13-dimensional MFCCs from 256ms chunked audio streams.
- **Neural Net:** A 4-layer Enhanced Recurrent Neural Network (ERNN) using Bi-Directional LSTM cells models the temporal dependencies of vocal micro-tremors.

## 3. Keystroke Dynamics and Textual Analysis (Behavioral Modality)
**Capabilities:** Analyzes neuro-motor pathways via keystroke timings and verbal content for psychological distancing.
**Implementation & Data Structures:** 
- JavaScript captures \`keydown\` and \`keyup\` precision timestamps.
- **Dwell Time:** \`T_release - T_press\`
- **Flight Time:** \`T_press(n+1) - T_release(n)\`
- **Analysis:** A variance matrix of flight times serves as a direct proxy for cognitive load. High variance = high load. Textual content is asynchronously validated via a RoBERTa language model to flag evasive language.

## 4. Physiological Monitoring (Simulated GSR & rPPG)
**Capabilities:** Non-contact heart rate monitoring and simulated galvanic skin response.
**Implementation:** remote Photoplethysmography (rPPG) isolates the ambient light reflection from the face's green color channel. Fast Fourier Transform (FFT) isolates the blood volume pulse (BVP) frequency peak to estimate BPM.

## 5. Machine Learning Classification Layer (Late Fusion)
**Architecture:** A multi-modal late-fusion Deep Neural Network.
**Training Protocol:** Each stream (Video, Audio, Text/Keystroke) utilizes independent, unimodal feature extractors trained on datasets like RECOLA and DEAP.
**Fusion:** The unimodal embeddings (final hidden layers) are passed into a Multi-Head Attention layer. The network learns dynamic weights (e.g., if audio is noisy, attention shifts to visual).
**Classification:** Output goes through a fully-connected layer with a Softmax activation, distributing probabilities across \`[Calm, Stressed, Deceptive/Anomalous]\`.

---

## Data Flow & Synchronization Architecture
\`\`\`text
[Camera/Mic/Keyboard] -> [WebRTC/Browser APIs] -> [Client-Side Buffers]
-> [WebSocket Multiplexer (Strictly Timestamped)]
   |-> [Video Pipeline: MTCNN -> 3D-CNN -> Visual Embedding]
   |-> [Audio Pipeline: Librosa -> ERNN -> Audio Embedding]
   |-> [Keystroke Pipeline: Timing Matrix -> 1D-CNN -> Behavior Embedding]
-> [Multimodal Attention Fusion Layer] -> [Time-Series Probability Curve]
-> [Redis Pub/Sub] -> [Frontend WS Client] -> [React Dashboard UI]
\`\`\`

## Handling Noise, Calibration, and False Positives
- **Calibration Protocol:** The system enforces a mandatory 2-minute "Baseline" phase asking neutral questions. Subject-specific normalization parameters $(\\mu, \\sigma)$ are computed to convert raw signals into Z-scores.
- **Noise Rejection:** Audio streams use spectral subtraction for ambient noise. Video utilizes Kalman filters against landmark jitter. 
- **False Positive Mitigation:** We enforce a "Consistency Heuristic": Unimodal spikes are downgraded in confidence unless corroborated cross-modally (e.g., voice cracking *without* facial tension may be a false positive; voice cracking *with* AU4 tension is flagged as anomalous).
`;
