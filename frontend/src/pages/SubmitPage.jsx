import RepoSubmitForm from '../components/RepoSubmitForm';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

/**
 * SubmitPage — entry point where users submit a GitHub repo for scanning.
 * Route: /
 */
export default function SubmitPage() {
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <Navbar />

      <main className="mx-auto max-w-5xl px-6 py-16">
        {/* Hero section */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-800/60 bg-blue-900/30 px-4 py-1.5 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-xs font-medium text-blue-400 tracking-wide">Automated Security Analysis</span>
          </div>

          <h1 className="text-4xl font-extrabold text-slate-100 tracking-tight">
            Scan Your Repository
          </h1>
          <p className="text-base text-slate-500 max-w-md mx-auto leading-relaxed">
            Run static analysis and dependency scanning on any public GitHub repository.
            Get a security score in seconds.
          </p>
        </div>

        {/* Form card */}
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/40">
            <h2 className="text-lg font-semibold text-slate-100 mb-6">
              Enter a GitHub URL
            </h2>
            <RepoSubmitForm />
          </div>

          {/* Feature chips */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {[
              { icon: '🔬', label: 'Semgrep SAST' },
              { icon: '📦', label: 'Trivy SCA' },
              { icon: '📊', label: 'Security Score' },
            ].map(({ icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-2.5"
              >
                <span className="text-base">{icon}</span>
                <span className="text-xs font-medium text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
