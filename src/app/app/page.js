'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [utterances, setUtterances] = useState([]);
  const [partialTranscript, setPartialTranscript] = useState('');
  const [evaluationScore, setEvaluationScore] = useState(50);
  const [evaluationAnalysis, setEvaluationAnalysis] = useState('');
  const [evalMetric, setEvalMetric] = useState('rizz');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const deepgramRef = useRef(null);
  const connectionRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

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
  };

  const analyzeConversation = async (currentUtterances) => {
    try {
      setIsAnalyzing(true);
      
      // Format utterances for backend
      const transcriptions = currentUtterances.map(utterance => ({
        speaker: utterance.speaker,
        text: utterance.text
      }));

      console.log('🧠 Analyzing conversation with', transcriptions.length, 'utterances');
      console.log('📤 Sending to backend:', { transcriptions, emotions: [], eval_metric: evalMetric });

      const response = await fetch('http://127.0.0.1:5000/analyze_conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptions: transcriptions,
          emotions: [],
          eval_metric: evalMetric
        })
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('📊 Analysis result:', result);
        setEvaluationScore(result.score);
        setEvaluationAnalysis(result.analysis);
      } else {
        console.error('❌ Analysis error:', result.error);
      }
    } catch (error) {
      console.error('❌ Failed to analyze conversation:', error);
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
                  // Trigger analysis after adding new utterances
                  setTimeout(() => analyzeConversation(newUtterances), 500);
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
                // Trigger analysis after adding new utterance
                setTimeout(() => analyzeConversation(newUtterances), 500);
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

  return (
    <div className="min-h-screen p-8">
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
            {isAnalyzing && (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-blue-600">Analyzing...</span>
              </div>
            )}
          </div>
          {evaluationAnalysis && (
            <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
              <strong>Analysis:</strong> {evaluationAnalysis}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 flex items-center justify-center">
        <div className="text-center max-w-4xl w-full">
          <h1 className="text-3xl font-bold mb-8">Real-time Speaker Diarization</h1>
          <p className="text-gray-600 mb-8">Powered by Deepgram's live streaming API with AI conversation analysis</p>

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
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 text-left max-h-96 overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Live Transcription with Speakers:</h2>
            
            {/* Display completed utterances with speaker labels */}
            <div className="space-y-3 mb-4">
              {utterances.map((utterance, index) => (
                <div key={index} className="flex gap-3 p-3 rounded-lg bg-gray-50">
                  <span className="font-semibold text-blue-600 min-w-[100px] flex-shrink-0">
                    Speaker {utterance.speaker}:
                  </span>
                  <span className="text-gray-700 flex-1">{utterance.text}</span>
                  {utterance.start !== undefined && (
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {utterance.start.toFixed(1)}s
                    </span>
                  )}
                </div>
              ))}
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