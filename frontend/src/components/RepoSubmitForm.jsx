import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submitScan } from '../api/scanApi';
import Spinner from './Spinner';

/**
 * RepoSubmitForm — form for entering a GitHub repo URL and triggering a scan.
 */
export default function RepoSubmitForm() {
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const scan = await submitScan(repoUrl);
      navigate(`/scans/${scan.id}`);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to submit scan. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="repo-url" className="block text-sm font-medium text-gray-700">
          GitHub Repository URL
        </label>
        <input
          id="repo-url"
          type="url"
          required
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm
                     text-gray-900 placeholder-gray-400 shadow-sm
                     transition-colors duration-150
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     hover:border-gray-400"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <span className="mt-0.5 text-red-500">⚠</span>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg
                   bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white
                   shadow-sm transition-all duration-150
                   hover:bg-blue-700 hover:shadow-md
                   active:scale-[0.98]
                   disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm"
      >
        {loading && <Spinner size="h-4 w-4" color="text-white" />}
        {loading ? 'Submitting…' : 'Scan Repository'}
      </button>
    </form>
  );
}
