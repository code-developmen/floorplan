export default function MaterialPanel({ region, category, applied, onApply }) {
  if (!region) {
    return (
      <aside className="sidebar">
        <div className="sidebar-block">
          <h2>Finishes</h2>
          <p>Tap or click a surface, then pick a finish.</p>
        </div>
      </aside>
    )
  }

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
      {groups.length === 0 ? (
        <div className="sidebar-block">
          <p>No options yet. Open Mask Editor, add a variant and an option, then save.</p>
        </div>
      ) : null}
      {groups.map((group) => (
        <section key={group.brand} className="brand-group">
          <h3>{group.brand}</h3>
          <div className="swatch-grid">
            {group.options.map((option) => {
              const selected = option.id === applied?.id
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
