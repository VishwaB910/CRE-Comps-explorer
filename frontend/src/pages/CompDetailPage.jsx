import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createNote, createTag, deleteNote, deleteTag, fetchComp } from '../api'
import EmptyState from '../components/EmptyState'
import { DetailSkeleton } from '../components/Skeleton'
import { useToast } from '../components/Toast'
import { formatCurrency, formatDate, formatNumber } from '../utils/format'

const SUGGESTED_TAGS = ['follow up', 'strong comp', 'outlier']

function DeltaBadge({ value }) {
  const num = Number(value)
  const positive = num >= 0
  const sign = positive ? '+' : ''
  return (
    <span className={`insight-delta ${positive ? 'up' : 'down'}`}>
      {sign}
      {formatNumber(num, 1)}%
    </span>
  )
}

export default function CompDetailPage() {
  const { compId } = useParams()
  const { pushToast } = useToast()
  const [comp, setComp] = useState(null)
  const [noteText, setNoteText] = useState('')
  const [tagText, setTagText] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await fetchComp(compId)
      setComp(data)
    } catch (err) {
      setError(err.message)
      setComp(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [compId])

  async function handleAddNote(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createNote(compId, noteText)
      setNoteText('')
      await load()
      pushToast('Note added')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddTag(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createTag(compId, tagText)
      setTagText('')
      await load()
      pushToast('Tag added')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSuggestedTag(tag) {
    setSaving(true)
    setError('')
    try {
      await createTag(compId, tag)
      await load()
      pushToast(`Tag “${tag}” added`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteNote(noteId) {
    try {
      await deleteNote(compId, noteId)
      await load()
      pushToast('Note deleted')
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleDeleteTag(tagId, tagLabel) {
    try {
      await deleteTag(compId, tagId)
      await load()
      pushToast(`Tag “${tagLabel}” removed`)
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <section className="stack">
        <Link to="/" className="back-link">
          ← Back to comps
        </Link>
        <DetailSkeleton />
      </section>
    )
  }

  if (!comp) {
    return (
      <section className="stack">
        <Link to="/" className="back-link">
          ← Back to comps
        </Link>
        <EmptyState
          title="Comp not found"
          message={error || 'This comparable sale could not be loaded.'}
          action={
            <Link to="/" className="back-link">
              Return to comps list
            </Link>
          }
        />
      </section>
    )
  }

  const insights = comp.insights

  return (
    <section className="stack">
      <div className="section-head">
        <div>
          <Link to="/" className="back-link">
            ← Back to comps
          </Link>
          <h1>{comp.address}</h1>
          <p className="muted">
            {comp.city}, {comp.state} {comp.zip} · {comp.market} · {comp.property_type}
          </p>
        </div>
      </div>

      {error && <div className="banner error">{error}</div>}

      {insights && (
        <div className="insight-strip">
          <div className="insight-item">
            <span className="insight-label">vs market avg $/SF</span>
            <span className="insight-value">
              ${formatNumber(insights.market_avg_price_per_sf, 2)}
            </span>
            <DeltaBadge value={insights.price_per_sf_vs_market_pct} />
          </div>
          <div className="insight-item">
            <span className="insight-label">vs type avg cap</span>
            <span className="insight-value">{formatNumber(insights.type_avg_cap_rate, 2)}%</span>
            <DeltaBadge value={insights.cap_rate_vs_type_pct} />
          </div>
        </div>
      )}

      <div className="detail-grid">
        <div className="detail-panel">
          <h2>Sale details</h2>
          <dl className="kv">
            <div>
              <dt>Sale price</dt>
              <dd>{formatCurrency(comp.sale_price)}</dd>
            </div>
            <div>
              <dt>Price / SF</dt>
              <dd>${formatNumber(comp.price_per_sf, 2)}</dd>
            </div>
            <div>
              <dt>Cap rate</dt>
              <dd>{formatNumber(comp.cap_rate, 2)}%</dd>
            </div>
            <div>
              <dt>Sale date</dt>
              <dd>{formatDate(comp.sale_date)}</dd>
            </div>
            <div>
              <dt>Square footage</dt>
              <dd>{formatNumber(comp.square_footage)}</dd>
            </div>
            <div>
              <dt>Year built</dt>
              <dd>{comp.year_built || '—'}</dd>
            </div>
            <div>
              <dt>Buyer</dt>
              <dd>{comp.buyer}</dd>
            </div>
            <div>
              <dt>Seller</dt>
              <dd>{comp.seller}</dd>
            </div>
          </dl>
        </div>

        <div className="detail-panel">
          <h2>Notes</h2>
          <form className="inline-form" onSubmit={handleAddNote}>
            <textarea
              rows={3}
              placeholder="Add a free-text note"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              required
            />
            <button type="submit" disabled={saving || !noteText.trim()}>
              Add note
            </button>
          </form>
          <ul className="note-list">
            {comp.notes.length === 0 && <li className="muted">No notes yet.</li>}
            {comp.notes.map((note) => (
              <li key={note.id}>
                <div>
                  <p>{note.note_text}</p>
                  <span className="muted small">{new Date(note.created_at).toLocaleString()}</span>
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => handleDeleteNote(note.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="detail-panel">
          <h2>Tags</h2>
          <div className="tag-row">
            {comp.tags.map((tag) => (
              <span key={tag.id} className="tag">
                {tag.tag}
                <button
                  type="button"
                  aria-label={`Remove ${tag.tag}`}
                  onClick={() => handleDeleteTag(tag.id, tag.tag)}
                >
                  ×
                </button>
              </span>
            ))}
            {comp.tags.length === 0 && <span className="muted">No tags yet.</span>}
          </div>
          <div className="suggested-tags">
            {SUGGESTED_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className="ghost"
                disabled={saving || comp.tags.some((t) => t.tag === tag)}
                onClick={() => handleSuggestedTag(tag)}
              >
                + {tag}
              </button>
            ))}
          </div>
          <form className="inline-form row" onSubmit={handleAddTag}>
            <input
              type="text"
              placeholder="Custom tag"
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              required
            />
            <button type="submit" disabled={saving || !tagText.trim()}>
              Add tag
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}
