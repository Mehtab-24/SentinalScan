import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
});

/**
 * Submit a GitHub repository URL for scanning.
 * @param {string} repoUrl
 * @returns {Promise<Object>} Created scan object.
 */
export async function submitScan(repoUrl) {
  const response = await api.post('/scans', { repoUrl });
  return response.data;
}

/**
 * Fetch the result of a specific scan by its ID.
 * @param {string|number} id
 * @returns {Promise<Object>} Scan result object.
 */
export async function getScan(id) {
  const response = await api.get(`/scans/${id}`);
  return response.data;
}

/**
 * Fetch the full scan history list.
 * @returns {Promise<Array>} Array of past scan summaries.
 */
export async function getHistory() {
  const response = await api.get('/history');
  return response.data;
}
