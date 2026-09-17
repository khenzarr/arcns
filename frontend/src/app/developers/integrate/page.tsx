import Link from "next/link";
import { CopyButton } from "../../../components/ui/CopyButton";
import { NETWORK_DISPLAY } from "../../../lib/networkDisplay";

const BASE_URL = "https://arcname.services/api/v1";

const CURL_EXAMPLE = `curl --request GET \\
  --url https://arcname.services/api/v1/resolve/name/iscander.arc \\
  --header 'Accept: application/json'`;

const TYPESCRIPT_EXAMPLE = `type ArcNSResolution =
  | { status: "ok"; name: string; address: \`0x\${string}\`; owner: string | null; expiry: number | null; source: "subgraph" | "rpc" }
  | { status: "not_found"; hint: string }
  | { status: "error"; code: "INVALID_NAME" | "UNSUPPORTED_TLD" | "MALFORMED_INPUT" | "RATE_LIMITED" | "UPSTREAM_UNAVAILABLE" | "INTERNAL_ERROR"; hint: string };

export async function resolveArcNSName(name: string) {
  const normalized = name.trim().toLowerCase();
  const response = await fetch(
    \`https://arcname.services/api/v1/resolve/name/\${encodeURIComponent(normalized)}\`,
    { headers: { Accept: "application/json" } },
  );
  const result = (await response.json()) as ArcNSResolution;

  if (!response.ok || result.status !== "ok") {
    throw new Error("hint" in result ? result.hint : "ArcNS resolution failed");
  }
  return result;
}`;

const REACT_EXAMPLE = `import { useEffect, useState } from "react";
import { resolveArcNSName } from "./arcns";

export function RecipientPreview({ name }: { name: string }) {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setAddress(null);
    setError(null);
    resolveArcNSName(name)
      .then(result => active && setAddress(result.address))
      .catch(err => active && setError(err.message));
    return () => { active = false; };
  }, [name]);

  if (error) return <p role="alert">{error}</p>;
  if (!address) return <p>Resolving...</p>;
  return <p>{name} → {address}</p>;
}`;

const REVERSE_EXAMPLE = `const address = "0x503B20B4342261a205830Fd55794788463bdE74B";
const response = await fetch(
  \`https://arcname.services/api/v1/resolve/address/\${address}\`,
);
const result = await response.json();

// A reverse name is returned only after forward confirmation.
if (response.ok && result.status === "ok") {
  console.log(result.name);
}`;

const SERVER_PROXY_EXAMPLE = `// app/api/recipient/[name]/route.ts
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: { name: string } }) {
  const upstream = await fetch(
    \`https://arcname.services/api/v1/resolve/name/\${encodeURIComponent(params.name)}\`,
    { next: { revalidate: 30 } },
  );
  const body = await upstream.json();
  return NextResponse.json(body, { status: upstream.status });
}`;

function CodeBlock({ title, language, code }: { title: string; language: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#050914] shadow-[0_22px_70px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.035] px-4 py-2.5">
        <div className="flex items-center gap-3"><span className="text-xs font-semibold text-white">{title}</span><span className="text-[10px] uppercase tracking-[0.16em] text-[var(--arcns-text-muted)]">{language}</span></div>
        <CopyButton value={code} aria-label={`Copy ${title}`} />
      </div>
      <pre className="overflow-x-auto p-4 text-[13px] leading-6 text-[#c9d7ed]"><code>{code}</code></pre>
    </div>
  );
}

function Step({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="scroll-mt-28 border-t border-white/10 py-10 first:border-t-0 first:pt-0">
      <div className="grid gap-5 md:grid-cols-[140px_1fr]">
        <div><span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--arcns-cyan)]">Step {number}</span><h2 className="mt-2 text-xl font-bold tracking-tight text-white">{title}</h2></div>
        <div className="min-w-0 space-y-5 text-sm leading-7 text-[var(--arcns-text-secondary)]">{children}</div>
      </div>
    </section>
  );
}

