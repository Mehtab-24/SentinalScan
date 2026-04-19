import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SubmitPage from './pages/SubmitPage';
import ScanResultPage from './pages/ScanResultPage';
import HistoryPage from './pages/HistoryPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home — submit a repository for scanning */}
        <Route path="/" element={<SubmitPage />} />

        {/* Scan result detail view */}
        <Route path="/scans/:id" element={<ScanResultPage />} />

        {/* Full scan history */}
        <Route path="/history" element={<HistoryPage />} />
      </Routes>
    </BrowserRouter>
  );
}
