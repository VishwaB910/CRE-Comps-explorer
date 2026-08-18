import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createSavedSearch,
  deleteSavedSearch,
  exportCompsCsv,
  fetchComps,
  fetchFilterMeta,
  fetchSavedSearches,
} from '../api'
import EmptyState from '../components/EmptyState'
import { TableSkeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { formatCurrency, formatDate, formatNumber } from '../utils/format'

const DEFAULT_FILTERS = {
  q: '',
  property_type: '',
  market: '',
  tag: '',
  min_price: '',
  max_price: '',
  min_cap_rate: '',
  max_cap_rate: '',
  sale_date_from: '',
  sale_date_to: '',
  sort_by: 'sale_date',
  sort_order: 'desc',
  page: 1,
  page_size: 10,
}

const FILTER_KEYS = [
  'q',
  'property_type',
  'market',
  'tag',
  'min_price',
  'max_price',
  'min_cap_rate',
  'max_cap_rate',
  'sale_date_from',
  'sale_date_to',
  'sort_by',
  'sort_order',
]

const CHIP_LABELS = {
  q: 'Search',
  property_type: 'Type',
  market: 'Market',
  tag: 'Tag',
  min_price: 'Min price',
  max_price: 'Max price',
  min_cap_rate: 'Min cap',
  max_cap_rate: 'Max cap',
  sale_date_from: 'From',
  sale_date_to: 'To',
}

function filtersForSave(filters) {
  const payload = {}
  FILTER_KEYS.forEach((key) => {
    if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
      payload[key] = filters[key]
    }
  })
  return payload
}

function moneyLabel(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  return `$${n.toLocaleString()}`
}

/** Build a readable label from whatever filters are active — no manual naming. */
function suggestSavedSearchName(filters) {
  const parts = []
  if (filters.q) parts.push(`“${filters.q}”`)
  if (filters.market) parts.push(filters.market)
  if (filters.property_type) parts.push(filters.property_type)
  if (filters.tag) parts.push(`#${filters.tag}`)
  if (filters.min_price || filters.max_price) {
    if (filters.min_price && filters.max_price) {
      parts.push(`${moneyLabel(filters.min_price)}–${moneyLabel(filters.max_price)}`)
    } else if (filters.min_price) {
      parts.push(`≥ ${moneyLabel(filters.min_price)}`)
    } else {
      parts.push(`≤ ${moneyLabel(filters.max_price)}`)
    }
  }
  if (filters.min_cap_rate || filters.max_cap_rate) {
    if (filters.min_cap_rate && filters.max_cap_rate) {
      parts.push(`${filters.min_cap_rate}–${filters.max_cap_rate}% cap`)
    } else if (filters.min_cap_rate) {
      parts.push(`≥ ${filters.min_cap_rate}% cap`)
    } else {
      parts.push(`≤ ${filters.max_cap_rate}% cap`)
    }
  }
  if (filters.sale_date_from || filters.sale_date_to) {
    parts.push(`${filters.sale_date_from || '…'} → ${filters.sale_date_to || '…'}`)
  }
  const name = parts.join(' · ')
  return name.length > 120 ? `${name.slice(0, 117)}…` : name || 'All comps'
}

function applySavedFilters(saved) {
  return {
    ...DEFAULT_FILTERS,
    ...Object.fromEntries(
      FILTER_KEYS.filter((key) => saved?.[key] !== undefined && saved?.[key] !== null).map((key) => [
        key,
        String(saved[key]),
      ]),
    ),
    page: 1,
    page_size: DEFAULT_FILTERS.page_size,
  }
}

function buildActiveChips(filters) {
  return Object.keys(CHIP_LABELS)
    .filter((key) => filters[key] !== undefined && filters[key] !== null && filters[key] !== '')
    .map((key) => {
      let value = filters[key]
      if (key === 'min_price' || key === 'max_price') value = moneyLabel(value)
      if (key === 'min_cap_rate' || key === 'max_cap_rate') value = `${value}%`
      if (key === 'tag') value = `#${value}`
      return { key, label: CHIP_LABELS[key], value }
    })
}

