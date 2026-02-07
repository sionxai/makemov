import { NavLink, useLocation } from 'react-router-dom';

export default function Sidebar() {
    const location = useLocation();
    const isProjectPage = location.pathname.startsWith('/project/');

    // pathname에서 projectId 추출: /project/:id/...
    const projectId = isProjectPage
        ? location.pathname.split('/')[2]
        : null;
    const baseUrl = projectId ? `/project/${projectId}` : '';

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="logo-icon">🎬</div>
                <h1>makemov</h1>
            </div>

            <nav className="sidebar-nav">
                <span className="sidebar-section-title">메뉴</span>
                <NavLink
                    to="/"
                    end
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                    <span className="link-icon">📂</span>
                    <span>프로젝트</span>
                </NavLink>

                {isProjectPage && (
                    <>
                        <span className="sidebar-section-title">파이프라인</span>
                        <SidebarStep to={`${baseUrl}/synopsis`} icon="📄" label="시놉시스" />
                        <SidebarStep to={`${baseUrl}/screenplay`} icon="📝" label="시나리오" />
                        <SidebarStep to={`${baseUrl}/conti`} icon="📋" label="줄콘티" />
                        <SidebarStep to={`${baseUrl}/storyboard`} icon="🎬" label="스토리보드" />
                        <SidebarStep to={`${baseUrl}/keyvisual`} icon="🎨" label="키비주얼" />
                        <SidebarStep to={`${baseUrl}/prompts`} icon="🎥" label="프롬프트" />
                    </>
                )}
            </nav>

            <div style={{ marginTop: 'auto', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    makemov v0.1.0<br />
                    by Aeon & Sion
                </div>
            </div>
        </aside>
    );
}

function SidebarStep({ to, icon, label }) {
    const location = useLocation();
    const isActive = location.pathname === to;

    return (
        <NavLink
            to={to}
            className={`sidebar-link ${isActive ? 'active' : ''}`}
        >
            <span className="link-icon">{icon}</span>
            <span>{label}</span>
        </NavLink>
    );
}
