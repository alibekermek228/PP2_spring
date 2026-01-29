const { useEffect, useMemo, useState } = React;

const wallets = [
  {
    name: 'MetaMask',
    description: 'Самый популярный Web3 кошелек для EVM-сетей.',
  },
  {
    name: 'Trust Wallet',
    description: 'Мобильный кошелек с поддержкой мультисетей.',
  },
  {
    name: 'Phantom',
    description: 'Удобный кошелек для Solana и мультичейн.',
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
  if (!suffix) return value.toLocaleString('ru-RU');
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
          throw new Error('Не удалось получить данные Dexscreener.');
        }
        setDataNotice('Данные загружены напрямую из Dexscreener (прокси недоступен).');
      }

      const data = await response.json();
      setPairs(Array.isArray(data.pairs) ? data.pairs : []);
    } catch (err) {
      setError(err.message || 'Ошибка загрузки.');
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
      setError('Введите название токена или тикер.');
      return;
    }
    fetchPairs(query.trim());
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="logo">DEX Prime</div>
        <nav className="nav">
          <a href="#market">Маркет</a>
          <a href="#analytics">Аналитика</a>
          <a href="#wallet">Кошельки</a>
          <a href="#about">О продукте</a>
        </nav>
        <button className="primary" onClick={() => setWalletOpen(true)}>
          Подключить кошелек
        </button>
      </header>

      <section className="hero">
        <div>
          <p className="badge">DEX x CEX UX</p>
          <h1>Эстетика централизованных бирж для топовых DEX токенов</h1>
          <p className="subtitle">
            Наблюдай за токенами с капитализацией от 1B+, подключай любимые кошельки и
            торгуй с привычным интерфейсом.
          </p>
          <form className="search" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Поиск токена: BTC, SOL, ARB..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" className="primary">
              Найти
            </button>
          </form>
        </div>
        <div className="hero-card">
          <h3>Подключайся за секунды</h3>
          <p>
            Интеграции с MetaMask, Trust Wallet и Phantom. Скоро — WalletConnect и
            аппаратные кошельки.
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
            <h2>Топ токенов DEX</h2>
            <p>Фильтр по капе от 1B+ и сети.</p>
          </div>
          <div className="filters">
            <label>
              Капа от
              <select value={minCap} onChange={(e) => setMinCap(Number(e.target.value))}>
                <option value={1_000_000_000}>$1B+</option>
                <option value={500_000_000}>$500M+</option>
                <option value={100_000_000}>$100M+</option>
              </select>
            </label>
            <label>
              Сеть
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

        {loading && <div className="state">Загрузка данных...</div>}
        {dataNotice && <div className="state warning">{dataNotice}</div>}
        {error && <div className="state error">{error}</div>}

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
                <div>
                  <span>Цена</span>
                  <strong>${Number(pair.priceUsd || 0).toFixed(4)}</strong>
                </div>
                <div>
                  <span>FDV</span>
                  <strong>${formatNumber(pair.fdv)}</strong>
                </div>
                <div>
                  <span>Ликвидность</span>
                  <strong>${formatNumber(pair.liquidity?.usd)}</strong>
                </div>
              </div>
              <div className="cta-row">
                <button className="ghost">Добавить в лист</button>
                <button className="primary">Торговать</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel" id="wallet">
        <h2>Кошельки</h2>
        <div className="wallet-grid">
          {wallets.map((wallet) => (
            <div className="wallet-card" key={wallet.name}>
              <h3>{wallet.name}</h3>
              <p>{wallet.description}</p>
              <button className="ghost" onClick={() => setWalletOpen(true)}>
                Подключить
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel" id="about">
        <div className="about">
          <div>
            <h2>Почему DEX Prime?</h2>
            <ul>
              <li>Премиальный интерфейс с привычными паттернами CEX.</li>
              <li>DEX Screener API для мониторинга реального рынка.</li>
              <li>Фокус на токены с капитализацией от 1B+.</li>
            </ul>
          </div>
          <div className="about-highlight">
            <h3>Roadmap</h3>
            <p>Интеграция swap-агрегаторов, лимитные ордера, копи-трейдинг.</p>
          </div>
        </div>
      </section>

      {walletOpen && (
        <div className="modal" role="dialog" aria-modal="true">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Подключить кошелек</h3>
              <button className="icon" onClick={() => setWalletOpen(false)}>
                ✕
              </button>
            </div>
            <p>Выберите кошелек для подключения.</p>
            <div className="wallet-options">
              {wallets.map((wallet) => (
                <button key={wallet.name} className="wallet-option">
                  <div>
                    <strong>{wallet.name}</strong>
                    <span>{wallet.description}</span>
                  </div>
                  <span className="arrow">→</span>
                </button>
              ))}
            </div>
            <p className="note">Подключение кошельков — демо-режим. Web3 интеграции будут позже.</p>
          </div>
        </div>
      )}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
