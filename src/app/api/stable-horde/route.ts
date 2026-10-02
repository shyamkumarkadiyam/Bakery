import { NextRequest, NextResponse } from 'next/server';

const STABLE_HORDE_BASE = 'https://stablehorde.net/api/v2';
const ANON_API_KEY = '0000000000';
const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 45; // ~3 minutes max

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    // Step 1: Submit generation request
    const submitRes = await fetch(`${STABLE_HORDE_BASE}/generate/async`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_API_KEY,
        'Client-Agent': 'CakeStudio:1.0:contact@lolitabake.com',
      },
      body: JSON.stringify({
        prompt,
        params: {
          width: 512,
          height: 512,
          steps: 25,
          sampler_name: 'k_euler',
          cfg_scale: 7.5,
          n: 1,
        },
        models: ['Deliberate'],
        r2: true,
        nsfw: false,
        censor_nsfw: true,
      }),
    });

    if (!submitRes.ok) {
      const errBody = await submitRes.text();
      console.error('Stable Horde submit error:', submitRes.status, errBody);
      return NextResponse.json(
        { error: `Stable Horde submission failed: ${submitRes.status}` },
        { status: 502 }
      );
    }

    const submitData = await submitRes.json();
    const jobId: string = submitData.id;

    if (!jobId) {
      return NextResponse.json({ error: 'No job ID returned from Stable Horde' }, { status: 502 });
    }

    // Step 2: Poll for completion
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

      const checkRes = await fetch(`${STABLE_HORDE_BASE}/generate/check/${jobId}`, {
        headers: { 'Client-Agent': 'CakeStudio:1.0:contact@lolitabake.com' },
      });

      if (!checkRes.ok) {
        continue;
      }

      const checkData = await checkRes.json();

      if (checkData.done) {
        // Step 3: Retrieve the finished image
        const statusRes = await fetch(`${STABLE_HORDE_BASE}/generate/status/${jobId}`, {
          headers: { 'Client-Agent': 'CakeStudio:1.0:contact@lolitabake.com' },
        });

        if (!statusRes.ok) {
          return NextResponse.json({ error: 'Failed to retrieve generation status' }, { status: 502 });
        }

        const statusData = await statusRes.json();
        const generation = statusData.generations?.[0];

        if (!generation?.img) {
          return NextResponse.json({ error: 'No image returned from Stable Horde' }, { status: 502 });
        }

        return NextResponse.json({ imageUrl: generation.img });
      }

      if (checkData.faulted) {
        return NextResponse.json({ error: 'Stable Horde generation faulted' }, { status: 502 });
      }
    }

    return NextResponse.json({ error: 'Generation timed out. Please try again.' }, { status: 504 });
  } catch (error) {
    console.error('Stable Horde API route error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
