export function TableSkeleton({ rows = 6, cols = 8 }) {
  return (
    <div className="table-wrap table-skeleton" aria-hidden="true">
      <table>
        <thead>
          <tr>
            {Array.from({ length: cols }, (_, i) => (
              <th key={i}>
                <span className="skeleton-block skeleton-th" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => (
                <td key={c}>
                  <span className="skeleton-block" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <div className="detail-skeleton" aria-hidden="true">
      <div className="skeleton-block skeleton-title" />
      <div className="skeleton-block skeleton-subtitle" />
      <div className="detail-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="detail-panel">
            <div className="skeleton-block skeleton-heading" />
            <div className="skeleton-block" />
            <div className="skeleton-block" />
            <div className="skeleton-block" />
            <div className="skeleton-block skeleton-short" />
          </div>
        ))}
      </div>
    </div>
  )
}
