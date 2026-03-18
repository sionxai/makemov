import { getStageOptionDefs } from '../services/pipelinePrompts';

export default function StageOptions({ stage, value, onChange }) {
    const defs = getStageOptionDefs(stage);

    if (!defs.length) return null;

    function updateField(key, nextValue) {
        onChange({
            ...value,
            [key]: nextValue,
        });
    }

    return (
        <div className="ai-options">
            <div className="ai-options__header">
                <span>⚙️</span>
                <span>생성 옵션</span>
            </div>

            <div className="ai-options__grid">
                {defs.map((field) => (
                    <label
                        key={field.key}
                        className={`ai-options__field ${field.type === 'checkbox' ? 'ai-options__field--checkbox' : ''}`}
                    >
                        <span className="ai-options__label">{field.label}</span>

                        {field.type === 'select' && (
                            <select
                                className="form-select"
                                value={value[field.key] ?? ''}
                                onChange={(event) => updateField(field.key, event.target.value)}
                            >
                                {field.options.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        )}

                        {field.type === 'number' && (
                            <input
                                className="form-input"
                                type="number"
                                min={field.min}
                                max={field.max}
                                value={value[field.key] ?? ''}
                                onChange={(event) => updateField(field.key, Number(event.target.value))}
                            />
                        )}

                        {field.type === 'checkbox' && (
                            <span className="ai-options__checkbox-wrap">
                                <input
                                    className="ai-options__checkbox"
                                    type="checkbox"
                                    checked={Boolean(value[field.key])}
                                    onChange={(event) => updateField(field.key, event.target.checked)}
                                />
                                <span className="ai-options__checkbox-text">
                                    {value[field.key] ? '사용' : '미사용'}
                                </span>
                            </span>
                        )}

                        {field.type === 'text' && (
                            <input
                                className="form-input"
                                type="text"
                                value={value[field.key] ?? ''}
                                placeholder={field.placeholder}
                                onChange={(event) => updateField(field.key, event.target.value)}
                            />
                        )}
                    </label>
                ))}
            </div>
        </div>
    );
}
