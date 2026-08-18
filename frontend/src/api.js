const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    let detail = `Request failed (${response.status})`
    try {
      const body = await response.json()
      if (typeof body.detail === 'string') detail = body.detail
      else if (Array.isArray(body.detail)) detail = body.detail.map((d) => d.msg || JSON.stringify(d)).join('; ')
    } catch {
      // ignore parse errors
    }
    throw new Error(detail)
  }

  if (response.status === 204) return null
  return response.json()
}

function toQuery(params) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export function fetchComps(params) {
  return request(`/comps${toQuery(params)}`)
}

export function fetchFilterMeta() {
  return request('/comps/meta/filters')
}

export function fetchComp(compId) {
  return request(`/comps/${compId}`)
}

export function createNote(compId, noteText) {
  return request(`/comps/${compId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ note_text: noteText }),
  })
}

export function deleteNote(compId, noteId) {
  return request(`/comps/${compId}/notes/${noteId}`, { method: 'DELETE' })
}

export function createTag(compId, tag) {
  return request(`/comps/${compId}/tags`, {
    method: 'POST',
    body: JSON.stringify({ tag }),
  })
}

export function deleteTag(compId, tagId) {
  return request(`/comps/${compId}/tags/${tagId}`, { method: 'DELETE' })
}

export function fetchAnalytics() {
  return request('/analytics')
}

export function fetchCompare(ids) {
  const idList = Array.isArray(ids) ? ids.join(',') : String(ids)
  return request(`/comps/compare${toQuery({ ids: idList })}`)
}

export function fetchSavedSearches() {
  return request('/saved-searches')
}

export function createSavedSearch(name, filters) {
  return request('/saved-searches', {
    method: 'POST',
    body: JSON.stringify({ name, filters }),
  })
}

export function deleteSavedSearch(searchId) {
  return request(`/saved-searches/${searchId}`, { method: 'DELETE' })
}

export function exportCompsCsv(params) {
  // Drop pagination params — export uses the same filters/sort as the list.
  const { page, page_size, ...filterParams } = params
  const url = `${API_BASE}/comps/export${toQuery(filterParams)}`
  return fetch(url).then(async (response) => {
    if (!response.ok) {
      let detail = `Export failed (${response.status})`
      try {
        const body = await response.json()
        if (typeof body.detail === 'string') detail = body.detail
      } catch {
        // ignore
      }
      throw new Error(detail)
    }
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = 'filtered_comps.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(objectUrl)
  })
}
