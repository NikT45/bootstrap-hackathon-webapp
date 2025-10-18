'use client';
import React, { useRef, useState} from 'react'
import Webcam from "react-webcam"

export default function App() {
  // In Next.js client code, only environment variables prefixed with NEXT_PUBLIC_ are exposed to the browser
  const API_KEY = process.env.NEXT_PUBLIC_HUME_API_KEY;
  // debug log so devs can see in browser console whether the env is exposed
  if (typeof window !== 'undefined') {
    console.debug('NEXT_PUBLIC_HUME_API_KEY:', API_KEY);
  }
  const endpoint = `wss://api.hume.ai/v0/stream/models?api_key=${API_KEY}`;
  const webcamRef = useRef(null);
  const emotionData = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
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
  React.useEffect(() => {
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
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      {/* Webcam hidden but still capturing - using opacity-0 and absolute positioning so it initializes properly */}
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
      
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Hume Emotion Detection</h1>
          
          {/* Connection Status */}
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium">
              Status: 
              <span className={`ml-2 ${
                connectionStatus === 'connected' ? 'text-green-600' :
                connectionStatus === 'connecting' ? 'text-yellow-600' :
                connectionStatus === 'error' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {connectionStatus === 'connected' ? '🟢 Connected' :
                 connectionStatus === 'connecting' ? '🟡 Connecting...' :
                 connectionStatus === 'error' ? '🔴 Error' :
                 '⚪ Disconnected'}
              </span>
            </span>
            {debugInfo && (
              <div className="text-sm text-gray-600 mt-2">{debugInfo}</div>
            )}
          </div>
          
          {!API_KEY && (
            <div className="mb-4 text-red-600">Missing NEXT_PUBLIC_HUME_API_KEY — set it in your environment (.env.local) and restart dev server</div>
          )}
          <button
            onClick={startEmotionDetection}
            disabled={!API_KEY || connectionStatus === 'connected'}
            className="px-8 py-3 bg-blue-600 disabled:opacity-50 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            {connectionStatus === 'connected' ? 'Running...' : 'Start Conversation'}
          </button>
        </div>

        {/* Display latest emotion data */}
        {latestEmotions && (
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Latest Emotion Data:</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {latestEmotions
                .sort((a, b) => b.score - a.score)
                .slice(0, 10)
                .map((emotion, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="font-medium">{emotion.name}:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-48 bg-gray-300 dark:bg-gray-600 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${emotion.score * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm">{(emotion.score * 100).toFixed(2)}%</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Console output for all emotion data */}
        {console.log('All emotion data:', emotionData.current)}
      </div>
    </div>
  );
}
