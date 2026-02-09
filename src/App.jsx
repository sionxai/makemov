import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ProjectLayout from './pages/ProjectLayout';
import SynopsisPage from './pages/SynopsisPage';
import ScreenplayPage from './pages/ScreenplayPage';
import ContiPage from './pages/ContiPage';
import StoryboardPage from './pages/StoryboardPage';
import KeyVisualPage from './pages/KeyVisualPage';
import PromptsPage from './pages/PromptsPage';
import AgentGuidePage from './pages/AgentGuidePage';

const ImageToolPage = lazy(() => import('./pages/ImageToolPage'));

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agent-guide" element={<AgentGuidePage />} />
            <Route
              path="/image-tool"
              element={(
                <Suspense fallback={<div className="empty-state"><div style={{ animation: 'pulse 1.5s infinite' }}>로딩중...</div></div>}>
                  <ImageToolPage />
                </Suspense>
              )}
            />
            <Route path="/project/:id" element={<ProjectLayout />}>
              <Route path="synopsis" element={<SynopsisPage />} />
              <Route path="screenplay" element={<ScreenplayPage />} />
              <Route path="conti" element={<ContiPage />} />
              <Route path="storyboard" element={<StoryboardPage />} />
              <Route path="keyvisual" element={<KeyVisualPage />} />
              <Route path="prompts" element={<PromptsPage />} />
            </Route>
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
