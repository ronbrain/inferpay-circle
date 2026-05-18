/* eslint-disable */
const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } = React;

/* ── helpers ───────────────────────────────────────────────────── */

const nodeById = (() => {
  const map = new Map();
  for (const layer of window.LAYERS) {
    for (const n of layer.nodes) map.set(n.id, { ...n, layerId: layer.id, layerAccent: layer.accent });
  }
  return (id) => map.get(id);
})();

const edgeKey = (a, b) => `${a}->${b}`;

const randHex = (n) => {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < n; i++) s += hex[Math.floor(Math.random() * 16)];
  return s;
};
const randAddr = () => `0x${randHex(4)}...${randHex(4)}`;
const randTx = () => `0x${randHex(8)}…${randHex(4)}`;

const now = () => {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
};

/* ── Header ────────────────────────────────────────────────────── */

function Header({ balance, block, gas, queries, running, onRun, onAuto, auto }) {
  const intPart = Math.floor(balance).toString();
  const decPart = (balance - Math.floor(balance)).toFixed(6).slice(2);
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark">
          Infer<span className="slash">/</span>Pay
        </div>
        <div className="brand-tag">// System Architecture · v0.3.1</div>
      </div>

      <div className="chain-strip" role="status">
        <div className="chain-cell">
          <div className="k">Chain</div>
          <div className="v">arc-testnet</div>
        </div>
        <div className="chain-cell">
          <div className="k">Block</div>
          <div className="v event">#{block.toLocaleString()}</div>
        </div>
        <div className="chain-cell">
          <div className="k">Gas</div>
          <div className="v">{gas.toFixed(2)} gwei</div>
        </div>
        <div className="chain-cell">
          <div className="k">Queries</div>
          <div className="v flow">{queries.toString().padStart(4, '0')}</div>
        </div>
        <div className="chain-cell" style={{ minWidth: 160 }}>
          <div className="k">Agent Wallet</div>
          <div className="balance-big">
            <span className="int">{intPart}.</span>
            <span className="dec">{decPart}</span>
            <span className="unit">USDC</span>
          </div>
        </div>
      </div>

      <div className="controls">
        <button className={`btn ghost ${auto ? 'primary' : ''}`} onClick={onAuto} title="Loop scenarios every few seconds">
          <span className="dot" style={{ background: auto ? 'currentColor' : 'var(--fg-3)', boxShadow: auto ? '0 0 8px currentColor' : 'none' }}></span>
          {auto ? 'AUTO · ON' : 'AUTO · OFF'}
        </button>
        <button className="btn primary" onClick={onRun} disabled={running}>
          {running ? 'TRACING…' : 'RUN QUERY ▸'}
        </button>
      </div>
    </header>
  );
}

/* ── Diagram ───────────────────────────────────────────────────── */

