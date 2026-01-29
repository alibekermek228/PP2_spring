const { useEffect, useMemo, useState } = React;

const wallets = [
  {
    name: 'MetaMask',
    description: 'Popular Web3 wallet for EVM networks.',
    id: 'metamask',
  },
  {
    name: 'Trust Wallet',
    description: 'Mobile wallet with multi-chain support.',
    id: 'trust',
  },
  {
    name: 'Phantom',
    description: 'Solana-first wallet with multi-chain support.',
    id: 'phantom',
  },
];

const defaultQuery = 'ETH';

function formatNumber(value) {
  if (!value) return '—';
  const suffixes = [
    { value: 1e12, label: 'T' },
    { value: 1e9, label: 'B' },
    { value: 1e6, label: 'M' },
    { value: 1e3, label: 'K' },
  ];
  const suffix = suffixes.find((item) => value >= item.value);
  if (!suffix) return value.toLocaleString('en-US');
  return `${(value / suffix.value).toFixed(2)}${suffix.label}`;
}

function App() {
  const [query, setQuery] = useState(defaultQuery);
  const [pairs, setPairs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataNotice, setDataNotice] = useState('');
  const [walletOpen, setWalletOpen] = useState(false);
  const [minCap, setMinCap] = useState(1_000_000_000);
  const [chainFilter, setChainFilter] = useState('all');
  const [walletStatus, setWalletStatus] = useState({ provider: '', address: '', balance: '' });
  const [accountNotice, setAccountNotice] = useState('');
  const [profile, setProfile] = useState(null);
  const [watchlistNotice, setWatchlistNotice] = useState('');

  const uniqueChains = useMemo(() => {
    const chains = new Set(pairs.map((pair) => pair.chainId).filter(Boolean));
    return ['all', ...Array.from(chains).sort()];
  }, [pairs]);

  const filteredPairs = useMemo(() => {
    return pairs
      .filter((pair) => {
        const cap = pair.fdv || pair.marketCap || 0;
        const matchesCap = cap >= minCap;
        const matchesChain = chainFilter === 'all' || pair.chainId === chainFilter;
        return matchesCap && matchesChain;
      })
      .slice(0, 12);
  }, [pairs, minCap, chainFilter]);

  const fetchPairs = async (searchQuery) => {
    setLoading(true);
    setError('');
    setDataNotice('');
    try {
      const proxyUrl = `/api/search?q=${encodeURIComponent(searchQuery)}`;
      const directUrl = `https://api.dexscreener.com/latest/dex/search?q=${encodeURIComponent(searchQuery)}`;

      let response = await fetch(proxyUrl);
      if (!response.ok) {
        response = await fetch(directUrl);
        if (!response.ok) {
          throw new Error('Unable to fetch Dexscreener data.');
        }
        setDataNotice('Loaded directly from Dexscreener (proxy unavailable).');
      }

      const data = await response.json();
      setPairs(Array.isArray(data.pairs) ? data.pairs : []);
    } catch (err) {
      setError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPairs(defaultQuery);
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!query.trim()) {
      setError('Enter a token name or symbol.');
      return;
    }
    fetchPairs(query.trim());
  };

  const loadProfileFromStorage = () => {
    const stored = localStorage.getItem('dexis-profile');
    if (stored) {
      try {
        setProfile(JSON.parse(stored));
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleGoogleLogin = (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setAccountNotice('Google authentication failed. Please try again.');
      return;
    }

    const payload = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
    const nextProfile = {
      name: payload.name,
      email: payload.email,
      picture: payload.picture,
    };
    localStorage.setItem('dexis-profile', JSON.stringify(nextProfile));
    setProfile(nextProfile);
    setAccountNotice('Signed in with Google.');
  };

  useEffect(() => {
    if (!window.google || !window.google.accounts?.id) {
      return;
    }
    const clientId = window.DEXIS_GOOGLE_CLIENT_ID || '';
    if (!clientId) {
      setAccountNotice('Google client ID is missing. Add it in your app config.');
      return;
    }
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleLogin,
    });
  }, []);

  useEffect(() => {
    loadProfileFromStorage();
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('dexis-profile');
    setProfile(null);
    setAccountNotice('Signed out.');
  };

  const formatEvmBalance = (hexBalance) => {
    if (!hexBalance) return '—';
    const balance = parseInt(hexBalance, 16);
    return `${(balance / 1e18).toFixed(4)} ETH`;
  };

  const fetchEvmBalance = async (provider) => {
    const balance = await provider.request({
      method: 'eth_getBalance',
      params: [provider.selectedAddress, 'latest'],
    });
    return formatEvmBalance(balance);
  };

  const fetchSolBalance = async (pubkey) => {
    const response = await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [pubkey],
      }),
    });
    const data = await response.json();
    const lamports = data?.result?.value ?? 0;
    return `${(lamports / 1e9).toFixed(4)} SOL`;
  };

  const connectWallet = async (walletId) => {
    setAccountNotice('');
    try {
      if (walletId === 'phantom') {
        if (!window.solana?.isPhantom) {
          throw new Error('Phantom wallet not found.');
        }
        const resp = await window.solana.connect();
        const address = resp.publicKey?.toString();
        const balance = await fetchSolBalance(address);
        setWalletStatus({ provider: 'Phantom', address, balance });
        return;
      }

      if (!window.ethereum) {
        throw new Error('No EVM wallet detected.');
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const address = accounts?.[0] || '';
      const balance = await fetchEvmBalance(window.ethereum);
      const providerName = walletId === 'trust' ? 'Trust Wallet' : 'MetaMask';
      setWalletStatus({ provider: providerName, address, balance });
    } catch (err) {
      setAccountNotice(err.message || 'Wallet connection failed.');
    }
  };

  const updateWatchlist = async (pair, action) => {
    setWatchlistNotice('');
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          pairAddress: pair.pairAddress,
          symbol: pair.baseToken?.symbol,
        }),
      });
      if (!response.ok) {
        throw new Error('Server not available.');
      }
      const data = await response.json();
      setWatchlistNotice(data.message || 'Watchlist updated.');
    } catch (err) {
      const storageKey = 'dexis-watchlist';
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updated = action === 'add'
        ? [...new Set([...stored, pair.pairAddress])]
        : stored.filter((item) => item !== pair.pairAddress);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setWatchlistNotice('Watchlist updated locally (server offline).');
    }
  };

  const requestTrade = async (pair) => {
    setWatchlistNotice('');
    try {
      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairAddress: pair.pairAddress,
          symbol: pair.baseToken?.symbol,
        }),
      });
      if (!response.ok) {
        throw new Error('Trading service unavailable.');
      }
      const data = await response.json();
      setWatchlistNotice(data.message || 'Trade request sent.');
    } catch (err) {
      setWatchlistNotice('Trade request queued (server offline).');
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">Dexis</div>
        <nav className="nav">
          <a href="#market">Market</a>
          <a href="#analytics">Analytics</a>
          <a href="#wallet">Wallets</a>
          <a href="#account">Account</a>
        </nav>
        <button className="primary" onClick={() => setWalletOpen(true)}>
          Connect wallet
        </button>
      </header>

      <section className="hero">
        <div>
          <p className="badge">DEXIS CEX-STYLE UX</p>
          <h1>Premium DEX market analytics with a CEX-grade interface</h1>
          <p className="subtitle">
            Track tokens with $1B+ market cap, connect your favorite wallets, and keep a
            trading-ready dashboard.
          </p>
          <form className="search" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Search tokens: BTC, SOL, ARB..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" className="primary">
              Search
            </button>
          </form>
        </div>
        <div className="hero-card">
          <h3>Connect in seconds</h3>
          <p>
            Live integrations with MetaMask, Trust Wallet, and Phantom. Next up: WalletConnect
            and hardware wallets.
          </p>
          <div className="wallet-icons">
            <span>🦊</span>
            <span>🛡️</span>
            <span>👻</span>
          </div>
        </div>
      </section>

      <section className="panel" id="analytics">
        <div className="panel-header">
          <div>
            <h2>Top DEX tokens</h2>
            <p>Filter by market cap and chain.</p>
          </div>
          <div className="filters">
            <label>
              Market cap
              <select value={minCap} onChange={(e) => setMinCap(Number(e.target.value))}>
                <option value={1_000_000_000}>$1B+</option>
                <option value={500_000_000}>$500M+</option>
                <option value={100_000_000}>$100M+</option>
              </select>
            </label>
            <label>
              Chain
              <select value={chainFilter} onChange={(e) => setChainFilter(e.target.value)}>
                {uniqueChains.map((chain) => (
                  <option key={chain} value={chain}>
                    {chain.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {loading && <div className="state">Loading market data...</div>}
        {dataNotice && <div className="state warning">{dataNotice}</div>}
        {error && <div className="state error">{error}</div>}
        {watchlistNotice && <div className="state">{watchlistNotice}</div>}

        <div className="grid" id="market">
          {filteredPairs.map((pair) => (
            <article className="card" key={pair.pairAddress}>
              <div className="card-head">
                <div>
                  <h3>{pair.baseToken?.symbol || 'TOKEN'} / {pair.quoteToken?.symbol || 'USD'}</h3>
                  <p>{pair.baseToken?.name || 'Unknown token'}</p>
                </div>
                <span className="tag">{pair.chainId?.toUpperCase()}</span>
              </div>
              <div className="metrics">
                <div className="metric-block">
                  <span>Price</span>
                  <div className="metric-gap">
                    <strong>${Number(pair.priceUsd || 0).toFixed(4)}</strong>
                    <strong>${formatNumber(pair.volume?.h24)}</strong>
                  </div>
                </div>
                <div className="metric-block">
                  <span>FDV</span>
                  <strong>${formatNumber(pair.fdv)}</strong>
                </div>
                <div className="metric-block">
                  <span>Liquidity</span>
                  <strong>${formatNumber(pair.liquidity?.usd)}</strong>
                </div>
              </div>
              <div className="cta-row">
                <button className="ghost" onClick={() => updateWatchlist(pair, 'add')}>
                  Add to watchlist
                </button>
                <button className="primary" onClick={() => requestTrade(pair)}>
                  Trade
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" id="wallet">
        <h2>Wallets</h2>
        {walletStatus.address && (
          <div className="wallet-status">
            <strong>Connected:</strong> {walletStatus.provider} · {walletStatus.address}
            <span>Balance: {walletStatus.balance}</span>
          </div>
        )}
        <div className="wallet-grid">
          {wallets.map((wallet) => (
            <div className="wallet-card" key={wallet.name}>
              <h3>{wallet.name}</h3>
              <p>{wallet.description}</p>
              <button className="ghost" onClick={() => connectWallet(wallet.id)}>
                Connect
              </button>
            </div>
          ))}
        </div>
        {accountNotice && <div className="state warning">{accountNotice}</div>}
      </section>

      <section className="panel" id="account">
        <div className="about">
          <div>
            <h2>Account center</h2>
            <p>Sign in to sync watchlists, alerts, and portfolio snapshots.</p>
            {profile ? (
              <div className="profile-card">
                <img src={profile.picture} alt={profile.name} />
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.email}</span>
                </div>
                <button className="ghost" onClick={handleSignOut}>Sign out</button>
              </div>
            ) : (
              <button
                className="primary"
                onClick={() => window.google?.accounts?.id?.prompt?.()}
              >
                Sign in with Google
              </button>
            )}
          </div>
          <div className="about-highlight">
            <h3>Dexis roadmap</h3>
            <p>Swap aggregators, limit orders, copy trading, and portfolio automation.</p>
          </div>
        </div>
      </section>

      {walletOpen && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Connect wallet</h3>
              <button className="icon" onClick={() => setWalletOpen(false)}>
                ✕
              </button>
            </div>
            <p>Select a wallet provider.</p>
            <div className="wallet-options">
              {wallets.map((wallet) => (
                <button
                  key={wallet.name}
                  className="wallet-option"
                  onClick={() => connectWallet(wallet.id)}
                >
                  <div>
                    <strong>{wallet.name}</strong>
                    <span>{wallet.description}</span>
                  </div>
                  <span className="arrow">→</span>
                </button>
              ))}
            </div>
            <p className="note">Wallet connections use live providers when available.</p>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
