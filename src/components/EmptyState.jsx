export default function EmptyState({ title = 'Sin datos', text = 'Todavía no hay registros para mostrar.' }) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
