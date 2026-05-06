#  Crypto Roast

> Your on-chain history. Judged. Ruthlessly.

An AI-powered Web3 app that brutally roasts your crypto trading decisions using real on-chain data from Mantle Network.

[Crypto Roast](https://crypto-roast-rho.vercel.app)

##  Live Demo

**[crypto-roast-rho.vercel.app](https://crypto-roast-rho.vercel.app)**

Built for the **Turing Test Hackathon 2026** 
Vote on DoraHacks: [dorahacks.io/buidl/43710](https://dorahacks.io/buidl/43710)

---

##  What is Crypto Roast?

Paste any Mantle wallet address and get:

-  A **Degen Score** (0-100) based on your real trading behavior
-  A savage **title** like "The Crypto Ghost" or "The Hopium Addict"
-  4 **brutal roast lines** referencing your actual transactions
-  A downloadable **comic-style meme card**
-  A spot on the **Hall of Shame** weekly leaderboard
-  **Roast Battle** mode - challenge another wallet

---

##  Features

| Feature | Description |
|---|---|
|  MetaMask Connect | One-click wallet connection |
|  Real On-chain Data | Fetches actual Mantle transactions |
|  AI Roast Engine | Groq AI with calibrated Degen Scores |
|  Meme Card Generator | Comic-style downloadable PNG |
|  Hall of Shame | Weekly leaderboard, resets every Monday |
|  Roast Battle | Two wallets compete for biggest degen title |
|  Roast a Friend | Shareable auto-roast links |
|  Roast History | Track wallet roast history over time |
|  Persistent Database | Supabase PostgreSQL backend |

---

##  Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js + Express
- **AI:** Groq API (compound-beta model)
- **Database:** Supabase (PostgreSQL)
- **Blockchain:** Mantle Network
- **Smart Contract:** Solidity (deployed on Mantle Sepolia)
- **Hosting:** Vercel

---

##  Installation

```bash
# Clone the repository
git clone https://github.com/sekumohamed/crypto_roast.git
cd crypto_roast

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Add your keys to `.env`:
```env
GROQ_API_KEY=your_groq_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

```bash
# Run locally
node server.js
```

Open [http://localhost:3000](http://localhost:3000)

---

##  Smart Contract

| Property | Value |
|---|---|
| Network | Mantle Sepolia Testnet |
| Contract Address | `0xfb07B188A61994DC9C9B2636954d4E24f9a49ef5` |
| Explorer | [View on Mantle Explorer](https://explorer.sepolia.mantle.xyz/address/0xfb07B188A61994DC9C9B2636954d4E24f9a49ef5) |

---

##  Database Setup

Run this SQL in your Supabase project:

```sql
CREATE TABLE roasts (
  id SERIAL PRIMARY KEY,
  wallet TEXT NOT NULL,
  title TEXT NOT NULL,
  degen_score INTEGER NOT NULL,
  verdict TEXT,
  roast_count INTEGER DEFAULT 1,
  week_number TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE roasts ADD CONSTRAINT roasts_wallet_week_unique 
UNIQUE (wallet, week_number);
```

---

##  Deployment

The app is deployed on Vercel. To deploy your own:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add environment variables in Vercel dashboard:
- `GROQ_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

---

##  How to Use

1. Visit [crypto-roast-rho.vercel.app](https://crypto-roast-rho.vercel.app)
2. Connect MetaMask or paste any Mantle wallet address
3. Click **Roast Me **
4. Get destroyed by AI
5. Download your meme card and share on X
6. Challenge a friend with Roast Battle 

---

##  Project Structure

crypto_roast/
├── public/
    └── index.html     
├── server.js           
├── vercel.json         
├── package.json
└── .env
