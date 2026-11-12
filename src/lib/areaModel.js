import { regions as builtinRegions } from '../data/regions'
import { categories as builtinCategories, findCategory } from '../data/materials'

export function normalizeHex(value) {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/)
  if (!match) return null
  return `#${match[1].toUpperCase()}`
}

export function normalizePoints(points) {
  if (!Array.isArray(points) || points.length < 3) return null
  const normalized = []
  for (const point of points) {
    const x = Number(point?.x)
    const y = Number(point?.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null
    normalized.push({ x, y })
  }
  return normalized
}

export function createOptionDraft(index) {
  return {
    id: crypto.randomUUID(),
    name: `Option ${index}`,
    hex: '#c4a574',
  }
}

export function createVariantDraft(index) {
  return {
    id: crypto.randomUUID(),
    name: index === 1 ? 'Standard' : `Variant ${index}`,
    options: [createOptionDraft(1)],
  }
}

export function createAreaDraft(points, index) {
  return {
    id: crypto.randomUUID(),
    name: `Area ${index}`,
    points: points.map((point) => ({ x: point.x, y: point.y })),
    persisted: false,
    dirty: true,
    variants: [createVariantDraft(1)],
  }
}

export function areaToDraft(area) {
  const variants = []
  const sorted = [...area.options].sort((a, b) => a.sortOrder - b.sortOrder)
  for (const option of sorted) {
    let variant = variants.find((item) => item.name === option.variantName)
    if (!variant) {
      variant = { id: crypto.randomUUID(), name: option.variantName, options: [] }
      variants.push(variant)
    }
    variant.options.push({ id: option.id, name: option.name, hex: option.hex })
  }
  if (variants.length === 0) variants.push(createVariantDraft(1))
  return {
    id: area.id,
    name: area.label,
    points: area.points.map((point) => ({ x: point.x, y: point.y })),
    persisted: true,
    dirty: false,
    variants,
  }
}

export function toAreaPayload(area) {
  const label = area.name.trim()
  if (!label) return { error: 'Name the area before saving.' }
  const points = normalizePoints(area.points)
  if (!points) return { error: 'The outline needs at least 3 points.' }

  const options = []
  const seenVariants = new Set()
  for (const variant of area.variants) {
    const variantName = variant.name.trim()
    if (!variantName) return { error: 'Every variant needs a name.' }
    const key = variantName.toLowerCase()
    if (seenVariants.has(key)) {
      return { error: `Variant "${variantName}" is listed twice. Keep one group per name.` }
    }
    seenVariants.add(key)
    if (variant.options.length === 0) {
      return { error: `Add an option under "${variantName}".` }
    }
    for (const option of variant.options) {
      const name = option.name.trim()
      if (!name) return { error: `Every option under "${variantName}" needs a name.` }
      const hex = normalizeHex(option.hex)
      if (!hex) return { error: `"${name}" needs a color.` }
      options.push({
        id: option.id,
        variantName,
        name,
        hex,
        sortOrder: options.length,
      })
    }
  }
  if (options.length === 0) return { error: 'Add at least one option.' }

  return {
    value: {
      id: area.id,
      label,
      points: points.map((point) => ({ x: Math.round(point.x), y: Math.round(point.y) })),
      options,
    },
  }
}

export function regionsWithCustom(customAreas) {
  return [
    ...builtinRegions,
    ...customAreas.map((area) => ({
      id: area.id,
      label: area.label,
      categoryId: `custom:${area.id}`,
      points: area.points,
      custom: true,
    })),
  ]
}

export function categoryForRegion(region, customAreas) {
  if (!region) return null
  if (region.custom) {
    const area = customAreas.find((item) => item.id === region.id)
    if (!area) return null
    return {
      id: region.categoryId,
      label: 'Finish',
      options: area.options.map((option) => ({
        id: option.id,
        brand: option.variantName,
        name: option.name,
        hex: option.hex,
      })),
    }
  }
  return findCategory(region.categoryId) || null
}

export function buildMaterialMap(customAreas) {
  const map = new Map()
  for (const category of builtinCategories) {
    for (const option of category.options) map.set(option.id, option)
  }
  for (const area of customAreas) {
    for (const option of area.options) {
      map.set(option.id, {
        id: option.id,
        brand: option.variantName,
        name: option.name,
        hex: option.hex,
      })
    }
  }
  return map
}
