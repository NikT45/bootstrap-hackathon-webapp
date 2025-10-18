import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    
    if (!apiKey) {
      throw new Error('DEEPGRAM_API_KEY environment variable is not set');
    }

    return NextResponse.json({
      apiKey: apiKey,
    });
  } catch (error) {
    console.error('Error getting Deepgram API key:', error);
    return NextResponse.json(
      { error: 'Failed to get API key', details: error.message },
      { status: 500 }
    );
  }
}
