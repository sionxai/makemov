import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// --- DEV: DB API를 window에 노출 (에온이 브라우저에서 데이터 직접 주입/수정) ---
import {
  getAllProjects, getProject, createProject, updateProject, deleteProject,
  updateSynopsis, updateScreenplay, updateConti, updateStoryboard,
  addKeyVisual, removeKeyVisual, addProductionPrompt, removeProductionPrompt,
  exportProject, importProject,
} from './db'

if (import.meta.env.DEV) {
  window.__makemov = {
    getAllProjects, getProject, createProject, updateProject, deleteProject,
    updateSynopsis, updateScreenplay, updateConti, updateStoryboard,
    addKeyVisual, removeKeyVisual, addProductionPrompt, removeProductionPrompt,
    exportProject, importProject,
  }
  console.log('🎬 [DEV] window.__makemov API 활성화 — 콘솔에서 데이터 직접 조작 가능')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
