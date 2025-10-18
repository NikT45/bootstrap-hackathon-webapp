'use client';

import { useState, useRef, useEffect } from 'react';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startConversation = async () => {
    try {
      setError('');
      setTranscription('');
      setPartialTranscript('');
      setStatus('Getting token...');

      // Get token from server
      const tokenResponse = await fetch('/api/assemblyai-token');
      if (!tokenResponse.ok) {
        throw new Error('Failed to get token');
      }
      const { token } = await tokenResponse.json();

      // Create WebSocket connection
      const queryParams = new URLSearchParams({
        sample_rate: '16000',
        format_turns: 'true',
        token: token
      });

      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?${queryParams.toString()}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        console.log('✅ WebSocket opened');
        setStatus('Connected');
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📩 Received:', data.type, data);

        if (data.type === 'Begin') {
          setStatus('Session started');
        } else if (data.type === 'Turn') {
          const transcript = data.transcript || '';

          if (transcript) {
            console.log('🎤 Transcript:', transcript);
            // Show partial transcript
            setPartialTranscript(transcript);

            // If formatted and end of turn, save to permanent transcription
            if (data.turn_is_formatted && data.end_of_turn) {
              console.log('✅ Final:', transcript);
              setTranscription(prev => prev ? `${prev}\n${transcript}` : transcript);
              setPartialTranscript('');
            }
          }
        } else if (data.type === 'Termination') {
          setStatus('Session ended');
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('WebSocket error');
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket closed');
        setIsRecording(false);
      };

      // Wait for connection
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
        ws.addEventListener('open', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
        ws.addEventListener('error', () => {
          clearTimeout(timeout);
          reject(new Error('Connection failed'));
        }, { once: true });
      });

      // Get microphone
      setStatus('Getting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      streamRef.current = stream;
      console.log('✅ Microphone access granted');

      // Create AudioContext
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      // Resume if suspended
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      console.log('✅ AudioContext state:', audioContext.state);

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      let chunkCount = 0;
      processor.onaudioprocess = (e) => {
        if (chunkCount === 0) {
          console.log('🎉 First audio chunk! Starting to send audio...');
        }

        if (ws.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);

          // Convert to Int16
          const int16Data = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            const s = Math.max(-1, Math.min(1, inputData[i]));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
          }

          // Send as binary
          ws.send(int16Data.buffer);

          chunkCount++;
          if (chunkCount === 1 || chunkCount % 100 === 0) {
            console.log(`🔊 Sent ${chunkCount} audio chunks`);
          }
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      console.log('✅ Audio pipeline connected');
      setIsRecording(true);
      setStatus('Recording...');

    } catch (err) {
      console.error('❌ Error:', err);
      setError(err.message);
      setStatus('');
      cleanup();
    }
  };

  const stopConversation = () => {
    console.log('🛑 Stopping...');

    // Send termination message
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'Terminate' }));
    }

    cleanup();
    setIsRecording(false);
    setStatus('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-2xl w-full">
        <h1 className="text-3xl font-bold mb-8">Ready to get started?</h1>

        {!isRecording ? (
          <button
            onClick={startConversation}
            className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            Start Conversation
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
          <div className="mt-6 text-red-600 font-semibold flex items-center justify-center gap-2">
            <span className="inline-block w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
            Live Transcription Active
          </div>
        )}

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {(transcription || partialTranscript) && (
          <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6 text-left max-h-96 overflow-y-auto">
            <h2 className="text-xl font-semibold mb-3">Live Transcription:</h2>
            <p className="text-gray-700 whitespace-pre-wrap">
              {transcription}
              {partialTranscript && (
                <span className="text-gray-400 italic">
                  {transcription && '\n'}
                  {partialTranscript}
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
