export default function Page() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-4xl font-bold">DepthGuard</h1>
      <p className="text-slate-400 mt-2">CI/CD for AI security. Automated AI pen tests that mirror real attackers.</p>
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 mt-6">
        <h3 className="text-xl font-semibold mb-1">Free instant test</h3>
        <p className="text-slate-400 mb-4">Paste your AI endpoint URL and run 2 headline attacks with blurred results.</p>
        <a className="inline-block bg-blue-400 text-black font-semibold px-4 py-2 rounded-lg" href="/dashboard">Open Dashboard</a>
      </div>
      <div className="mt-8">
        <h3 className="text-xl font-semibold">Why DepthGuard?</h3>
        <ul className="list-disc ml-6 mt-2 text-slate-300">
          <li>Defense-in-Depth for AI apps</li>
          <li>Six-phase methodology (inputs → ecosystem → model → prompt → data → app)</li>
          <li>RAG & multi-agent aware</li>
        </ul>
      </div>
    </main>
  );
}
