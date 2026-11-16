/** Shown when the Supabase keys are missing from .env, instead of a blank page. */
export function SetupPage() {
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-emerald-400 text-3xl font-bold mb-1">Savely</h1>
        <p className="text-slate-300 mb-4">Supabase isn't connected yet.</p>
        <p className="text-slate-400 text-sm mb-3">
          Add your Supabase project's URL and publishable key to the <code className="text-slate-200">.env</code> file
          at the repo root, then restart <code className="text-slate-200">npm run dev</code>:
        </p>
        <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 overflow-x-auto">
{`SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...`}
        </pre>
        <p className="text-slate-500 text-sm mt-3">
          Both values are in the Supabase dashboard under Project Settings → API Keys.
        </p>
      </div>
    </div>
  );
}
