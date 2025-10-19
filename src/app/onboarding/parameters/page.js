'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ParametersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [situation, setSituation] = useState('');

  useEffect(() => {
    const situationParam = searchParams.get('situation');
    if (situationParam) {
      setSituation(situationParam);
    }
  }, [searchParams]);

  const handleContinue = () => {
    router.push('/app');
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
        Evaluation Parameters
      </h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        {situation && `Parameters for ${situation} situation. `}
        You can customize these settings before continuing.
      </p>

      <div style={{ 
        background: '#f8f9fa', 
        padding: 20, 
        borderRadius: 12, 
        marginBottom: 24,
        border: '1px solid #e9ecef'
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
          Selected Situation: {situation || 'None'}
        </h3>
        <p style={{ color: '#666', fontSize: 14 }}>
          Parameters have been pre-configured for this situation. 
          You can proceed to the main app or customize settings as needed.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: '1px solid #ddd',
            background: '#fff',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: 'none',
            background: '#007bff',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Continue to App
        </button>
      </div>
    </main>
  );
}
