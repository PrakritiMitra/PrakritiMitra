require('dotenv').config();
const axios = require('axios');
const https = require('https');

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30_000
});

const openrouterHttp = axios.create({
  baseURL: OPENROUTER_BASE_URL,
  timeout: Number(process.env.OPENROUTER_TIMEOUT_MS || 12_000),
  httpsAgent
});

function getOpenRouterHeaders() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    const err = new Error('OpenRouter API key not set in .env');
    err.code = 'OPENROUTER_KEY_MISSING';
    throw err;
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    // OpenRouter request attribution (recommended)
    'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'https://prakritimitra.me',
    'X-Title': process.env.OPENROUTER_APP_TITLE || 'PrakritiMitra Assistant'
  };
}

function mapOpenRouterError(error) {
  const status = error?.response?.status;
  const data = error?.response?.data;

  const mapped = new Error(
    data?.error?.message ||
      error?.message ||
      'OpenRouter request failed'
  );

  mapped.status = status;
  mapped.provider = 'openrouter';
  mapped.details = data;
  mapped.isTimeout =
    error?.code === 'ECONNABORTED' ||
    /timeout/i.test(error?.message || '');

  const msg = String(mapped.message || '').toLowerCase();
  mapped.isRateLimited = status === 429 || msg.includes('rate limit');
  mapped.isTransient =
    mapped.isTimeout || (status >= 500 && status <= 599);

  return mapped;
}

async function createChatCompletion(payload) {
  const headers = getOpenRouterHeaders();

  const maxAttempts = Math.max(
    1,
    Number(process.env.OPENROUTER_MAX_RETRIES || 2) + 1
  );
  const baseDelayMs = Number(process.env.OPENROUTER_RETRY_BASE_DELAY_MS || 250);

  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await openrouterHttp.post('/chat/completions', payload, {
        headers
      });
      return res.data;
    } catch (error) {
      const mapped = mapOpenRouterError(error);
      lastErr = mapped;

      const shouldRetry = mapped.isTransient && attempt < maxAttempts;
      if (!shouldRetry) throw mapped;

      const jitter = Math.floor(Math.random() * 150);
      const delay = baseDelayMs * attempt + jitter;
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastErr || new Error('OpenRouter request failed');
}

async function createChatCompletionStream(payload) {
  const headers = getOpenRouterHeaders();
  try {
    const res = await openrouterHttp.post('/chat/completions', payload, {
      headers,
      responseType: 'stream',
      timeout: Number(process.env.OPENROUTER_STREAM_TIMEOUT_MS || 60_000)
    });
    return res.data; // Node.js readable stream
  } catch (error) {
    throw mapOpenRouterError(error);
  }
}

module.exports = {
  createChatCompletion,
  createChatCompletionStream
};

