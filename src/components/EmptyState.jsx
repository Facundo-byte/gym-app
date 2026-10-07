export default function EmptyState({ title, description, children, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`
  return (
    <div className="empty-state">
      <Heading className="empty-state__title">{title}</Heading>
      <p>{description}</p>
      {children && <div className="empty-state__actions">{children}</div>}
    </div>
  )
}
