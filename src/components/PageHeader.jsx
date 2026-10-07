export default function PageHeader({ eyebrow, title, description, action, compactOnMobile = false }) {
  return (
    <header className={`page-header ${compactOnMobile ? 'page-header--compact' : ''}`}>
      <div className="page-header__copy">
        <p className="page-header__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {description && <p className="page-header__description">{description}</p>}
      </div>
      {action && <div className="page-header__action">{action}</div>}
    </header>
  )
}
