'use client';

import { useRouter } from 'next/navigation';

const SITUATIONS = [
  { key: 'dating', label: 'Dating' },
  { key: 'colleagues', label: 'Speaking to Colleagues' },
  { key: 'strangers', label: 'Speaking to Strangers' },
  { key: 'boss', label: 'Speaking to Boss' },
  { key: 'sales', label: 'Sales & Pitching' },
  { key: 'interview', label: 'Interview' },
];

export default function SituationsPage() {
  const router = useRouter();

  const choose = (key) => {
    try { localStorage.setItem('onboarding.situation', key); } catch {}
    router.push('/onboarding/parameters?situation=' + encodeURIComponent(key));
  };

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>
        What situation are you in?
      </h1>
      <p style={{ color: '#666', marginBottom: 24 }}>
        Pick one to prefill evaluation parameters. You can edit them next.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {SITUATIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => choose(s.key)}
            style={{
              padding: '16px 14px',
              borderRadius: 12,
              border: '1px solid #ddd',
              background: '#fff',
              textAlign: 'left',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
              Prefill metrics tailored to {s.label.toLowerCase()}
            </div>
          </button>
        ))}
      </div>
    </main>
  );
}
