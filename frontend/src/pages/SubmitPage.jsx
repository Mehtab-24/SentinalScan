import RepoSubmitForm from '../components/RepoSubmitForm';
import { Link } from 'react-router-dom';

/**
 * SubmitPage — entry point where users submit a GitHub repo for scanning.
 * Route: /
 */
export default function SubmitPage() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">

        {/* Brand header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="rounded-lg bg-blue-600 p-2 text-white text-lg leading-none">🛡</span>
            <span className="text-2xl font-bold text-gray-900">SentinelScan</span>
          </div>
          <p className="text-sm text-gray-500">
            Automated security scanning for GitHub repositories
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-base font-semibold text-gray-800 mb-5">
            Scan a Repository
          </h1>
          <RepoSubmitForm />
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-gray-400">
          View past scans in{' '}
          <Link to="/history" className="font-medium text-blue-600 hover:underline">
            History
          </Link>
        </p>

      </div>
    </main>
  );
}
