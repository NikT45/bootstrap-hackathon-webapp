'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import Webcam from 'react-webcam';
export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [utterances, setUtterances] = useState([]);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [evaluationScore, setEvaluationScore] = useState(50);
  const [evaluationAnalysis, setEvaluationAnalysis] = useState('');
  const [evalMetric, setEvalMetric] = useState('romance');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [moves, setMoves] = useState([]);
  const [lastAnalyzedUtterance, setLastAnalyzedUtterance] = useState(null);

  const deepgramRef = useRef(null);
  const connectionRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const analysisTimeoutRef = useRef(null);
  const transcriptionContainerRef = useRef(null);




  const API_KEY = process.env.NEXT_PUBLIC_HUME_API_KEY;
  // debug log so devs can see in browser console whether the env is exposed
  if (typeof window !== 'undefined') {
    console.debug('NEXT_PUBLIC_HUME_API_KEY:', API_KEY);
  }
  const endpoint = `wss://api.hume.ai/v0/stream/models?api_key=${API_KEY}`;
  const webcamRef = useRef(null);
  const emotionData = useRef([]);
  //const [isRecording, setIsRecording] = useState(false);
  const [latestEmotions, setLatestEmotions] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [debugInfo, setDebugInfo] = useState('');
  const wsRef = useRef(null);
  const intervalRef = useRef(null);
  
  const startEmotionDetection = () => {
    console.log('🚀 Starting emotion detection...');
    setConnectionStatus('connecting');
    
    wsRef.current = new WebSocket(endpoint);
    let count = 0;

    wsRef.current.onopen = () => {
      console.log("✅ Connected to Hume AI WebSocket");
      setConnectionStatus('connected');

      const intervalTime = 1000;
      intervalRef.current = setInterval(() => {
        if (!webcamRef.current) {
          console.warn('⚠️ Webcam ref not available');
          setDebugInfo('Webcam not initialized');
          return;
        }

        const imageData = webcamRef.current.getScreenshot();
        console.log('📸 Screenshot captured:', imageData ? 'Yes' : 'No');
        
        if (imageData) {
          const base64Data = imageData.split(",")[1];
          const message = {
            data: base64Data,
            models: { face: {} },
          };
          wsRef.current.send(JSON.stringify(message));
          count++;
          setDebugInfo(`Sent ${count} frames`);
          console.log(`📤 Sent frame #${count}`);
        } else {
          setDebugInfo('No screenshot data available');
        }
      }, intervalTime);
    };
    
    wsRef.current.onmessage = (event) => {
      console.log('📨 Received message from Hume');
      const response = JSON.parse(event.data);
      console.log('Full response:', response);
      
      if (
        response.face &&
        response.face.predictions &&
        response.face.predictions[0] &&
        response.face.predictions[0].emotions
      ) {
        const emotions = response.face.predictions[0].emotions;
        emotionData.current.push(emotions);
        console.log('😊 Emotions detected:', emotions);
        setLatestEmotions(emotions);
        setDebugInfo(`Received ${emotionData.current.length} emotion responses`);
      } else {
        console.log('⚠️ Response structure unexpected:', response);
        setDebugInfo('Received response but no emotions found');
      }
    };
    
    wsRef.current.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setConnectionStatus('error');
      setDebugInfo('WebSocket error - check console');
    };
    
    wsRef.current.onclose = () => {
      console.log('🔌 WebSocket closed');
      setConnectionStatus('disconnected');
    };
  };

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (wsRef.current) {
        try { wsRef.current.close(); } catch (e) {}
        wsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (connectionRef.current) {
      connectionRef.current.finish();
      connectionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      // Handle Web Audio API cleanup
      if (mediaRecorderRef.current.processor) {
        mediaRecorderRef.current.processor.disconnect();
      }
      if (mediaRecorderRef.current.source) {
        mediaRecorderRef.current.source.disconnect();
      }
      if (mediaRecorderRef.current.audioContext) {
        mediaRecorderRef.current.audioContext.close();
      }
      mediaRecorderRef.current = null;
    }
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
  };

  // Function to scroll to bottom of transcription container
  const scrollToBottom = () => {
    if (transcriptionContainerRef.current) {
      transcriptionContainerRef.current.scrollTop = transcriptionContainerRef.current.scrollHeight;
    }
  };

  // Debounced analysis for new utterances
  const scheduleAnalysisForNewUtterance = (newUtterance, allUtterances) => {
    // Clear any existing timeout
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    
    // Schedule new analysis
    analysisTimeoutRef.current = setTimeout(() => {
      analyzeNewUtterance(newUtterance, allUtterances);
    }, 500);
  };

  const analyzeNewUtterance = async (newUtterance, allUtterances) => {
    try {
      // Only analyze Speaker 0 utterances
      if (newUtterance.speaker !== 0) {
        return;
      }

      // Don't re-analyze the same utterance
      if (lastAnalyzedUtterance && 
          lastAnalyzedUtterance.text === newUtterance.text && 
          lastAnalyzedUtterance.timestamp === newUtterance.timestamp) {
        console.log('🚫 Utterance already analyzed');
        return;
      }

      setIsAnalyzing(true);
      
      // Format all utterances for context
      const transcriptions = allUtterances.map(utterance => ({
        speaker: utterance.speaker,
        text: utterance.text
      }));

      console.log('🧠 Analyzing new utterance:', newUtterance.text);
      console.log('📤 Sending to backend:', { 
        transcriptions, 
        new_text: newUtterance.text, 
        emotions: [], 
        eval_metric: evalMetric 
      });

      const response = await fetch('http://127.0.0.1:5000/analyze_conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptions: transcriptions,
          new_text: newUtterance.text,
          emotions: latestEmotions,
          eval_metric: evalMetric
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('📊 Analysis result:', result);
        
        // Apply score multiplier to current score
        const scoreMultiplier = result.score_multiplier || 1.0;
        setEvaluationScore(prevScore => {
          const newScore = Math.round(prevScore * scoreMultiplier);
          // Keep score within bounds (0-100)
          const boundedScore = Math.max(0, Math.min(100, newScore));
          console.log(`📊 Score update: ${prevScore} × ${scoreMultiplier} = ${newScore} → ${boundedScore}`);
          return boundedScore;
        });
        
        // Add new moves with the utterance reference
        if (result.moves && result.moves.length > 0) {
          const movesWithUtterance = result.moves.map(move => ({
            ...move,
            utterance: newUtterance // Store reference to the utterance
          }));
          
          setMoves(prevMoves => [...prevMoves, ...movesWithUtterance]);
        }
        
        // Mark this utterance as analyzed
        setLastAnalyzedUtterance(newUtterance);
        setEvaluationAnalysis(''); // No longer using analysis
      } else {
        console.error('❌ Analysis error:', result.error);
      }
    } catch (error) {
      console.error('❌ Failed to analyze utterance:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startConversation = async () => {
    try {
      setError('');
      setUtterances([]);
      setPartialTranscript('');
      setEvaluationScore(50);
      setEvaluationAnalysis('');
      setMoves([]);
      setLastAnalyzedUtterance(null);
      setIsAnalyzing(false);
      setStatus('Getting API key...');

      // Get Deepgram API key from server
      const keyResponse = await fetch('/api/deepgram-key');
      if (!keyResponse.ok) {
        throw new Error('Failed to get Deepgram API key');
      }
      const { apiKey } = await keyResponse.json();

      // Initialize Deepgram client
      const deepgram = createClient(apiKey);
      deepgramRef.current = deepgram;

      setStatus('Connecting to Deepgram...');

      // Create live transcription connection
      const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        diarize: true,
        punctuate: true,
        interim_results: true,
        endpointing: 300,
        vad_events: true,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1,
      });

      connectionRef.current = connection;

      // Set up event listeners
      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('✅ Deepgram connection opened');
        console.log('🔗 Connection ready state:', connectionRef.current?.getReadyState());
        setStatus('Connected to Deepgram');
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        console.log('📩 Received transcript data:', data);
        
        // Log the full structure to debug
        if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
          const alternative = data.channel.alternatives[0];
          console.log('🔍 Alternative data:', alternative);
          console.log('🔍 Transcript:', alternative.transcript);
          console.log('🔍 Words:', alternative.words);
        }
        
        if (data.channel && data.channel.alternatives && data.channel.alternatives[0]) {
          const alternative = data.channel.alternatives[0];
          
          // Handle interim results (partial transcripts)
          if (!data.is_final && alternative.transcript) {
            console.log('📝 Interim transcript:', alternative.transcript);
            setPartialTranscript(alternative.transcript);
          }
          
          // Handle final results with speaker diarization
          if (data.is_final && alternative.transcript) {
            console.log('✅ Final transcript:', alternative.transcript);
            
            // Group words by speaker to create utterances
            if (alternative.words && alternative.words.length > 0) {
              console.log('👥 Processing words with speakers:', alternative.words);
              const groupedUtterances = groupWordsBySpeaker(alternative.words);
              if (groupedUtterances.length > 0) {
                setUtterances(prev => {
                  const newUtterances = [...prev, ...groupedUtterances];
                  // Trigger analysis for the last new utterance (if it's Speaker 0)
                  const lastNewUtterance = groupedUtterances[groupedUtterances.length - 1];
                  if (lastNewUtterance && lastNewUtterance.speaker === 0) {
                    scheduleAnalysisForNewUtterance(lastNewUtterance, newUtterances);
                  }
                  // Scroll to bottom to show new utterances
                  setTimeout(scrollToBottom, 100);
                  return newUtterances;
                });
              }
            } else if (alternative.transcript.trim()) {
              // Fallback if no words array but we have transcript
              console.log('📄 Adding transcript without speaker info');
              const newUtterance = {
                speaker: 0,
                text: alternative.transcript,
                timestamp: Date.now()
              };
              setUtterances(prev => {
                const newUtterances = [...prev, newUtterance];
                // Trigger analysis for the new utterance (if it's Speaker 0)
                if (newUtterance.speaker === 0) {
                  scheduleAnalysisForNewUtterance(newUtterance, newUtterances);
                }
                // Scroll to bottom to show new utterance
                setTimeout(scrollToBottom, 100);
                return newUtterances;
              });
            }
            
            setPartialTranscript('');
          }
        }
      });

      connection.on(LiveTranscriptionEvents.Error, (error) => {
        console.error('❌ Deepgram error:', error);
        setError(`Deepgram error: ${error.message || error}`);
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('🔌 Deepgram connection closed');
        setIsRecording(false);
      });

      connection.on(LiveTranscriptionEvents.Metadata, (data) => {
        console.log('📊 Metadata:', data);
      });

      connection.on(LiveTranscriptionEvents.UtteranceEnd, (data) => {
        console.log('🎯 Utterance end:', data);
      });

      // Get microphone access
      setStatus('Getting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
      streamRef.current = stream;
      console.log('✅ Microphone access granted');

      // Create AudioContext for raw PCM data
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create ScriptProcessor for audio processing
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      processor.onaudioprocess = (event) => {
        if (connectionRef.current) {
          const inputData = event.inputBuffer.getChannelData(0);
          
          // Convert Float32 to Int16 (linear16 format)
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }
          
          console.log('🔊 Sending PCM audio data:', int16Data.length, 'samples');
          connectionRef.current.send(int16Data.buffer);
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      // Store references for cleanup
      mediaRecorderRef.current = { audioContext, processor, source };
      
      console.log('🎙️ Web Audio API setup complete');
      
      setIsRecording(true);
      setStatus('Recording with speaker diarization...');
      console.log('🎤 Recording started with Deepgram');

    } catch (err) {
      console.error('❌ Error starting conversation:', err);
      setError(err.message);
      setStatus('');
      cleanup();
    }
  };

  const stopConversation = () => {
    console.log('🛑 Stopping conversation...');
    cleanup();
    setIsRecording(false);
    setStatus('');
  };

  // Helper function to group words by speaker
  const groupWordsBySpeaker = (words) => {
    const utterances = [];
    let currentUtterance = null;

    words.forEach(word => {
      const speaker = word.speaker !== undefined ? word.speaker : 0;
      
      if (!currentUtterance || currentUtterance.speaker !== speaker) {
        // Start new utterance for new speaker
        if (currentUtterance) {
          utterances.push(currentUtterance);
        }
        currentUtterance = {
          speaker: speaker,
          text: word.word,
          timestamp: Date.now(),
          start: word.start,
          end: word.end
        };
      } else {
        // Continue current utterance
        currentUtterance.text += ' ' + word.word;
        currentUtterance.end = word.end;
      }
    });

    // Add the last utterance
    if (currentUtterance) {
      utterances.push(currentUtterance);
    }

    return utterances;
  };

  // Helper function to get color based on score
  const getScoreColor = (score) => {
    if (score >= 81) return 'bg-green-500';
    if (score >= 61) return 'bg-blue-500';
    if (score >= 41) return 'bg-yellow-500';
    if (score >= 21) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score) => {
    if (score >= 81) return 'Excellent';
    if (score >= 61) return 'Good';
    if (score >= 41) return 'Tactical';
    if (score >= 21) return 'Dubious';
    return 'Poor';
  };

  // Chess move type color mapping
  const getMoveColor = (moveType) => {
    const colors = {
      'BRILLIANT': 'bg-teal-200 text-teal-800 border-teal-300',
      'GREAT': 'bg-blue-200 text-blue-800 border-blue-300',
      'BEST': 'bg-green-200 text-green-800 border-green-300',
      'EXCELLENT': 'bg-green-100 text-green-700 border-green-200',
      'GOOD': 'bg-green-50 text-green-600 border-green-100',
      'BOOK': 'bg-amber-100 text-amber-700 border-amber-200',
      'INACCURACY': 'bg-yellow-200 text-yellow-800 border-yellow-300',
      'MISTAKE': 'bg-orange-200 text-orange-800 border-orange-300',
      'BLUNDER': 'bg-red-200 text-red-800 border-red-300',
      'MISSED_WIN': 'bg-yellow-300 text-yellow-900 border-yellow-400'
    };
    return colors[moveType] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Get move symbol
  const getMoveSymbol = (moveType) => {
    const symbols = {
      'BRILLIANT': '!!',
      'GREAT': '!',
      'BEST': '★',
      'EXCELLENT': '👍',
      'GOOD': '✔️',
      'BOOK': '📖',
      'INACCURACY': '?!',
      'MISTAKE': '?',
      'BLUNDER': '??',
      'MISSED_WIN': '—'
    };
    return symbols[moveType] || '';
  };

  // Function to highlight text with moves using utterance reference
  const highlightText = (text, utterance, speaker) => {
    // Only highlight Speaker 0 utterances
    if (speaker !== 0) {
      return <span>{text}</span>;
    }

    // Find moves for this specific utterance by matching the utterance reference
    const utteranceMoves = moves.filter(move => 
      move.utterance && 
      move.utterance.text === utterance.text && 
      move.utterance.timestamp === utterance.timestamp
    );
    
    if (!utteranceMoves || utteranceMoves.length === 0) {
      return <span>{text}</span>;
    }

    const parts = [];
    let lastIndex = 0;

    // Sort moves by position in text to handle overlapping highlights
    const sortedMoves = utteranceMoves
      .map(move => ({
        ...move,
        index: text.indexOf(move.text)
      }))
      .filter(move => move.index !== -1)
      .sort((a, b) => a.index - b.index);

    sortedMoves.forEach((move, i) => {
      // Add text before highlight
      if (move.index > lastIndex) {
        parts.push(
          <span key={`text-${i}`}>
            {text.substring(lastIndex, move.index)}
          </span>
        );
      }

      // Add highlighted text with tooltip
      parts.push(
        <span
          key={`highlight-${i}`}
          className={`inline-block px-2 py-1 rounded border ${getMoveColor(move.move_type)} cursor-help relative`}
          title={`${move.move_type} ${getMoveSymbol(move.move_type)} - ${move.reason}`}
        >
          {move.text}
          <span className="ml-1 text-xs font-bold opacity-75">
            {getMoveSymbol(move.move_type)}
          </span>
          <span className="absolute -top-1 -right-1 text-xs font-semibold bg-white px-1 rounded shadow-sm border">
            {move.move_type}
          </span>
        </span>
      );

      lastIndex = move.index + move.text.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return <span>{parts}</span>;
  };

  return (
    
    <div className="min-h-screen p-8">
      <div className="fixed top-0 left-0 opacity-0 pointer-events-none">
        <Webcam 
          ref={webcamRef}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: "user"
          }}
        />
      </div>
      {/* Evaluation Bar at Top */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 p-4 z-50">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 min-w-[120px]">
              {evalMetric.charAt(0).toUpperCase() + evalMetric.slice(1)} Score:
            </span>
            <div className="flex-1 bg-gray-200 rounded-full h-6 relative overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${getScoreColor(evaluationScore)}`}
                style={{ width: `${evaluationScore}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700 min-w-[80px]">
              {evaluationScore}/100
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 flex items-center justify-center">
        <div className="text-center max-w-4xl w-full">
          <h1 className="text-3xl font-bold mb-8">Real-time Speaker Diarization</h1>
          <p className="text-gray-600 mb-8">Powered by Deepgram&apos;s live streaming API with AI conversation analysis</p>

        {!isRecording ? (
          <button
            onClick={startConversation}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Start Recording
          </button>
        ) : (
          <button
            onClick={stopConversation}
            className="px-8 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Stop Recording
          </button>
        )}

        {status && (
          <div className="mt-4 text-gray-600 font-medium">
            {status}
          </div>
        )}

        {isRecording && (
          <div className="mt-6 text-green-600 font-semibold flex items-center justify-center gap-2">
            <span className="inline-block w-3 h-3 bg-green-600 rounded-full animate-pulse"></span>
            Live Recording with Speaker Diarization
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Live transcription with speaker labels */}
        {(utterances.length > 0 || partialTranscript) && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 text-left max-h-96 overflow-y-auto" ref={transcriptionContainerRef}>
            <h2 className="text-xl font-semibold mb-4">Live Transcription with Speakers:</h2>
            
            {/* Display completed utterances with speaker labels */}
            <div className="space-y-3 mb-4">
              {utterances.map((utterance, index) => {
                return (
                  <div key={index} className="flex gap-3 p-3 rounded-lg bg-gray-50">
                    <span className="font-semibold text-blue-600 min-w-[100px] flex-shrink-0">
                      Speaker {utterance.speaker}:
                    </span>
                    <span className="text-gray-700 flex-1">
                      {highlightText(utterance.text, utterance, utterance.speaker)}
                    </span>
                    {utterance.start !== undefined && (
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {utterance.start.toFixed(1)}s
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Show current partial transcript */}
            {partialTranscript && (
              <div className="flex gap-3 p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                <span className="font-semibold text-yellow-600 min-w-[100px] flex-shrink-0">
                  Speaking:
                </span>
                <span className="text-yellow-700 italic flex-1">{partialTranscript}</span>
              </div>
            )}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}