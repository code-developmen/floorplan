import { normalizeHex, normalizePoints } from './areaModel'
import { supabase } from './supabaseClient'

function explain(error, fallback) {
  const message = error?.message || fallback
  if (/relation .* does not exist|schema cache|Could not find the table/i.test(message)) {
    return 'Supabase is connected, but the areas tables are missing. Run supabase/schema.sql in the SQL editor, then reload.'
  }
  if (/row-level security|permission denied|42501/i.test(message)) {
    return 'Supabase refused the request. Use the anon key and apply the policies in supabase/schema.sql.'
  }
  return message
}

function fail(error, fallback) {
  if (error) throw new Error(explain(error, fallback))
}

function mapArea(row) {
  const points = normalizePoints(row.points)
  if (!points || !row.id) return null
  const options = (row.area_options || [])
    .map((option) => {
      const hex = normalizeHex(option.hex)
      const variantName = String(option.variant_name || '').trim()
      const name = String(option.name || '').trim()
      if (!hex || !variantName || !name || !option.id) return null
      return {
        id: option.id,
        variantName,
        name,
        hex,
        sortOrder: Number(option.sort_order) || 0,
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const label = String(row.label || '').trim() || 'Untitled area'
  return { id: row.id, label, points, options }
}

export async function fetchAreas() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('areas')
    .select('id, label, points, created_at, area_options(id, variant_name, name, hex, sort_order)')
    .order('created_at', { ascending: true })
  fail(error, 'Could not load areas.')
  return (data || []).map(mapArea).filter(Boolean)
}

export async function saveArea(area) {
  if (!supabase) throw new Error('Add the Supabase URL and anon key before saving areas.')
  const { error: areaError } = await supabase.from('areas').upsert(
    { id: area.id, label: area.label, points: area.points },
    { onConflict: 'id' },
  )
  fail(areaError, 'Could not save the area.')

  const { data: existing, error: existingError } = await supabase
    .from('area_options')
    .select('id')
    .eq('area_id', area.id)
  fail(existingError, 'Could not read existing options.')

  const keep = new Set(area.options.map((option) => option.id))
  const stale = (existing || []).map((row) => row.id).filter((id) => !keep.has(id))
  if (stale.length > 0) {
    const { error } = await supabase.from('area_options').delete().in('id', stale)
    fail(error, 'Could not remove old options.')
  }

  if (area.options.length > 0) {
    const { error } = await supabase.from('area_options').upsert(
      area.options.map((option) => ({
        id: option.id,
        area_id: area.id,
        variant_name: option.variantName,
        name: option.name,
        hex: option.hex,
        sort_order: option.sortOrder,
      })),
      { onConflict: 'id' },
    )
    fail(error, 'Could not save options.')
  }

  return area
}

export async function deleteArea(id) {
  if (!supabase) throw new Error('Add the Supabase URL and anon key before deleting areas.')
  const { error: optionError } = await supabase.from('area_options').delete().eq('area_id', id)
  fail(optionError, 'Could not delete options.')
  const { error } = await supabase.from('areas').delete().eq('id', id)
  fail(error, 'Could not delete the area.')
}
