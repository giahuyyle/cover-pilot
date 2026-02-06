export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Starter</p>
        <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">Vite + React + Tailwind</h1>
        <p className="mt-4 text-base text-slate-300 sm:text-lg">
          Edit <span className="font-mono text-slate-200">src/App.jsx</span> and save to test HMR.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            className="rounded-full bg-white/10 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            href="https://vitejs.dev"
            target="_blank"
            rel="noreferrer"
          >
            Vite Docs
          </a>
          <a
            className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white/90 transition hover:border-white/40"
            href="https://tailwindcss.com"
            target="_blank"
            rel="noreferrer"
          >
            Tailwind Docs
          </a>
        </div>
      </div>
    </div>
  );
}