function Diagram({ litEdges, activeNodes, dots, onNodeHover }) {
  const containerRef = useRef(null);
  const nodeRefs = useRef({});
  const [layout, setLayout] = useState({ paths: new Map(), w: 0, h: 0, ready: false });

  // Recompute paths whenever the container resizes
  useLayoutEffect(() => {
    const update = () => {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const paths = new Map();

      for (const [a, b, type] of window.EDGES) {
        const aEl = nodeRefs.current[a];
        const bEl = nodeRefs.current[b];
        if (!aEl || !bEl) continue;
        const aR = aEl.getBoundingClientRect();
        const bR = bEl.getBoundingClientRect();
        // start at bottom-center of A, end at top-center of B
        const x1 = aR.left + aR.width / 2 - cRect.left;
        const y1 = aR.bottom - cRect.top;
        const x2 = bR.left + bR.width / 2 - cRect.left;
        const y2 = bR.top - cRect.top;

        // if same layer (sibling): route as an arch above
        const sameLayer = nodeById(a).layerId === nodeById(b).layerId;
        let d;
        if (sameLayer) {
          const midY = Math.min(y1, y2) - 16;
          d = `M ${x1} ${aR.top - cRect.top} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${bR.top - cRect.top}`;
        } else {
          const dy = y2 - y1;
          const cp = Math.max(20, dy * 0.55);
          d = `M ${x1} ${y1} C ${x1} ${y1 + cp}, ${x2} ${y2 - cp}, ${x2} ${y2}`;
        }
        paths.set(edgeKey(a, b), { d, type });
      }
      setLayout({ paths, w: container.offsetWidth, h: container.offsetHeight, ready: true });
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  return (
    <div className="diagram" ref={containerRef}>
      <div className="diagram-grid" aria-hidden="true"></div>

      <div className="diagram-inner">
        {window.LAYERS.map((layer) => (
          <Layer
            key={layer.id}
            layer={layer}
            activeNodes={activeNodes}
            registerNode={(id, el) => { nodeRefs.current[id] = el; }}
            onNodeHover={onNodeHover}
          />
        ))}
      </div>

      <svg className="connectors" width={layout.w} height={layout.h} viewBox={`0 0 ${layout.w} ${layout.h}`}>
        <defs>
          {[...layout.paths.entries()].map(([k, p]) => (
            <path key={k} id={`p-${k}`} d={p.d} />
          ))}
        </defs>
        {/* base edges */}
        {[...layout.paths.entries()].map(([k, p]) => {
          const lit = litEdges.get(k);
          const cls = `edge ${lit ? `lit-${lit}` : ''}`;
          return <path key={k} className={cls} d={p.d} strokeWidth={lit ? 1.5 : 1} opacity={lit ? 0.9 : 0.5} />;
        })}
        {/* animated dots */}
        {dots.map((dot) => {
          const path = layout.paths.get(dot.edge);
          if (!path) return null;
          return (
            <circle key={dot.id} className={`dot ${dot.type}`} r="3.5">
              <animateMotion dur={`${dot.dur}ms`} begin="0s" fill="freeze" repeatCount="1">
                <mpath href={`#p-${dot.edge}`} />
              </animateMotion>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

/* ── Layer + Node ──────────────────────────────────────────────── */

function Layer({ layer, activeNodes, registerNode, onNodeHover }) {
  return (
    <div className="layer">
      <div className="layer-label">
        <div className="code">{layer.code}</div>
        <div className="title">{layer.title}</div>
        <div className="sub">{layer.sub}</div>
        <div className="accent">
          <span className="swatch" style={{ background: `var(--${layer.accent})` }}></span>
          {layer.accent === 'flow' ? 'data flow' : layer.accent === 'value' ? 'value flow' : 'onchain'}
        </div>
      </div>
      <div className="layer-row" style={{ gridTemplateColumns: `repeat(${layer.nodes.length}, minmax(0, 1fr))` }}>
        {layer.nodes.map((n) => (
          <Node
            key={n.id}
            node={n}
            activeType={activeNodes.get(n.id)}
            register={(el) => registerNode(n.id, el)}
            onHover={onNodeHover}
          />
        ))}
      </div>
    </div>
  );
}

function Node({ node, activeType, register, onHover }) {
  const cls = ['node'];
  if (activeType === 'flow')  cls.push('active');
  if (activeType === 'value') cls.push('active--value');
  if (activeType === 'event') cls.push('active--event');

  return (
    <div
      className={cls.join(' ')}
      ref={register}
      onMouseEnter={(e) => onHover && onHover(node, e.currentTarget)}
      onMouseLeave={() => onHover && onHover(null, null)}
    >
      <div className="node-head">
        <div className="node-kind">{node.kind}</div>
        <div className="node-status"></div>
      </div>
      <div className="node-name">{node.name}</div>
      <div className="node-meta">
        {node.addr ? <span className="mono-addr">{node.addr}</span> : node.meta}
      </div>
      <div className="node-foot">
        {node.price ? <span className="price">{node.price}</span> : <span>{node.foot || node.meta}</span>}
      </div>
    </div>
  );
}

/* ── Event Log ─────────────────────────────────────────────────── */

function EventLog({ events }) {
  return (
    <aside className="events">
      <div className="events-head">
        <div className="title">› EVENT LOG</div>
        <div className="count">{events.length} events · streaming</div>
      </div>
      <div className="events-list">
        {events.map((ev) => (
          <div className="event" key={ev.id}>
            <div className="ts">{ev.ts}</div>
            <div className="body">
              <div className="row1">
                <div className="sig">{ev.sig}</div>
                <div className={`src ${ev.src}`}>{ev.src}</div>
              </div>
              <div className="args" dangerouslySetInnerHTML={{ __html: ev.args
                .replaceAll('<addr>', '<span class="addr">').replaceAll('</addr>', '</span>')
                .replaceAll('<val>',  '<span class="val">' ).replaceAll('</val>',  '</span>')
              }}></div>
              <div className="tx">
                <span>tx</span>
                <span className="hash">{ev.tx}</span>
                <span>· blk #{ev.block.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

/* ── Inspector tooltip ─────────────────────────────────────────── */

function Inspector({ node, anchor }) {
  if (!node || !anchor) return null;
  const r = anchor.getBoundingClientRect();
  const style = {
    top: r.bottom + window.scrollY + 8,
    left: Math.min(r.left + window.scrollX, window.innerWidth - 320),
  };
  return (
    <div className="inspector" style={style}>
      <div className="ih">{node.kind}</div>
      <div className="it">{node.name}</div>
      {node.addr && <div className="ir"><span className="k">address</span><span className="v addr">{node.addr}</span></div>}
      {node.meta && <div className="ir"><span className="k">{node.addr ? 'contract' : 'tech'}</span><span className="v">{node.meta}</span></div>}
      {node.price && <div className="ir"><span className="k">price</span><span className="v val">{node.price}</span></div>}
      {node.foot && <div className="ir"><span className="k">role</span><span className="v">{node.foot}</span></div>}
    </div>
  );
}

/* ── App ───────────────────────────────────────────────────────── */

function App() {
  const [balance, setBalance] = useState(12.000000);
  const [block, setBlock] = useState(847_293);
  const [gas, setGas] = useState(1.20);
  const [queries, setQueries] = useState(0);
  const [running, setRunning] = useState(false);
  const [auto, setAuto] = useState(true);

  const [litEdges, setLitEdges] = useState(new Map());
  const [activeNodes, setActiveNodes] = useState(new Map());
  const [dots, setDots] = useState([]);
  const [events, setEvents] = useState(() => seedEvents());

  const [hoverNode, setHoverNode] = useState(null);
  const [hoverEl, setHoverEl] = useState(null);
  const onNodeHover = useCallback((n, el) => { setHoverNode(n); setHoverEl(el); }, []);

  // Block height ticker — Arc has ~250ms blocks
  useEffect(() => {
    const i = setInterval(() => {
      setBlock((b) => b + 1);
      setGas((g) => Math.max(0.8, Math.min(2.4, g + (Math.random() - 0.5) * 0.05)));
    }, 250);
    return () => clearInterval(i);
  }, []);

  // Run a scenario
  const runScenario = useCallback((scenario) => {
    if (running) return;
    setRunning(true);
    setQueries((q) => q + 1);

    const userAddr = randAddr();
    const providerAddr = randAddr();

    let lastTimer;
    scenario.steps.forEach((step, idx) => {
      const t = setTimeout(() => {
        // light edges + spawn dots
        const edgesToLight = step.edges.map(([a, b]) => {
          const type = window.EDGES.find((e) => e[0] === a && e[1] === b)?.[2] || 'flow';
          return { key: edgeKey(a, b), type, from: a, to: b };
        });

        setLitEdges((prev) => {
          const next = new Map(prev);
          for (const e of edgesToLight) next.set(e.key, e.type);
          return next;
        });
        setActiveNodes((prev) => {
          const next = new Map(prev);
          for (const e of edgesToLight) { next.set(e.from, e.type); next.set(e.to, e.type); }
          return next;
        });
        // spawn dots
        const newDots = edgesToLight.map((e) => ({
          id: `d-${Date.now()}-${Math.random()}`,
          edge: e.key,
          type: e.type,
          dur: 700,
        }));
        setDots((d) => [...d, ...newDots]);

        // clear dots after animation
        setTimeout(() => {
          setDots((d) => d.filter((dot) => !newDots.includes(dot)));
        }, 750);
        // dim edge after the dot has crossed
        setTimeout(() => {
          setLitEdges((prev) => {
            const next = new Map(prev);
            for (const e of edgesToLight) next.delete(e.key);
            return next;
          });
        }, 900);

        // push event
        const evType = step.ev;
        const tpl = window.EVENT_TEMPLATES[evType];
        if (tpl) {
          const ctx = {
            prompt: scenario.prompt,
            taskType: scenario.id === 'image-query' ? 'image-generation' :
                      scenario.id === 'search-query' ? 'web-search' : 'text-completion',
            model: step.model || '—',
            amount: step.amount ?? scenario.cost,
            user: userAddr,
            provider: providerAddr,
            latency: 240 + Math.floor(Math.random() * 380),
            block: block + Math.floor(Math.random() * 8),
          };
          const ev = {
            id: `ev-${Date.now()}-${idx}-${Math.random()}`,
            ts: now(),
            sig: tpl.sig,
            src: tpl.src,
            args: tpl.args(ctx),
            tx: randTx(),
            block: ctx.block,
          };
          setEvents((prev) => [ev, ...prev].slice(0, 80));
        }

        // balance delta on the last step (or on usdc.transfer / usdc.mint)
        if (evType === 'usdc.transfer' || evType === 'usdc.mint') {
          setBalance((b) => {
            const next = evType === 'usdc.mint' ? b + Math.abs(scenario.cost) : b - Math.abs(scenario.cost);
            return Math.max(0, parseFloat(next.toFixed(6)));
          });
        }
      }, step.delay);
      lastTimer = t;
    });

    // finished
    const last = scenario.steps[scenario.steps.length - 1];
    setTimeout(() => {
      setRunning(false);
      // fully clear lit + active a moment later
      setTimeout(() => {
        setActiveNodes(new Map());
        setLitEdges(new Map());
      }, 600);
    }, last.delay + 800);
  }, [running, block]);

  // Manual run — cycle through scenarios
  const scenarioIdx = useRef(0);
  const handleRun = useCallback(() => {
    const s = window.SCENARIOS[scenarioIdx.current % (window.SCENARIOS.length - 1)]; // skip recharge in manual cycle
    scenarioIdx.current++;
    runScenario(s);
  }, [runScenario]);

  // Auto loop
  useEffect(() => {
    if (!auto) return;
    let cancelled = false;
    const loop = async () => {
      while (!cancelled) {
        // Occasionally fire a recharge to keep balance up
        const s = (Math.random() < 0.12)
          ? window.SCENARIOS.find((x) => x.id === 'recharge')
          : window.SCENARIOS[Math.floor(Math.random() * 3)];
        await new Promise((r) => setTimeout(r, 200));
        if (cancelled) return;
        runScenario(s);
        await new Promise((r) => setTimeout(r, 3800 + Math.random() * 1400));
      }
    };
    loop();
    return () => { cancelled = true; };
  }, [auto, runScenario]);

  return (
    <div className="app">
      <Header
        balance={balance}
        block={block}
        gas={gas}
        queries={queries}
        running={running}
        onRun={handleRun}
        onAuto={() => setAuto((a) => !a)}
        auto={auto}
      />
      <div className="main">
        <Diagram
          litEdges={litEdges}
          activeNodes={activeNodes}
          dots={dots}
          onNodeHover={onNodeHover}
        />
        <EventLog events={events} />
      </div>
      <footer className="footer">
        <div className="legend">
          <div className="legend-item"><span className="lswatch flow"></span> data flow · prompt + intent</div>
          <div className="legend-item"><span className="lswatch value"></span> value flow · USDC payment</div>
          <div className="legend-item"><span className="lswatch event"></span> onchain · contract event</div>
          <div className="legend-item"><span className="ldash"></span> idle edge</div>
        </div>
        <div className="footer-meta">
          built on <span className="v">Circle Arc</span> · <span className="v">Nanopayments</span> · <span className="v">CCTP v2</span> · <span className="v">Programmable Wallets</span>
        </div>
      </footer>
      <Inspector node={hoverNode} anchor={hoverEl} />
    </div>
  );
}

/* ── seed event log so it's not empty on load ──────────────────── */

function seedEvents() {
  const base = 847_290;
  return [
    {
      id: 's1', ts: '12:04:01', sig: 'PolicyChecked', src: 'agent',
      args: `cap=0.01 USDC · ok=true`,
      tx: randTx(), block: base + 1,
    },
    {
      id: 's2', ts: '12:04:00', sig: 'RouteSelected', src: 'agent',
      args: `model="Llama 3.3 70B"`,
      tx: randTx(), block: base,
    },
    {
      id: 's3', ts: '12:03:59', sig: 'USDC.Transfer', src: 'contract',
      args: `from=<span class="addr">${randAddr()}</span> to=<span class="addr">${randAddr()}</span> value=<span class="val">0.000061</span>`,
      tx: randTx(), block: base - 1,
    },
    {
      id: 's4', ts: '12:03:58', sig: 'InferenceStream.Tick', src: 'contract',
      args: `provider=<span class="addr">${randAddr()}</span> drip=<span class="val">0.000061</span>`,
      tx: randTx(), block: base - 1,
    },
  ];
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
