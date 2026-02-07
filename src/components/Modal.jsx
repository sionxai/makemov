import { useState } from 'react';

export function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                {children}
            </div>
        </div>
    );
}

export function CreateProjectModal({ isOpen, onClose, onCreate }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onCreate(title.trim(), description.trim());
        setTitle('');
        setDescription('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="새 프로젝트 만들기">
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">프로젝트 제목 *</label>
                    <input
                        className="form-input"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="예: 한강의 새벽"
                        autoFocus
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">간단한 설명</label>
                    <textarea
                        className="form-textarea"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="어떤 영상인지 간단히 적어주세요..."
                        rows={3}
                    />
                </div>
                <div className="modal-actions">
                    <button type="button" className="btn btn-ghost" onClick={onClose}>취소</button>
                    <button type="submit" className="btn btn-primary" disabled={!title.trim()}>만들기</button>
                </div>
            </form>
        </Modal>
    );
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>{message}</p>
            <div className="modal-actions">
                <button className="btn btn-ghost" onClick={onClose}>취소</button>
                <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>삭제</button>
            </div>
        </Modal>
    );
}