export default function IntegratePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050a18] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_top,rgba(37,99,255,0.22),transparent_62%),radial-gradient(circle_at_78%_14%,rgba(0,212,255,0.10),transparent_24%)]" aria-hidden="true" />
      <div className="relative mx-auto w-full max-w-[1180px]">
        <header className="grid gap-8 border-b border-white/10 pb-12 lg:grid-cols-[1fr_0.7fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--arcns-cyan)]">Developer integration</p>
            <h1 className="mt-4 max-w-4xl font-space-grotesk text-5xl font-semibold leading-[0.94] tracking-[-0.055em] text-white sm:text-6xl lg:text-7xl">Human-readable Arc recipients in <span className="arcns-gradient-text">minutes.</span></h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--arcns-text-secondary)]">Resolve <code>.arc</code> and <code>.circle</code> names through one public, CORS-enabled API. No SDK, API key, or contract ABI is required for the first integration.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--arcns-text-muted)]">Public base URL</p>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-black/25 px-3 py-2"><code className="min-w-0 truncate text-sm text-white">{BASE_URL}</code><CopyButton value={BASE_URL} aria-label="Copy ArcNS API base URL" /></div>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold"><span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-300">Live</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[var(--arcns-text-secondary)]">{NETWORK_DISPLAY.networkDisplayName}</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[var(--arcns-text-secondary)]">API v1</span></div>
          </div>
        </header>

        <div className="grid gap-10 pt-10 lg:grid-cols-[230px_1fr]">
          <aside className="hidden lg:block"><nav className="sticky top-28 space-y-1 text-sm" aria-label="Integration guide"><p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--arcns-text-muted)]">On this page</p>{[["01","Test the endpoint"],["02","Add the client"],["03","Build recipient UX"],["04","Add reverse names"],["05","Harden production"]].map(([n,label]) => <a key={n} href={`#step-${n}`} className="flex gap-3 rounded-xl px-3 py-2 text-[var(--arcns-text-secondary)] hover:bg-white/5 hover:text-white"><span className="text-[var(--arcns-cyan)]">{n}</span>{label}</a>)}</nav></aside>

          <article className="min-w-0 rounded-[28px] border border-white/10 bg-[rgba(8,14,31,0.72)] p-5 shadow-[0_34px_110px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8 lg:p-10">
            <div id="step-01"><Step number="01" title="Test the endpoint"><p>Start with a known name. The API normalizes case, validates the namespace, and returns the resolved address plus ownership and expiry context when available.</p><CodeBlock title="Resolve a name" language="shell" code={CURL_EXAMPLE} /><div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><p className="font-semibold text-white">Expected success</p><pre className="mt-3 overflow-x-auto text-xs leading-6 text-[#b8c7dd]"><code>{`{
  "status": "ok",
  "name": "iscander.arc",
  "address": "0x503B20B4342261a205830Fd55794788463bdE74B",
  "owner": "0x503B20B4342261a205830Fd55794788463bdE74B",
  "expiry": null,
  "source": "rpc"
}`}</code></pre></div></Step></div>

            <div id="step-02"><Step number="02" title="Add a typed client"><p>Keep the adapter behind one function so your application has a single place for normalization, error handling, caching, and future version changes.</p><CodeBlock title="arcns.ts" language="TypeScript" code={TYPESCRIPT_EXAMPLE} /><div className="grid gap-3 sm:grid-cols-3">{[["200 / ok","Resolved address returned"],["200 / not_found","Valid input, no record"],["400 / error","Malformed name or TLD"],["429 / error","Rate limit reached; respect Retry-After"],["503 / error","Upstream temporarily unavailable"]].map(([status,meaning]) => <div key={status} className="rounded-xl border border-white/10 bg-white/[0.025] p-3"><code className="text-xs text-[var(--arcns-cyan)]">{status}</code><p className="mt-2 text-xs leading-5">{meaning}</p></div>)}</div></Step></div>

            <div id="step-03"><Step number="03" title="Build safe recipient UX"><p>Resolve after the user pauses or leaves the input, then show the complete destination address before any signature request. Never replace the address with the name in the final review screen.</p><CodeBlock title="RecipientPreview.tsx" language="React" code={REACT_EXAMPLE} /><div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-amber-100"><strong>Payment safety:</strong> cache only briefly, re-resolve immediately before transaction construction, and display the final address that will receive funds.</div></Step></div>

            <div id="step-04"><Step number="04" title="Add reverse names"><p>Use reverse resolution to decorate wallet addresses in activity feeds and account menus. ArcNS only returns a primary name after forward confirmation, preventing a name from claiming an unrelated address.</p><p>Several names may resolve to one address, but that address has at most one primary name. A flow such as <code>alias.arc → address → primary.circle</code> is a composed forward and verified reverse lookup, not a direct name-to-name redirect.</p><CodeBlock title="Reverse lookup" language="TypeScript" code={REVERSE_EXAMPLE} /></Step></div>

            <div id="step-05"><Step number="05" title="Harden production"><p>For backend-heavy applications, proxy and cache the public adapter so you control retries, observability, and your user-facing availability policy. The public limit is 60 resolution requests per minute per IP; list-heavy explorers, trading terminals, and activity feeds should coalesce and cache lookups server-side.</p><CodeBlock title="Server-side proxy" language="Next.js" code={SERVER_PROXY_EXAMPLE} /><div className="grid gap-3 sm:grid-cols-2">{["Validate .arc or .circle before calling the API","Use AbortController and a short timeout","Respect Cache-Control and Retry-After","Treat 200 not_found differently from 429 or 503","Show the final 0x address before transfers","Keep a direct-address fallback available","Monitor latency, error rate, and resolution source","Pin API v1 and test error schemas in CI"].map(item => <div key={item} className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-3"><span className="text-emerald-300" aria-hidden="true">✓</span><span className="text-xs leading-5">{item}</span></div>)}</div></Step></div>

            <footer className="mt-4 flex flex-col gap-5 rounded-2xl border border-[rgba(0,212,255,0.22)] bg-[rgba(0,212,255,0.055)] p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-white">Ready to ship?</h2><p className="mt-1 text-sm text-[var(--arcns-text-secondary)]">Try resolution in the live app or inspect the full API contract on GitHub.</p></div><div className="flex flex-wrap gap-3"><Link href="/resolve" className="rounded-xl bg-[var(--arcns-gradient-primary)] px-4 py-2.5 text-sm font-bold text-white">Open Resolver</Link><a href="https://github.com/khenzarr/arcns/blob/master/docs/integration/public-adapter-api.md" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:border-[var(--arcns-cyan)]">Full API reference ↗</a></div></footer>
          </article>
        </div>
      </div>
    </main>
  );
}