function SortHeader({ field, label, activeField, order, onSort }) {
  const active = activeField === field
  return (
    <th>
      <button type="button" className={`th-btn ${active ? 'active' : ''}`} onClick={() => onSort(field)}>
        {label}
        {active ? (order === 'asc' ? ' ↑' : ' ↓') : ''}
      </button>
    </th>
  )
}

function isTypingTarget(el) {
  if (!el || !(el instanceof HTMLElement)) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export default function CompsListPage() {
  const navigate = useNavigate()
  const { pushToast } = useToast()
  const searchInputRef = useRef(null)
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [meta, setMeta] = useState({ markets: [], property_types: [], tags: [] })
  const [data, setData] = useState({ items: [], total: 0, total_pages: 0, page: 1 })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [savedSearches, setSavedSearches] = useState([])
  const [selectedSavedId, setSelectedSavedId] = useState('')
  const [savingSearch, setSavingSearch] = useState(false)

  function loadSavedSearches() {
    fetchSavedSearches()
      .then(setSavedSearches)
      .catch(() => {
        /* panel stays empty if endpoint unavailable */
      })
  }

  function loadFilterMeta() {
    fetchFilterMeta()
      .then(setMeta)
      .catch((err) => setError(err.message))
  }

  function clearAllFilters() {
    setSelectedSavedId('')
    setSelected(new Set())
    setFilters(DEFAULT_FILTERS)
  }

  useEffect(() => {
    loadFilterMeta()
    loadSavedSearches()
  }, [])

  useEffect(() => {
    function refreshMeta() {
      if (document.visibilityState === 'visible') {
        loadFilterMeta()
        loadSavedSearches()
      }
    }
    function onFocus() {
      loadFilterMeta()
    }
    document.addEventListener('visibilitychange', refreshMeta)
    window.addEventListener('focus', onFocus)
    return () => {
      document.removeEventListener('visibilitychange', refreshMeta)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchComps(filters)
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setFocusedIndex(-1)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filters])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === '/' && !isTypingTarget(e.target)) {
        e.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
        return
      }

      if (isTypingTarget(e.target)) return
      if (!data.items.length) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev < data.items.length - 1 ? prev + 1 : prev < 0 ? 0 : prev))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev))
      } else if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < data.items.length) {
        e.preventDefault()
        navigate(`/comps/${data.items[focusedIndex].comp_id}`)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [data.items, focusedIndex, navigate])

  function updateFilter(key, value) {
    setSelectedSavedId('')
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1,
    }))
  }

  function toggleSort(field) {
    setSelectedSavedId('')
    setFilters((prev) => {
      if (prev.sort_by === field) {
        return {
          ...prev,
          sort_order: prev.sort_order === 'asc' ? 'desc' : 'asc',
          page: 1,
        }
      }
      return { ...prev, sort_by: field, sort_order: 'asc', page: 1 }
    })
  }

  function toggleSelect(compId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(compId)) {
        next.delete(compId)
      } else if (next.size < 4) {
        next.add(compId)
      }
      return next
    })
  }

  async function handleExport() {
    setExporting(true)
    setError('')
    try {
      await exportCompsCsv(filters)
      pushToast('CSV exported')
    } catch (err) {
      setError(err.message)
    } finally {
      setExporting(false)
    }
  }

  async function handleSaveSearch() {
    setSavingSearch(true)
    setError('')
    try {
      const created = await createSavedSearch(suggestSavedSearchName(filters), filtersForSave(filters))
      setSelectedSavedId(String(created.id))
      loadSavedSearches()
      pushToast('Search saved')
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingSearch(false)
    }
  }

  function handleLoadSaved(id) {
    setSelectedSavedId(id)
    if (!id) return
    const item = savedSearches.find((s) => String(s.id) === id)
    if (item) {
      setFilters(applySavedFilters(item.filters))
      pushToast(`Applied “${item.name}”`)
    }
  }

  async function handleDeleteSelectedSaved() {
    if (!selectedSavedId) return
    setError('')
    try {
      await deleteSavedSearch(selectedSavedId)
      setSelectedSavedId('')
      loadSavedSearches()
      pushToast('Saved search deleted')
    } catch (err) {
      setError(err.message)
    }
  }

  const sortProps = {
    activeField: filters.sort_by,
    order: filters.sort_order,
    onSort: toggleSort,
  }

  const selectedIds = Array.from(selected)
  const canCompare = selectedIds.length >= 2 && selectedIds.length <= 4
  const activeChips = buildActiveChips(filters)

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <h1>Comparable sales</h1>
          <p className="muted">Search, filter, and click any column header to sort. Press / to focus search.</p>
        </div>
        <div className="section-actions">
          <p className="result-count">{data.total} matching comps</p>
          <button type="button" onClick={handleExport} disabled={exporting || data.total === 0}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault()
        }}
      >
        <label>
          Search
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Address or city"
            value={filters.q}
            onChange={(e) => updateFilter('q', e.target.value)}
          />
        </label>
        <label>
          Property type
          <select
            value={filters.property_type}
            onChange={(e) => updateFilter('property_type', e.target.value)}
          >
            <option value="">All</option>
            {meta.property_types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Market
          <select value={filters.market} onChange={(e) => updateFilter('market', e.target.value)}>
            <option value="">All</option>
            {meta.markets.map((market) => (
              <option key={market} value={market}>
                {market}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tag
          <select value={filters.tag} onChange={(e) => updateFilter('tag', e.target.value)}>
            <option value="">All</option>
            {(meta.tags || []).map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
        <label>
          Min price
          <input
            type="number"
            min="0"
            value={filters.min_price}
            onChange={(e) => updateFilter('min_price', e.target.value)}
          />
        </label>
        <label>
          Max price
          <input
            type="number"
            min="0"
            value={filters.max_price}
            onChange={(e) => updateFilter('max_price', e.target.value)}
          />
        </label>
        <label>
          Min cap rate
          <input
            type="number"
            min="0"
            step="0.1"
            value={filters.min_cap_rate}
            onChange={(e) => updateFilter('min_cap_rate', e.target.value)}
          />
        </label>
        <label>
          Max cap rate
          <input
            type="number"
            min="0"
            step="0.1"
            value={filters.max_cap_rate}
            onChange={(e) => updateFilter('max_cap_rate', e.target.value)}
          />
        </label>
        <label>
          Sale date from
          <input
            type="date"
            value={filters.sale_date_from}
            onChange={(e) => updateFilter('sale_date_from', e.target.value)}
          />
        </label>
        <label>
          Sale date to
          <input
            type="date"
            value={filters.sale_date_to}
            onChange={(e) => updateFilter('sale_date_to', e.target.value)}
          />
        </label>
        <label className="saved-search-field">
          Saved search
          <select
            value={selectedSavedId}
            onChange={(e) => handleLoadSaved(e.target.value)}
            aria-label="Load a saved search"
          >
            <option value="">{savedSearches.length ? 'Choose…' : 'None saved yet'}</option>
            {savedSearches.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="filter-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => {
              clearAllFilters()
            }}
          >
            Reset
          </button>
          <button type="button" onClick={handleSaveSearch} disabled={savingSearch}>
            {savingSearch ? 'Saving…' : 'Save search'}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={handleDeleteSelectedSaved}
            disabled={!selectedSavedId}
            title={selectedSavedId ? 'Delete the selected saved search' : 'Select a saved search to delete'}
          >
            Delete saved
          </button>
        </div>
      </form>

      {activeChips.length > 0 && (
        <div className="active-filters" aria-label="Active filters">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="filter-chip"
              onClick={() => updateFilter(chip.key, '')}
              title={`Clear ${chip.label}`}
            >
              <span>
                {chip.label}: {chip.value}
              </span>
              <span aria-hidden="true">×</span>
            </button>
          ))}
          <button
            type="button"
            className="ghost filter-chip-clear"
            onClick={() => {
              clearAllFilters()
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {error && <div className="banner error">{error}</div>}

      {loading ? (
        <TableSkeleton rows={8} cols={13} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No comps found"
          message="No comps match these filters. Try clearing filters or adjusting your search."
          action={
            <button type="button" className="ghost" onClick={clearAllFilters}>
              Clear filters
            </button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th className="col-check" aria-label="Select" />
                <SortHeader field="address" label="Address" {...sortProps} />
                <SortHeader field="city" label="City" {...sortProps} />
                <SortHeader field="state" label="State" {...sortProps} />
                <SortHeader field="market" label="Market" {...sortProps} />
                <SortHeader field="property_type" label="Type" {...sortProps} />
                <SortHeader field="square_footage" label="SF" {...sortProps} />
                <SortHeader field="sale_price" label="Sale price" {...sortProps} />
                <SortHeader field="price_per_sf" label="Price / SF" {...sortProps} />
                <SortHeader field="cap_rate" label="Cap rate" {...sortProps} />
                <SortHeader field="sale_date" label="Sale date" {...sortProps} />
                <SortHeader field="buyer" label="Buyer" {...sortProps} />
                <SortHeader field="seller" label="Seller" {...sortProps} />
              </tr>
            </thead>
            <tbody>
              {data.items.map((comp, index) => (
                <tr
                  key={comp.comp_id}
                  className={focusedIndex === index ? 'focused' : ''}
                  onClick={() => setFocusedIndex(index)}
                >
                  <td className="col-check">
                    <input
                      type="checkbox"
                      checked={selected.has(comp.comp_id)}
                      disabled={!selected.has(comp.comp_id) && selected.size >= 4}
                      onChange={() => toggleSelect(comp.comp_id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${comp.address}`}
                    />
                  </td>
                  <td>
                    <Link to={`/comps/${comp.comp_id}`}>{comp.address}</Link>
                  </td>
                  <td>{comp.city}</td>
                  <td>{comp.state}</td>
                  <td>{comp.market}</td>
                  <td>{comp.property_type}</td>
                  <td>{formatNumber(comp.square_footage)}</td>
                  <td>{formatCurrency(comp.sale_price)}</td>
                  <td>${formatNumber(comp.price_per_sf, 2)}</td>
                  <td>{formatNumber(comp.cap_rate, 2)}%</td>
                  <td>{formatDate(comp.sale_date)}</td>
                  <td>{comp.buyer}</td>
                  <td>{comp.seller}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="pagination">
        <button
          type="button"
          disabled={filters.page <= 1}
          onClick={() => updateFilter('page', filters.page - 1)}
        >
          Previous
        </button>
        <span>
          Page {data.page || filters.page} of {data.total_pages || 1}
        </span>
        <button
          type="button"
          disabled={!data.total_pages || filters.page >= data.total_pages}
          onClick={() => updateFilter('page', filters.page + 1)}
        >
          Next
        </button>
      </div>

      {selectedIds.length > 0 && (
        <div className="compare-bar">
          <p>
            {selectedIds.length} selected
            {selectedIds.length < 2 ? ' · pick at least 2' : selectedIds.length > 4 ? ' · max 4' : ''}
          </p>
          <div className="compare-bar-actions">
            <button type="button" className="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </button>
            {canCompare ? (
              <Link className="compare-link" to={`/compare?ids=${selectedIds.join(',')}`}>
                Compare selected
              </Link>
            ) : (
              <button type="button" disabled>
                Compare selected
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
