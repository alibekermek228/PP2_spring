const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

app.use(express.static(publicDir));

app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').trim();
  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  try {
    const apiUrl = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(query)}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Dexscreener request failed.' });
    }
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Unexpected error fetching Dexscreener data.' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`DEX UI server running at http://localhost:${port}`);
});
