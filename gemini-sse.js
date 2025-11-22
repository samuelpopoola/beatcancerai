// gemini-sse.js
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config(); // Load .env file

const app = express();
const port = process.env.PORT || 3000;

// ------------------------
// CORS setup
// ------------------------
app.use(cors({
  origin: 'http://localhost:5173',  // your frontend
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

app.use(bodyParser.json());

// ------------------------
// Gemini client
// ------------------------
const apiKey = process.env.GEMINI_API_KEY;

let genAI;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
  console.log('✅ Gemini client initialized');
} else {
  console.warn('⚠️ GEMINI_API_KEY not set, running in mock mode');
}

// ------------------------
// SSE endpoint
// ------------------------
app.post('/chat-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { messages } = req.body;
  if (!messages) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: 'Missing messages' })}\n\n`);
    return res.end();
  }

  // Mock response if no API key
  if (!genAI) {
    res.write(`event: message\ndata: ${JSON.stringify({ text: 'Mock response (API key not set)' })}\n\n`);
    res.write(`event: done\ndata: {}\n\n`);
    return res.end();
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const chat = model.startChat({
      history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
    });

    for await (const part of chat.stream()) {
      const text = part.parts.map(p => p.text || '').join('');
      res.write(`event: message\ndata: ${JSON.stringify({ text })}\n\n`);
    }

    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ------------------------
// Start server
// ------------------------
app.listen(port, () => {
  console.log(`✅ Gemini SSE server running at http://localhost:${port}`);
});
