import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const url = new URL('https://streaming.assemblyai.com/v3/token');
    url.search = new URLSearchParams({
      expires_in_seconds: 600, // 10 minutes
    }).toString();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': process.env.ASSEMBLYAI_API_KEY,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create token: ${error}`);
    }

    const data = await response.json();

    return NextResponse.json({
      token: data.token,
    });
  } catch (error) {
    console.error('Error creating AssemblyAI token:', error);
    return NextResponse.json(
      { error: 'Failed to create token', details: error.message },
      { status: 500 }
    );
  }
}
