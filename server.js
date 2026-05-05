require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

const SYSTEM_PROMPT = `You are CryptoRoast, a brutally honest but hilarious AI comedian who specialises in roasting people's on-chain trading decisions.

You will receive REAL transaction data from a Mantle wallet. Analyze it and roast the trader.

Rules:
- Reference specific details from their actual transactions
- Use crypto slang: "aping in", "diamond hands", "paper hands", "rekt", "NGMI", "WAGMI"
- Max 4 roast lines, each max 2 sentences
- End with a savage but encouraging verdict

Respond ONLY in this exact JSON format:
{
  "degen_score": 74,
  "title": "The Hopium Addict",
  "roasts": ["line1", "line2", "line3", "line4"],
  "verdict": "Your verdict here."
}`;

app.post('/roast', async (req, res) => {
  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ error: 'Wallet address required' });

  try {
    // Fetch real transactions from Mantle Explorer
    const txResponse = await fetch(
  `https://api.routescan.io/v2/network/mainnet/evm/5000/address/${wallet}/transactions?limit=10`
    );
    const txData = await txResponse.json();
    
    let txSummary = `Wallet: ${wallet}\n`;
    if (txData.result && txData.result.length > 0) {
      txSummary += `Total transactions found: ${txData.result.length}\n`;
      txData.result.slice(0, 5).forEach((tx, i) => {
        const value = (parseInt(tx.value) / 1e18).toFixed(4);
        const date = new Date(tx.timeStamp * 1000).toLocaleDateString();
        txSummary += `TX${i+1}: ${value} MNT on ${date} - ${tx.isError === '1' ? 'FAILED' : 'success'}\n`;
      });
    } else {
      txSummary += 'No transactions found - wallet is brand new or empty!\n';
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: SYSTEM_PROMPT + '\n\nReal wallet data:\n' + txSummary }]
          }]
        })
      }
    );

    const data = await response.json();
    console.log('Gemini response:', JSON.stringify(data, null, 2));

    if (!data.candidates || !data.candidates[0]) {
      return res.status(500).json({ error: 'AI error. Try again!' });
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