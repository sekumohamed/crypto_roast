require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const SYSTEM_PROMPT = `You are CryptoRoast, a brutally honest but hilarious AI comedian who specialises in roasting people's on-chain trading decisions. You sound like a mix of a disappointed financial advisor and a stand-up comedian.

You will receive a wallet address. Make up 4 funny, realistic-sounding crypto trading mistakes and roast them.

Rules:
- Keep it light and fun
- Use crypto slang: "aping in", "diamond hands", "paper hands", "rekt", "NGMI", "WAGMI", "bought the top"
- Max 4 roast lines, each max 2 sentences
- End with a savage but encouraging verdict

Respond ONLY in this exact JSON format with no extra text or markdown:
{
  "degen_score": 74,
  "title": "The Hopium Addict",
  "roasts": [
    "Roast line 1 here.",
    "Roast line 2 here.",
    "Roast line 3 here.",
    "Roast line 4 here."
  ],
  "verdict": "Your verdict here."
}`;

app.post('/roast', async (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: 'Wallet address required' });

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: SYSTEM_PROMPT + '\n\nRoast this wallet address: ' + wallet
            }]
          }]
        })
      }
    );

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data, null, 2));

    if (!data.candidates || !data.candidates[0]) {
      console.error('Unexpected response:', data);
      return res.status(500).json({ error: 'API error. Try again!' });
    }

    const text = data.candidates[0].content.parts[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const roast = JSON.parse(clean);
    res.json(roast);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Roast failed. Try again!' });
  }
});

app.listen(3000, () => console.log('Crypto Roast running at http://localhost:3000'));