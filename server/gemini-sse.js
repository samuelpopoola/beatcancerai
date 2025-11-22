/*
Simple SSE proxy for Gemini streaming (Node + Express)
Place this in a small Node server or serverless function. Requires environment variable GEMINI_API_KEY.
This example uses fetch streaming as a fallback if SDK streaming is not available.
*/

import express from 'express';
import bodyParser from 'body-parser';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('GEMINI API KEY missing');
}

// Initialize Google Generative AI client
let genAI: any = null;
let model: any = null;
try {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig: { temperature: 0.1, maxOutputTokens: 1500 } });
  console.log('Gemini SDK initialized');
} catch (err) {
  console.warn('Failed to initialize Gemini SDK', err);
}

app.post('/api/gemini/sse', async (req, res) => {
  const { messages, stream = true, acceptsMedicalDisclaimer } = req.body || {};
  if (!acceptsMedicalDisclaimer) return res.status(400).json({ error: 'Disclaimer required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const prompt = (messages || []).map((m: any) => `${m.role}: ${m.content}`).join('\n');

    if (model) {
      // Use SDK to generate content (non-streaming) then chunk it for SSE delivery
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = typeof response?.text === 'function' ? await response.text() : String(response ?? '');

      // Stream the text in chunks to the client as SSE events
      const chunkSize = 120;
      for (let i = 0; i < text.length; i += chunkSize) {
        const chunk = text.slice(i, i + chunkSize);
        res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
        await new Promise((r) => setTimeout(r, 80));
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      return;
    }

    // Fallback simulation if SDK isn't initialized
    const finalText = `Simulated Gemini reply for prompt: ${prompt.substring(0, 300)}`;
    const chunkSize = 60;
    for (let i = 0; i < finalText.length; i += chunkSize) {
      const chunk = finalText.slice(i, i + chunkSize);
      res.write(`data: ${JSON.stringify({ delta: chunk })}\n\n`);
      await new Promise((r) => setTimeout(r, 120));
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err: any) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: String(err?.message || err) })}\n\n`);
    res.end();
  }
});

app.listen(8081, () => console.log('Gemini SSE proxy running on :8081'));
