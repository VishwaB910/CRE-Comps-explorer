import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchCompare } from '../api'
import EmptyState from '../components/EmptyState'
import { TableSkeleton } from '../components/Skeleton'
import { formatCurrency, formatDate, formatNumber } from '../utils/format'

const METRICS = [
  { key: 'address', label: 'Address', render: (c) => c.address },
  { key: 'city', label: 'City', render: (c) => `${c.city}, ${c.state}` },
  { key: 'market', label: 'Market', render: (c) => c.market },
  { key: 'property_type', label: 'Type', render: (c) => c.property_type },
  { key: 'square_footage', label: 'Square footage', render: (c) => formatNumber(c.square_footage) },
  { key: 'year_built', label: 'Year built', render: (c) => c.year_built || '—' },
  { key: 'sale_price', label: 'Sale price', render: (c) => formatCurrency(c.sale_price) },
  { key: 'price_per_sf', label: 'Price / SF', render: (c) => `$${formatNumber(c.price_per_sf, 2)}` },
  { key: 'cap_rate', label: 'Cap rate', render: (c) => `${formatNumber(c.cap_rate, 2)}%` },
  { key: 'sale_date', label: 'Sale date', render: (c) => formatDate(c.sale_date) },
  { key: 'buyer', label: 'Buyer', render: (c) => c.buyer },
  { key: 'seller', label: 'Seller', render: (c) => c.seller },
]

export default function ComparePage() {
  const [searchParams] = useSearchParams()
  const ids = useMemo(() => {
    const raw = searchParams.get('ids') || ''
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }, [searchParams])

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (ids.length < 2 || ids.length > 4) {
      setItems([])
      setLoading(false)
      setError(ids.length === 0 ? 'No comps selected.' : 'Select between 2 and 4 comps to compare.')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    fetchCompare(ids)
      .then((result) => {
        if (!cancelled) setItems(result.items || [])
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setItems([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [ids])

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <Link to="/" className="back-link">
            ← Back to comps
          </Link>
          <h1>Compare comps</h1>
          <p className="muted">Side-by-side metrics for the selected sales.</p>
        </div>
      </div>

      {error && !loading && items.length === 0 && (
        <EmptyState
          title="Nothing to compare"
          message={error}
          action={
            <Link to="/" className="back-link">
              Return to comps list
            </Link>
          }
        />
      )}

      {loading && <TableSkeleton rows={8} cols={Math.min(ids.length, 4) + 1 || 3} />}

      {!loading && items.length > 0 && (
        <div className="table-wrap compare-table">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                {items.map((comp) => (
                  <th key={comp.comp_id}>
                    <Link to={`/comps/${comp.comp_id}`}>{comp.address}</Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {METRICS.map((metric) => (
                <tr key={metric.key}>
                  <th scope="row">{metric.label}</th>
                  {items.map((comp) => (
                    <td key={comp.comp_id}>{metric.render(comp)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
