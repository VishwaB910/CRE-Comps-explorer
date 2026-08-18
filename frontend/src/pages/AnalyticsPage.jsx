import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { fetchAnalytics } from '../api'
import { formatCurrency, formatNumber } from '../utils/format'

const TYPE_COLORS = ['#0f6a5c', '#1f4b99', '#b45309', '#7c3aed']

function ChartCard({ title, note, children }) {
  return (
    <div className="detail-panel">
      <h2>{title}</h2>
      {note && <p className="muted chart-note">{note}</p>}
      <div className="chart-wrap">{children}</div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="banner">Loading analytics…</div>
  if (error) return <div className="banner error">{error}</div>
  if (!data) return null

  const priceTrend = (data.price_per_sf_trend || []).map((row) => ({
    ...row,
    avg_price_per_sf: Number(row.avg_price_per_sf),
  }))

  const capTrend = (data.cap_rate_trend || []).map((row) => ({
    ...row,
    avg_cap_rate: Number(row.avg_cap_rate),
  }))

  const volumeTrend = (data.volume_by_month || []).map((row) => ({
    ...row,
    deal_count: Number(row.deal_count),
    total_sale_price: Number(row.total_sale_price),
    total_sale_price_m: Number(row.total_sale_price) / 1_000_000,
  }))

  const marketPrice = (data.by_market || []).map((row) => ({
    name: row.market,
    avg_price_per_sf: Number(row.avg_price_per_sf),
    avg_sale_price_m: Number(row.avg_sale_price || 0) / 1_000_000,
    comp_count: row.comp_count,
  }))

  const typeCap = (data.by_property_type || []).map((row) => ({
    name: row.property_type,
    avg_cap_rate: Number(row.avg_cap_rate),
    avg_price_per_sf: Number(row.avg_price_per_sf),
  }))

  const typeMix = (data.by_property_type || []).map((row) => ({
    name: row.property_type,
    value: row.comp_count,
  }))

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1>Market analytics</h1>
          <p className="muted">Trends, market comparisons, and property-type mix from the comps set.</p>
        </div>
      </div>

      <div className="analytics-charts">
        <ChartCard title="Price / SF trend" note="Monthly average price per square foot.">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={priceTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#c7d3dc" strokeDasharray="4 4" />
              <XAxis dataKey="sale_month" tick={{ fill: '#5d6d78', fontSize: 11 }} />
              <YAxis tick={{ fill: '#5d6d78', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value, _n, item) => [
                  `$${formatNumber(value, 2)} (${item.payload.comp_count} comps)`,
                  'Avg $/SF',
                ]}
              />
              <Line type="monotone" dataKey="avg_price_per_sf" stroke="#0f6a5c" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cap rate trend" note="Monthly average cap rate (%).">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={capTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#c7d3dc" strokeDasharray="4 4" />
              <XAxis dataKey="sale_month" tick={{ fill: '#5d6d78', fontSize: 11 }} />
              <YAxis tick={{ fill: '#5d6d78', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip
                formatter={(value, _n, item) => [
                  `${formatNumber(value, 2)}% (${item.payload.comp_count} comps)`,
                  'Avg cap rate',
                ]}
              />
              <Line type="monotone" dataKey="avg_cap_rate" stroke="#1f4b99" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Deal volume by month" note="Number of sales closed each month.">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={volumeTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#c7d3dc" strokeDasharray="4 4" />
              <XAxis dataKey="sale_month" tick={{ fill: '#5d6d78', fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#5d6d78', fontSize: 11 }} />
              <Tooltip
                formatter={(value, name, item) => {
                  if (name === 'deal_count') return [value, 'Deals']
                  return [`$${formatNumber(item.payload.total_sale_price_m, 1)}M`, 'Total volume']
                }}
              />
              <Bar dataKey="deal_count" fill="#0f6a5c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avg price / SF by market" note="Which markets trade richer on a $/SF basis.">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={marketPrice} margin={{ top: 8, right: 12, left: 0, bottom: 40 }}>
              <CartesianGrid stroke="#c7d3dc" strokeDasharray="4 4" />
              <XAxis dataKey="name" tick={{ fill: '#5d6d78', fontSize: 10 }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fill: '#5d6d78', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                formatter={(value, _n, item) => [
                  `$${formatNumber(value, 2)} (${item.payload.comp_count} comps)`,
                  'Avg $/SF',
                ]}
              />
              <Bar dataKey="avg_price_per_sf" fill="#1f4b99" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Avg sale price by market" note="Average deal size ($M) by market.">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={marketPrice} margin={{ top: 8, right: 12, left: 0, bottom: 40 }}>
              <CartesianGrid stroke="#c7d3dc" strokeDasharray="4 4" />
              <XAxis dataKey="name" tick={{ fill: '#5d6d78', fontSize: 10 }} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fill: '#5d6d78', fontSize: 11 }} tickFormatter={(v) => `$${v}M`} />
              <Tooltip
                formatter={(value) => [`$${formatNumber(value, 2)}M`, 'Avg sale price']}
              />
              <Bar dataKey="avg_sale_price_m" fill="#b45309" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Cap rate by property type" note="Higher cap usually means higher yield / risk.">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={typeCap} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#c7d3dc" strokeDasharray="4 4" />
              <XAxis dataKey="name" tick={{ fill: '#5d6d78', fontSize: 11 }} />
              <YAxis tick={{ fill: '#5d6d78', fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(value) => [`${formatNumber(value, 2)}%`, 'Avg cap rate']} />
              <Bar dataKey="avg_cap_rate" fill="#7c3aed" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Property type mix" note="Share of comps by asset class.">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={typeMix} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {typeMix.map((entry, index) => (
                  <Cell key={entry.name} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly $ volume" note="Total sale price closed each month ($M).">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={volumeTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#c7d3dc" strokeDasharray="4 4" />
              <XAxis dataKey="sale_month" tick={{ fill: '#5d6d78', fontSize: 11 }} />
              <YAxis tick={{ fill: '#5d6d78', fontSize: 11 }} tickFormatter={(v) => `$${v}M`} />
              <Tooltip
                formatter={(value, _n, item) => [
                  `${formatCurrency(item.payload.total_sale_price || value * 1_000_000)} (${item.payload.deal_count} deals)`,
                  'Volume',
                ]}
              />
              <Bar dataKey="total_sale_price_m" fill="#0f6a5c" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="analytics-grid">
        <div className="detail-panel">
          <h2>By market</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Avg price / SF</th>
                  <th>Avg cap rate</th>
                  <th>Avg sale price</th>
                  <th>Comps</th>
                </tr>
              </thead>
              <tbody>
                {data.by_market.map((row) => (
                  <tr key={row.market}>
                    <td>{row.market}</td>
                    <td>${formatNumber(row.avg_price_per_sf, 2)}</td>
                    <td>{formatNumber(row.avg_cap_rate, 2)}%</td>
                    <td>{formatCurrency(row.avg_sale_price || 0)}</td>
                    <td>{row.comp_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="detail-panel">
          <h2>By property type</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Property type</th>
                  <th>Avg price / SF</th>
                  <th>Avg cap rate</th>
                  <th>Avg sale price</th>
                  <th>Comps</th>
                </tr>
              </thead>
              <tbody>
                {data.by_property_type.map((row) => (
                  <tr key={row.property_type}>
                    <td>{row.property_type}</td>
                    <td>${formatNumber(row.avg_price_per_sf, 2)}</td>
                    <td>{formatNumber(row.avg_cap_rate, 2)}%</td>
                    <td>{formatCurrency(row.avg_sale_price || 0)}</td>
                    <td>{row.comp_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
