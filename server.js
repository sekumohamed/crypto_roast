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

const SYSTEM_PROMPT = `You are CryptoRoast, a brutally honest but hilarious AI comedian roasting people's on-chain trading decisions.

You will receive REAL wallet data from Mantle Network. Analyze it and roast the trader.

Rules:
- Reference SPECIFIC details from their actual data
- Use crypto slang: "aping in", "diamond hands", "paper hands", "rekt", "NGMI", "WAGMI"
- Max 4 roast lines, each max 2 sentences
- End with a savage but encouraging verdict

DEGEN SCORE RULES (very important):
- Empty wallet, no transactions = 15-25 (low but not zero — they're a crypto ghost)
- 1-5 transactions, small amounts = 30-45
- Active trader with some fails = 55-70
- Many transactions, big amounts = 71-85
- Reckless degen, many failed txs = 86-99
- NEVER give exactly 0 or 100

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

    const tokenResponse = await fetch(
      `https://api.routescan.io/v2/network/mainnet/evm/5000/address/${wallet}/erc20-transfers?limit=5`
    );
    const tokenData = await tokenResponse.json();

    let txSummary = `Wallet: ${wallet}\n`;
    
    if (txData.items && txData.items.length > 0) {
      txSummary += `\nTRANSACTIONS (${txData.items.length} found):\n`;
      txData.items.slice(0, 5).forEach((tx, i) => {
        const value = (parseInt(tx.value || 0) / 1e18).toFixed(4);
        const age = Math.floor((Date.now() - new Date(tx.timestamp)) / 86400000);
        txSummary += `TX${i+1}: ${value} MNT - ${tx.result || 'unknown'} - ${age} days ago\n`;
      });
      
      const failed = txData.items.filter(tx => tx.result !== 'success').length;
      const totalValue = txData.items.reduce((sum, tx) => sum + parseInt(tx.value || 0), 0) / 1e18;
      txSummary += `Failed transactions: ${failed}/${txData.items.length}\n`;
      txSummary += `Total MNT moved: ${totalValue.toFixed(4)}\n`;
    } else 
      {
      txSummary += '\nTRANSACTIONS: None found - completely inactive wallet!\n';
    }

    if (tokenData.items && tokenData.items.length > 0) {
      txSummary += `\nTOKEN ACTIVITY:\n`;
      tokenData.items.slice(0, 3).forEach((t, i) => {
        txSummary += `Token${i+1}: ${t.token?.symbol || 'Unknown'} - ${t.type || 'transfer'}\n`;
      });
    } else {
      txSummary += '\nTOKEN ACTIVITY: No token interactions - pure ghost wallet!\n';
    }

    txSummary += `\nROAST INSTRUCTIONS: Be specific about their actual behavior. Mock their inactivity, failed txs, or specific patterns. Make it personal and savage!\n`;

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
        function getCurrentWeek() {
          const now = new Date();
          const start = new Date(now.getFullYear(), 0, 1);
          const week = Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7);
          return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
      }


      const week = getCurrentWeek();

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
  function getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7);
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  const week = getCurrentWeek();
  console.log('Hall week:', week);
  const { data, error } = await supabase
    .from('roasts')
    .select('*')
    .eq('week_number', week)
    .order('degen_score', { ascending: false })
    .limit(10);
  if (error) return res.status(500).json({ error: 'Failed to load hall' });
  res.json(data || []);
});

app.get('/stats', async (req, res) => {
  const { count } = await supabase
    .from('roasts')
    .select('*', { count: 'exact', head: true });
  res.json({ total: count || 0 });
});

app.post('/battle', async (req, res) => {
  const { wallet1, wallet2 } = req.body;
  if (!wallet1 || !wallet2) return res.status(400).json({ error: 'Two wallets required' });

  try {
    const fetchTx = async (wallet) => {
      const r = await fetch(`https://api.routescan.io/v2/network/mainnet/evm/5000/address/${wallet}/transactions?limit=10`);
      const d = await r.json();
      const count = d.items?.length || 0;
      const failed = d.items?.filter(tx => tx.result !== 'success').length || 0;
      const total = d.items?.reduce((s, tx) => s + parseInt(tx.value || 0), 0) / 1e18 || 0;
      return { wallet, count, failed, total };
    };

    const [w1, w2] = await Promise.all([fetchTx(wallet1), fetchTx(wallet2)]);

    const battlePrompt = `You are CryptoRoast judging a ROAST BATTLE between two wallets on Mantle Network.

Wallet 1 (${wallet1.slice(0,6)}...${wallet1.slice(-4)}):
- Transactions: ${w1.count}
- Failed txs: ${w1.failed}
- Total MNT moved: ${w1.total.toFixed(4)}

Wallet 2 (${wallet2.slice(0,6)}...${wallet2.slice(-4)}):
- Transactions: ${w2.count}
- Failed txs: ${w2.failed}
- Total MNT moved: ${w2.total.toFixed(4)}

Judge who is the BIGGER degen. Roast both wallets brutally, then declare a winner.

Respond ONLY in this JSON format:
{
  "wallet1_roast": "2 sentence brutal roast of wallet 1",
  "wallet2_roast": "2 sentence brutal roast of wallet 2",
  "winner": "wallet1 or wallet2",
  "winner_reason": "1 sentence savage explanation of why they won",
  "battle_title": "funny title for this battle like The Ghost vs The Gambler"
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'compound-beta',
        messages: [{ role: 'user', content: battlePrompt }],
        max_tokens: 600
      })
    });

    const data = await response.json();
    const text = data.choices[0].message.content;
    const clean = text.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Battle failed. Try again!' });
  }
});

app.get('/history/:wallet', async (req, res) => {
  const { wallet } = req.params;
  const { data, error } = await supabase
    .from('roasts')
    .select('*')
    .eq('wallet', wallet)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: 'Failed' });
  res.json(data || []);
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(3000, () => console.log('Crypto Roast running at http://localhost:3000'));