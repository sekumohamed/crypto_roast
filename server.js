require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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
    const txResponse = await fetch(
      `https://api.routescan.io/v2/network/mainnet/evm/5000/address/${wallet}/transactions?limit=10`
    );
    const txData = await txResponse.json();

    let txSummary = `Wallet: ${wallet}\n`;
    if (txData.items && txData.items.length > 0) {
      txSummary += `Total transactions found: ${txData.items.length}\n`;
      txData.items.slice(0, 5).forEach((tx, i) => {
        const value = (parseInt(tx.value || 0) / 1e18).toFixed(4);
        txSummary += `TX${i+1}: ${value} MNT - ${tx.result === 'success' ? 'success' : 'failed'}\n`;
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

    // Save to Supabase
        const weekNumber = new Date().toISOString().slice(0, 10).replace(/-/g, '').slice(0, 6);
        const now = new Date();
        const year = now.getFullYear();
        const startOfYear = new Date(year, 0, 1);
        const weekNum = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
        const week = `${year}-W${String(weekNum).padStart(2, '0')}`;
        console.log('Week value:', week);

        const { data: existing } = await supabase
          .from('roasts')
          .select('degen_score, roast_count')
          .eq('wallet', wallet)
          .eq('week_number', week)
          .single();

        await supabase.from('roasts').upsert({
          wallet,
          title: roast.title,
          degen_score: existing ? Math.max(roast.degen_score, existing.degen_score) : roast.degen_score,
          verdict: roast.verdict,
          roast_count: existing ? (existing.roast_count || 1) + 1 : 1,
          week_number: week
        }, { onConflict: 'wallet, week_number' });

        res.json(roast);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Roast failed. Try again!' });
  }
});

app.get('/hall', async (req, res) => {
  const week = `${new Date().getFullYear()}-W${Math.ceil(new Date().getDate() / 7)}`;
  const { data, error } = await supabase
    .from('roasts')
    .select('*')
    .eq('week_number', week)
    .order('degen_score', { ascending: false })
    .limit(10);
  if (error) return res.status(500).json({ error: 'Failed to load hall' });
  res.json(data);
});

app.get('/stats', async (req, res) => {
  const { count } = await supabase
    .from('roasts')
    .select('*', { count: 'exact', head: true });
  res.json({ total: count || 0 });
});

app.listen(3000, () => console.log('Crypto Roast running at http://localhost:3000'));