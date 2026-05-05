require('dotenv').config();
const fs = require('fs');
const HALL_OF_SHAME_FILE = 'hall_of_shame.json';

function loadHall() {
  try {
    if (fs.existsSync(HALL_OF_SHAME_FILE)) {
      return JSON.parse(fs.readFileSync(HALL_OF_SHAME_FILE));
    }
  } catch(e) {}
  return [];
}

function saveToHall(wallet, title, degenScore, verdict) {
  const hall = loadHall();
  const existing = hall.findIndex(r => r.wallet === wallet);
  const entry = { wallet, title, degenScore, verdict, date: new Date().toLocaleDateString() };
  if (existing >= 0) {
    if (degenScore > hall[existing].degenScore) hall[existing] = entry;
  } else {
    hall.push(entry);
  }
  hall.sort((a, b) => b.degenScore - a.degenScore);
  const top50 = hall.slice(0, 50);
  fs.writeFileSync(HALL_OF_SHAME_FILE, JSON.stringify(top50, null, 2));
}
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
  'https://api.groq.com/openai/v1/chat/completions',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: 'groq/compound',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: 'Real wallet data:\n' + txSummary }
      ],
      max_tokens: 500
    })
  }
);

const data = await response.json();
console.log('Groq response:', JSON.stringify(data).slice(0, 200));
const text = data.choices[0].message.content;
const clean = text.replace(/```json|```/g, '').trim();
const roast = JSON.parse(clean);
    res.json(roast);
    saveToHall(wallet, roast.title, roast.degen_score, roast.verdict);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Roast failed. Try again!' });
  }
});
app.get('/hall', (req, res) => {
  const hall = loadHall();
  res.json(hall.slice(0, 10));
});
app.listen(3000, () => console.log('Crypto Roast running at http://localhost:3000'));