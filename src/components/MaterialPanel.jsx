import { findCategory, findMaterial } from '../data/materials'

export default function MaterialPanel({ region, selectionId, onApply }) {
  if (!region) {
    return (
      <aside className="sidebar">
        <div className="sidebar-block">
          <h2>Finishes</h2>
          <p>Hover a surface to see its outline, then click it to pick a color.</p>
        </div>
      </aside>
    )
  }

  const category = findCategory(region.categoryId)
  const applied = selectionId ? findMaterial(selectionId) : null
  const groups = category ? groupByBrand(category.options) : []

  return (
    <aside className="sidebar">
      <div className="sidebar-block">
        <p className="eyebrow">{category ? category.label : region.categoryId}</p>
        <h2>{region.label}</h2>
        <p className="applied">
          {applied ? `Applied: ${applied.brand} ${applied.name}` : 'No finish applied yet.'}
        </p>
      </div>
      {groups.map((group) => (
        <section key={group.brand} className="brand-group">
          <h3>{group.brand}</h3>
          <div className="swatch-grid">
            {group.options.map((option) => {
              const selected = option.id === selectionId
              return (
                <button
                  key={option.id}
                  type="button"
                  className={selected ? 'swatch selected' : 'swatch'}
                  aria-pressed={selected}
                  onClick={() => onApply(region.id, option.id)}
                >
                  <span className="swatch-chip" style={{ backgroundColor: option.hex }} />
                  <span className="swatch-name">{option.name}</span>
                  <span className="swatch-brand">{option.brand}</span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </aside>
  )
}

function groupByBrand(options) {
  const groups = []
  for (const option of options) {
    let group = groups.find((item) => item.brand === option.brand)
    if (!group) {
      group = { brand: option.brand, options: [] }
      groups.push(group)
    }
    group.options.push(option)
  }
  return groups
}
