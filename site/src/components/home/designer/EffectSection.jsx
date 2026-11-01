import Icon from '../../Icon';

// Titled group of effect cards. Pass onToggle to make the section collapsible.
const EffectSection = ({ title, count, variant, hint, expanded = true, onToggle, children }) => {
    const heading = (
        <>
            {onToggle && <Icon name="chevron_right" size={16} className={`fx-section-chevron${expanded ? ' open' : ''}`} />}
            <span className="fx-section-dot" />
            <span className="fx-section-title">{title}</span>
            <span className="fx-section-count">{count}</span>
            {hint && <span className="fx-section-hint">{hint}</span>}
        </>
    );
    return (
        <section className={`fx-section fx-section--${variant}`}>
            {onToggle
                ? <button className="fx-section-header" onClick={onToggle} aria-expanded={expanded}>{heading}</button>
                : <div className="fx-section-header">{heading}</div>}
            {expanded && children}
        </section>
    );
};

export default EffectSection;
