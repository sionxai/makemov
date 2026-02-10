import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- DEV: Firestore API를 window에 노출 (디버깅용) ---
import {
  getFirestoreProjects, getFirestoreProject,
  createFirestoreProject, updateFirestoreProject, deleteFirestoreProject,
  updateFirestoreSynopsis, updateFirestoreScreenplay, updateFirestoreConti, updateFirestoreStoryboard,
  addFirestoreKeyVisual, removeFirestoreKeyVisual,
  addFirestoreProductionPrompt, removeFirestoreProductionPrompt,
} from './firebase/projectStore'

if (import.meta.env.DEV) {
  window.__makemov = {
    getAll: getFirestoreProjects,
    get: getFirestoreProject,
    create: createFirestoreProject,
    update: updateFirestoreProject,
    delete: deleteFirestoreProject,
    updateSynopsis: updateFirestoreSynopsis,
    updateScreenplay: updateFirestoreScreenplay,
    updateConti: updateFirestoreConti,
    updateStoryboard: updateFirestoreStoryboard,
    addKeyVisual: addFirestoreKeyVisual,
    removeKeyVisual: removeFirestoreKeyVisual,
    addPrompt: addFirestoreProductionPrompt,
    removePrompt: removeFirestoreProductionPrompt,
  }
  console.log('🎬 [DEV] window.__makemov API 활성화 (Firestore SSOT)')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
