import { useEffect, useRef, useState } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'

const STORAGE_KEY = 'yatra-ledger-data'
const COMMON_CATEGORIES = ['Yatra & Sanidhanam Expense', 'Irumudi Pooja Expense', 'Train Tickets']
const INDIVIDUAL_CATEGORIES = ['Mudra Expense', 'Individual Expense']
const NAV_ITEMS = [
  { to: '/', label: 'Expenses', short: 'Expenses', icon: 'receipt' },
  { to: '/participants', label: 'Participants', short: 'People', icon: 'users' },
  { to: '/packages', label: 'Packages', short: 'Packages', icon: 'briefcase' },
  { to: '/mapping', label: 'Map participants', short: 'Mapping', icon: 'link' },
  { to: '/reconciliation', label: 'Reconciliation', short: 'Summary', icon: 'chart' },
]

const EMPTY_DATA = {
  packages: [],
  participants: [],
  package_participants: [],
  expenses: [],
  expense_participants: [],
}

function Icon({ name, size = 18 }) {
  const paths = {
    receipt: <><path d="M5 3h14v18l-3-2-4 2-4-2-3 2z" /><path d="M8 8h8M8 12h8M8 16h4" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10" /></>,
    edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.12 2.12 0 0 0-3-3L5 16z" /></>,
    trash: <><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18" /></>,
    chevron: <path d="m7 10 5 5 5-5" />,
  }
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

function currency(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0)
}

function formatDate(value) {
  if (!value) return 'Date not set'
  const [year, month, day] = value.slice(0, 10).split('-')
  const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(month) - 1]
  return monthName ? `${Number(day)} ${monthName} ${year}` : value
}

function currentTimestamp() {
  return new Date().toISOString()
}

function distribute(amount, participantIds) {
  const cents = Math.round(Number(amount) * 100)
  if (!participantIds.length) return []
  const base = Math.floor(cents / participantIds.length)
  const remainder = cents - base * participantIds.length
  return participantIds.map((participant_id, index) => ({
    participant_id,
    share_amount: (base + (index < remainder ? 1 : 0)) / 100,
  }))
}

function nextId(items) {
  return items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1
}

function App() {
  const [data, setData] = useState(EMPTY_DATA)
  const [loadState, setLoadState] = useState('loading')
  const [loadError, setLoadError] = useState('')
  const fetched = useRef(false)
  const location = useLocation()

  const loadData = async () => {
    setLoadState('loading')
    setLoadError('')
    try {
      const response = await fetch('/api/data.json')
      if (!response.ok) throw new Error(`Could not load sample data (${response.status}).`)
      const sample = await response.json()
      const stored = localStorage.getItem(STORAGE_KEY)
      setData(stored ? { ...EMPTY_DATA, ...JSON.parse(stored) } : { ...EMPTY_DATA, ...sample })
      setLoadState('ready')
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load application data.')
      setLoadState('error')
    }
  }

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    loadData()
  }, [])

  useEffect(() => {
    if (loadState === 'ready') localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data, loadState])

  const updateData = (updater) => setData((current) => updater(current))
  const title = NAV_ITEMS.find((item) => item.to === location.pathname)?.label || 'Expenses'
  const resetData = () => {
    if (!window.confirm('Restore the original sample data? This will replace your saved browser data.')) return
    localStorage.removeItem(STORAGE_KEY)
    loadData()
  }

  if (loadState === 'loading') {
    return <div className="loading-screen"><div className="brand-mark">Y</div><span>Getting your yatra ledger ready...</span></div>
  }

  if (loadState === 'error') {
    return (
      <div className="loading-screen error-screen">
        <div className="brand-mark">Y</div>
        <h1>Couldn’t load your sample data</h1>
        <p>{loadError}</p>
        <button className="button button-primary" onClick={loadData}>Try again</button>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Yatra Ledger home">
          <span className="brand-mark">Y</span>
          <span className="brand-copy"><strong>yatra<span>ledger</span></strong><small>Group expense manager</small></span>
        </a>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Icon name={item.icon} /><span>{item.label}</span>{item.to === '/' && <span className="nav-count">{data.expenses.length}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-note"><span className="status-dot" /><span><strong>Local workspace</strong><small>Changes saved in this browser</small></span></div>
          <button className="reset-button" onClick={resetData}>Restore sample data</button>
          <p className="sidebar-footer">Yatra Ledger <span>·</span> v1.0</p>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">Y</span><strong>yatra<span>ledger</span></strong></div>
          <div className="breadcrumbs"><span>Workspace</span><b>/</b><strong>{title}</strong></div>
          <div className="topbar-right"><span className="saved-label"><span className="status-dot" /> Saved locally</span><div className="avatar">YL</div></div>
        </header>
        <main className="page-content">
          <Routes>
            <Route path="/" element={<ExpensesPage data={data} updateData={updateData} />} />
            <Route path="/participants" element={<ParticipantsPage data={data} updateData={updateData} />} />
            <Route path="/packages" element={<PackagesPage data={data} updateData={updateData} />} />
            <Route path="/mapping" element={<MappingPage data={data} updateData={updateData} />} />
            <Route path="/reconciliation" element={<ReconciliationPage data={data} />} />
            <Route path="*" element={<ExpensesPage data={data} updateData={updateData} />} />
          </Routes>
        </main>
      </div>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}>
            <Icon name={item.icon} size={19} /><span>{item.short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
      {action}
    </div>
  )
}

function StatCard({ label, value, note, icon, tint = 'violet' }) {
  return <div className="stat-card"><div className={`stat-icon ${tint}`}><Icon name={icon} size={19} /></div><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>
}

function Field({ label, children, className = '' }) {
  return <label className={`field ${className}`}><span className="field-label">{label}</span>{children}</label>
}

function FormActions({ editing, onCancel }) {
  return <div className="form-actions"><button type="submit" className="button button-primary"><Icon name={editing ? 'check' : 'plus'} size={16} />{editing ? 'Save changes' : 'Add to ledger'}</button>{editing && <button type="button" className="button button-quiet" onClick={onCancel}>Cancel</button>}</div>
}

function EmptyState({ icon, title, text }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={21} /></div><strong>{title}</strong><p>{text}</p></div>
}

function ExpensesPage({ data, updateData }) {
  const [editingId, setEditingId] = useState(null)
  const [packageId, setPackageId] = useState(data.packages[0]?.id || '')
  const [type, setType] = useState('common')
  const [category, setCategory] = useState(COMMON_CATEGORIES[0])
  const [amount, setAmount] = useState('')
  const [selected, setSelected] = useState([])
  const [filter, setFilter] = useState('all')
  const [message, setMessage] = useState('')
  const members = data.package_participants.filter((row) => Number(row.package_id) === Number(packageId)).map((row) => data.participants.find((p) => p.id === row.participant_id)).filter(Boolean)
  const chosenIds = type === 'common' ? members.map((person) => person.id) : selected.filter((id) => members.some((person) => person.id === id))
  const previewShares = distribute(amount, chosenIds)
  const visibleExpenses = data.expenses.filter((expense) => filter === 'all' || Number(expense.package_id) === Number(filter))
  const total = data.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)

  const reset = () => {
    setEditingId(null)
    setAmount('')
    setSelected([])
    setMessage('')
  }
  const changeType = (value) => {
    setType(value)
    setCategory(value === 'common' ? COMMON_CATEGORIES[0] : INDIVIDUAL_CATEGORIES[0])
    setSelected([])
  }
  const togglePerson = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  const saveExpense = (event) => {
    event.preventDefault()
    const amountValue = Number(amount)
    if (!packageId || !Number.isFinite(amountValue) || amountValue <= 0) {
      setMessage('Choose a package and enter an amount greater than zero.')
      return
    }
    if (!chosenIds.length) {
      setMessage(type === 'common' ? 'Add participants to this package before splitting a common expense.' : 'Select at least one participant for this expense.')
      return
    }
    const current = data.expenses.find((expense) => expense.id === editingId)
    const expenseId = editingId || nextId(data.expenses)
    const expense = {
      ...(current || {}),
      id: expenseId,
      package_id: Number(packageId),
      category_type: type,
      category_name: category,
      amount: amountValue,
      created_at: current?.created_at || currentTimestamp(),
    }
    const newShares = distribute(amountValue, chosenIds).map((share, index) => ({
      id: nextId(data.expense_participants) + index,
      expense_id: expenseId,
      ...share,
    }))
    updateData((previous) => ({
      ...previous,
      expenses: editingId ? previous.expenses.map((item) => item.id === editingId ? expense : item) : [...previous.expenses, expense],
      expense_participants: [...previous.expense_participants.filter((share) => share.expense_id !== expenseId), ...newShares],
    }))
    reset()
  }

  const editExpense = (expense) => {
    setEditingId(expense.id)
    setPackageId(expense.package_id)
    setType(expense.category_type)
    setCategory(expense.category_name)
    setAmount(String(expense.amount))
    setSelected(data.expense_participants.filter((share) => share.expense_id === expense.id).map((share) => share.participant_id))
    setMessage('')
  }

  const deleteExpense = (expense) => {
    if (!window.confirm(`Delete “${expense.category_name}” from the ledger?`)) return
    updateData((previous) => ({
      ...previous,
      expenses: previous.expenses.filter((item) => item.id !== expense.id),
      expense_participants: previous.expense_participants.filter((share) => share.expense_id !== expense.id),
    }))
    if (editingId === expense.id) reset()
  }

  return (
    <>
      <PageHeading eyebrow="YOUR TRIP FINANCES" title="Expenses" description="Keep every group cost in one place, with participant shares calculated automatically." action={<span className="period-pill"><span className="period-dot" />Live ledger</span>} />
      <div className="stats-grid">
        <StatCard label="Total expenses" value={currency(total)} note={`${data.expenses.length} recorded transactions`} icon="receipt" tint="violet" />
        <StatCard label="Active packages" value={data.packages.length} note="Trips in your workspace" icon="briefcase" tint="blue" />
        <StatCard label="Participants" value={data.participants.length} note="Across all your packages" icon="users" tint="green" />
        <StatCard label="Average expense" value={currency(data.expenses.length ? total / data.expenses.length : 0)} note="Per recorded transaction" icon="chart" tint="amber" />
      </div>
      <div className="expense-layout">
        <section className="panel expense-form-panel">
          <div className="panel-heading"><div><div className="section-kicker">{editingId ? 'UPDATE TRANSACTION' : 'NEW TRANSACTION'}</div><h2>{editingId ? 'Edit expense' : 'Add an expense'}</h2></div><span className="panel-heading-icon"><Icon name="plus" /></span></div>
          <form onSubmit={saveExpense} className="stack-form">
            <Field label="Package">
              <select value={packageId} onChange={(event) => { setPackageId(event.target.value ? Number(event.target.value) : ''); setSelected([]) }} required>
                <option value="">Select a package</option>{data.packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
            <Field label="Expense type">
              <div className="segmented-control">
                <button type="button" className={type === 'common' ? 'selected' : ''} onClick={() => changeType('common')}>Common</button>
                <button type="button" className={type === 'individual' ? 'selected' : ''} onClick={() => changeType('individual')}>Individual</button>
              </div>
              <span className="field-hint">{type === 'common' ? 'Split equally among everyone in this package.' : 'Split equally among selected participants.'}</span>
            </Field>
            <Field label="Category">
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {(type === 'common' ? COMMON_CATEGORIES : INDIVIDUAL_CATEGORIES).map((item) => <option key={item}>{item}</option>)}
              </select>
            </Field>
            <Field label="Amount" className="amount-field">
              <span className="currency-prefix">₹</span><input type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(event) => setAmount(event.target.value)} required />
            </Field>
            {type === 'individual' && (
              <Field label={`Participants · ${selected.length} selected`}>
                <div className="participant-picker">
                  {members.length ? members.map((person) => (
                    <label key={person.id} className={`person-option${selected.includes(person.id) ? ' checked' : ''}`}>
                      <input type="checkbox" checked={selected.includes(person.id)} onChange={() => togglePerson(person.id)} />
                      <span className="person-avatar">{person.name.charAt(0).toUpperCase()}</span><span className="person-option-name">{person.name}</span>
                      {selected.includes(person.id) && <Icon name="check" size={15} />}
                    </label>
                  )) : <div className="picker-empty">Map participants to this package first.</div>}
                </div>
              </Field>
            )}
            {Number(amount) > 0 && chosenIds.length > 0 && <div className="share-preview"><div className="preview-heading"><span>Estimated split</span><span>{chosenIds.length} {chosenIds.length === 1 ? 'person' : 'people'}</span></div><div className="preview-list">{previewShares.map((share) => {
              const person = data.participants.find((item) => item.id === share.participant_id)
              return <div className="preview-row" key={share.participant_id}><span>{person?.name}</span><strong>{currency(share.share_amount)}</strong></div>
            })}</div></div>}
            {message && <div className="form-message" role="alert">{message}</div>}
            <FormActions editing={Boolean(editingId)} onCancel={reset} />
          </form>
        </section>
        <section className="panel ledger-panel">
          <div className="panel-heading ledger-heading"><div><div className="section-kicker">RECENT ACTIVITY</div><h2>Expense ledger <span className="table-count">{visibleExpenses.length}</span></h2></div><Field label="Filter by package" className="filter-field"><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All packages</option>{data.packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field></div>
          {visibleExpenses.length ? <div className="table-wrap"><table className="data-table expense-table"><thead><tr><th>TRANSACTION</th><th>PACKAGE</th><th>AMOUNT</th><th className="align-right">ACTIONS</th></tr></thead><tbody>{[...visibleExpenses].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((expense) => {
            const pkg = data.packages.find((item) => item.id === expense.package_id)
            return <tr key={expense.id}><td><div className="transaction-name">{expense.category_name}</div><div className="transaction-meta"><span className={`type-dot ${expense.category_type}`} />{expense.category_type === 'common' ? 'Common split' : 'Individual split'}<span>·</span>{formatDate(expense.created_at)}</div></td><td><span className="package-chip">{pkg?.name || 'Package removed'}</span></td><td className="amount-cell">{currency(expense.amount)}</td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${expense.category_name}`} onClick={() => editExpense(expense)}><Icon name="edit" size={16} /></button><button className="icon-button danger" aria-label={`Delete ${expense.category_name}`} onClick={() => deleteExpense(expense)}><Icon name="trash" size={16} /></button></div></td></tr>
          })}</tbody></table></div> : <EmptyState icon="receipt" title="No expenses found" text={filter === 'all' ? 'Add your first trip expense using the form.' : 'There are no expenses recorded for this package yet.'} />}
          <div className="ledger-footer"><span>Showing <strong>{visibleExpenses.length}</strong> of <strong>{data.expenses.length}</strong> expenses</span><span className="ledger-total">Ledger total <strong>{currency(total)}</strong></span></div>
        </section>
      </div>
    </>
  )
}

function ParticipantsPage({ data, updateData }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [message, setMessage] = useState('')
  const reset = () => { setEditing(null); setForm({ name: '', email: '', phone: '' }); setMessage('') }
  const save = (event) => {
    event.preventDefault()
    const participant = { ...form, name: form.name.trim() }
    if (!participant.name) return
    updateData((previous) => ({
      ...previous,
      participants: editing ? previous.participants.map((item) => item.id === editing ? { ...item, ...participant } : item) : [...previous.participants, { id: nextId(previous.participants), ...participant }],
    }))
    reset()
  }
  const remove = (person) => {
    const mappedPackages = data.package_participants.filter((row) => row.participant_id === person.id).map((row) => row.package_id)
    const affectedExpenses = data.expenses.filter((expense) => data.expense_participants.some((share) => share.expense_id === expense.id && share.participant_id === person.id))
    const cannotRemove = mappedPackages.some((packageId) => {
      const packageMembers = data.package_participants.filter((row) => row.package_id === packageId)
      const hasExpenses = data.expenses.some((expense) => expense.package_id === packageId)
      return packageMembers.length === 1 && hasExpenses
    })
    if (cannotRemove) {
      setMessage('This participant is the only member of a package with expenses. Map another participant before deleting them.')
      return
    }
    if (!window.confirm(`Delete ${person.name}? Their existing shares will be redistributed among the other package participants.`)) return
    const remainingMembers = data.package_participants.filter((row) => row.participant_id !== person.id)
    const affectedIds = new Set(affectedExpenses.map((expense) => expense.id))
    const retainedShares = data.expense_participants.filter((share) => share.participant_id !== person.id && !affectedIds.has(share.expense_id))
    let nextShareId = nextId(data.expense_participants)
    const regeneratedShares = affectedExpenses.flatMap((expense) => {
      const ids = remainingMembers.filter((row) => row.package_id === expense.package_id).map((row) => row.participant_id)
      return distribute(expense.amount, ids).map((share) => ({ id: nextShareId++, expense_id: expense.id, ...share }))
    })
    updateData((previous) => ({
      ...previous,
      participants: previous.participants.filter((item) => item.id !== person.id),
      package_participants: remainingMembers,
      expense_participants: [...retainedShares, ...regeneratedShares],
    }))
    if (editing === person.id) reset()
  }
  const edit = (person) => { setEditing(person.id); setForm({ name: person.name, email: person.email || '', phone: person.phone || '' }); setMessage('') }

  return (
    <>
      <PageHeading eyebrow="YOUR TRAVEL GROUP" title="Participants" description="Manage the people joining your pilgrimages and trips." action={<span className="count-pill"><Icon name="users" size={15} />{data.participants.length} people</span>} />
      <div className="management-layout">
        <section className="panel management-form-panel"><div className="panel-heading"><div><div className="section-kicker">{editing ? 'EDIT DETAILS' : 'NEW PERSON'}</div><h2>{editing ? 'Update participant' : 'Add participant'}</h2></div><span className="panel-heading-icon blue"><Icon name="users" /></span></div>
          <form className="stack-form" onSubmit={save}><Field label="Full name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Ramesh Kumar" required /></Field><Field label="Email address"><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="name@example.com" /></Field><Field label="Phone number"><input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="10-digit phone number" /></Field>{message && <div className="form-message" role="alert">{message}</div>}<FormActions editing={Boolean(editing)} onCancel={reset} /></form>
        </section>
        <section className="panel management-table-panel"><div className="panel-heading"><div><div className="section-kicker">PEOPLE DIRECTORY</div><h2>All participants <span className="table-count">{data.participants.length}</span></h2></div></div>
          {data.participants.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>PARTICIPANT</th><th>CONTACT</th><th>PACKAGES</th><th className="align-right">ACTIONS</th></tr></thead><tbody>{data.participants.map((person) => {
            const count = data.package_participants.filter((row) => row.participant_id === person.id).length
            return <tr key={person.id}><td><div className="person-cell"><span className="person-avatar large">{person.name.charAt(0).toUpperCase()}</span><div><div className="transaction-name">{person.name}</div><div className="transaction-meta">Participant #{String(person.id).padStart(3, '0')}</div></div></div></td><td><div className="contact-cell">{person.email && <span>{person.email}</span>}{person.phone && <span>{person.phone}</span>}{!person.email && !person.phone && <span className="muted">No contact details</span>}</div></td><td><span className="package-chip">{count} {count === 1 ? 'package' : 'packages'}</span></td><td><div className="row-actions"><button className="icon-button" aria-label={`Edit ${person.name}`} onClick={() => edit(person)}><Icon name="edit" size={16} /></button><button className="icon-button danger" aria-label={`Delete ${person.name}`} onClick={() => remove(person)}><Icon name="trash" size={16} /></button></div></td></tr>
          })}</tbody></table></div> : <EmptyState icon="users" title="No participants yet" text="Add people to your directory to start building trip groups." />}
        </section>
      </div>
      <div className="info-banner"><span className="info-symbol">i</span><span>Removing a participant redistributes their outstanding expense shares across the remaining people in each affected package.</span></div>
    </>
  )
}

function PackagesPage({ data, updateData }) {
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '' })
  const [message, setMessage] = useState('')
  const reset = () => { setEditing(null); setForm({ name: '', description: '', start_date: '', end_date: '' }); setMessage('') }
  const save = (event) => {
    event.preventDefault()
    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      setMessage('The end date must be on or after the start date.')
      return
    }
    const packageData = { ...form, name: form.name.trim() }
    updateData((previous) => ({
      ...previous,
      packages: editing ? previous.packages.map((item) => item.id === editing ? { ...item, ...packageData } : item) : [...previous.packages, { id: nextId(previous.packages), ...packageData }],
    }))
    reset()
  }
  const remove = (pkg) => {
    if (!window.confirm(`Delete ${pkg.name} and all its expenses and participant mappings?`)) return
    const removedExpenses = new Set(data.expenses.filter((expense) => expense.package_id === pkg.id).map((expense) => expense.id))
    updateData((previous) => ({
      ...previous,
      packages: previous.packages.filter((item) => item.id !== pkg.id),
      package_participants: previous.package_participants.filter((row) => row.package_id !== pkg.id),
      expenses: previous.expenses.filter((expense) => expense.package_id !== pkg.id),
      expense_participants: previous.expense_participants.filter((share) => !removedExpenses.has(share.expense_id)),
    }))
    if (editing === pkg.id) reset()
  }
  const edit = (pkg) => { setEditing(pkg.id); setForm({ name: pkg.name, description: pkg.description || '', start_date: pkg.start_date || '', end_date: pkg.end_date || '' }); setMessage('') }

  return (
    <>
      <PageHeading eyebrow="PLAN YOUR JOURNEYS" title="Packages" description="Create trip packages and keep each group’s costs neatly separated." action={<span className="count-pill"><Icon name="briefcase" size={15} />{data.packages.length} packages</span>} />
      <div className="management-layout packages-layout">
        <section className="panel management-form-panel"><div className="panel-heading"><div><div className="section-kicker">{editing ? 'EDIT PACKAGE' : 'NEW PACKAGE'}</div><h2>{editing ? 'Update package' : 'Create a package'}</h2></div><span className="panel-heading-icon amber"><Icon name="briefcase" /></span></div>
          <form className="stack-form" onSubmit={save}><Field label="Package name"><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Tirupati Yatra" required /></Field><Field label="Description"><textarea rows="3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="A short note about this trip" /></Field><div className="date-grid"><Field label="Start date"><input type="date" value={form.start_date} onChange={(event) => setForm({ ...form, start_date: event.target.value })} /></Field><Field label="End date"><input type="date" value={form.end_date} onChange={(event) => setForm({ ...form, end_date: event.target.value })} /></Field></div>{message && <div className="form-message" role="alert">{message}</div>}<FormActions editing={Boolean(editing)} onCancel={reset} /></form>
        </section>
        <section className="package-cards">{data.packages.length ? data.packages.map((pkg, index) => {
          const members = data.package_participants.filter((row) => row.package_id === pkg.id).map((row) => data.participants.find((person) => person.id === row.participant_id)).filter(Boolean)
          const expenses = data.expenses.filter((expense) => expense.package_id === pkg.id)
          const packageTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
          return <article className="package-card" key={pkg.id}><div className={`package-card-accent accent-${index % 3}`} /><div className="package-card-top"><div className={`package-icon package-icon-${index % 3}`}><Icon name="briefcase" size={19} /></div><div className="row-actions"><button className="icon-button" aria-label={`Edit ${pkg.name}`} onClick={() => edit(pkg)}><Icon name="edit" size={16} /></button><button className="icon-button danger" aria-label={`Delete ${pkg.name}`} onClick={() => remove(pkg)}><Icon name="trash" size={16} /></button></div></div><h2>{pkg.name}</h2><p className="package-description">{pkg.description || 'No trip description added.'}</p><div className="package-date"><Icon name="calendar" size={15} /><span>{formatDate(pkg.start_date)}{pkg.end_date && ` — ${formatDate(pkg.end_date)}`}</span></div><div className="package-card-divider" /><div className="package-members"><div><strong>{members.length}</strong><span>{members.length === 1 ? 'participant' : 'participants'}</span></div><div className="avatar-stack">{members.slice(0, 4).map((person) => <span key={person.id} title={person.name} className="person-avatar stack-avatar">{person.name.charAt(0).toUpperCase()}</span>)}{members.length > 4 && <span className="more-avatar">+{members.length - 4}</span>}</div></div><div className="package-card-bottom"><span>{expenses.length} {expenses.length === 1 ? 'expense' : 'expenses'}</span><strong>{currency(packageTotal)}</strong></div></article>
        }) : <EmptyState icon="briefcase" title="No packages yet" text="Create a package to begin organizing a trip." />}</section>
      </div>
    </>
  )
}

function MappingPage({ data, updateData }) {
  const [packageId, setPackageId] = useState(data.packages[0]?.id || '')
  const currentIds = data.package_participants.filter((row) => row.package_id === Number(packageId)).map((row) => row.participant_id)
  const [selected, setSelected] = useState(currentIds)
  const [saved, setSaved] = useState(false)
  const changePackage = (value) => {
    const nextPackageId = Number(value)
    setPackageId(nextPackageId)
    setSelected(data.package_participants.filter((row) => row.package_id === nextPackageId).map((row) => row.participant_id))
    setSaved(false)
  }
  const toggle = (id) => { setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); setSaved(false) }
  const save = () => {
    updateData((previous) => {
      const otherMappings = previous.package_participants.filter((row) => row.package_id !== Number(packageId))
      const existing = previous.package_participants.filter((row) => row.package_id === Number(packageId))
      const firstNewId = nextId([...otherMappings, ...existing])
      const mappings = selected.map((participant_id, index) => ({
        id: existing.find((row) => row.participant_id === participant_id)?.id || firstNewId + index,
        package_id: Number(packageId),
        participant_id,
      }))
      return { ...previous, package_participants: [...otherMappings, ...mappings] }
    })
    setSaved(true)
  }
  const pkg = data.packages.find((item) => item.id === Number(packageId))

  return (
    <>
      <PageHeading eyebrow="BUILD YOUR GROUP" title="Map participants" description="Choose who belongs to each package. Common expenses use this group for their split." action={<span className="count-pill"><Icon name="link" size={15} />Group setup</span>} />
      <section className="panel mapping-panel"><div className="mapping-intro"><div className="mapping-illustration"><Icon name="users" size={26} /></div><div><div className="section-kicker">PACKAGE MEMBERSHIP</div><h2>Who’s coming along?</h2><p>Assign participants to a package. You can update the group anytime.</p></div></div>
        {data.packages.length ? <>
          <Field label="Select package" className="mapping-package-field"><select value={packageId} onChange={(event) => changePackage(event.target.value)}>{data.packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
          <div className="mapping-summary"><span>Available participants</span><strong>{selected.length} selected <span>of {data.participants.length}</span></strong></div>
          {data.participants.length ? <div className="mapping-list">{data.participants.map((person) => <label key={person.id} className={`mapping-row${selected.includes(person.id) ? ' selected' : ''}`}><input type="checkbox" checked={selected.includes(person.id)} onChange={() => toggle(person.id)} /><span className="person-avatar large">{person.name.charAt(0).toUpperCase()}</span><span className="mapping-person"><strong>{person.name}</strong><small>{person.email || person.phone || 'No contact details'}</small></span><span className="mapping-status">{selected.includes(person.id) ? <><Icon name="check" size={14} /> Added</> : 'Add to group'}</span></label>)}</div> : <EmptyState icon="users" title="No participants available" text="Add people on the Participants page before creating this group." />}
          <div className="mapping-footer"><span>{pkg?.name} · {selected.length} {selected.length === 1 ? 'member' : 'members'}</span><div>{saved && <span className="saved-inline"><Icon name="check" size={15} />Saved</span>}<button className="button button-primary" onClick={save}><Icon name="check" size={16} />Save group</button></div></div>
        </> : <EmptyState icon="briefcase" title="Create a package first" text="You’ll be able to assign participants as soon as you add a package." />}
      </section>
      <div className="info-banner"><span className="info-symbol">i</span><span>Updating a group changes who is included in new expense splits. Shares on expenses already recorded are kept as historical transactions.</span></div>
    </>
  )
}

function ReconciliationPage({ data }) {
  const [packageId, setPackageId] = useState(data.packages[0]?.id || 'all')
  const selectedPackage = packageId === 'all' ? null : Number(packageId)
  const expenses = data.expenses.filter((expense) => !selectedPackage || expense.package_id === selectedPackage)
  const expenseIds = new Set(expenses.map((expense) => expense.id))
  const shares = data.expense_participants.filter((share) => expenseIds.has(share.expense_id))
  const total = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  const allocated = shares.reduce((sum, share) => sum + Number(share.share_amount), 0)
  const difference = Math.round((total - allocated) * 100) / 100
  const people = data.participants.map((person) => {
    const personShares = shares.filter((share) => share.participant_id === person.id)
    return { ...person, total: personShares.reduce((sum, share) => sum + Number(share.share_amount), 0), transactions: personShares.length }
  }).filter((person) => person.total > 0 || !selectedPackage || data.package_participants.some((row) => row.package_id === selectedPackage && row.participant_id === person.id)).sort((a, b) => b.total - a.total)
  const balanceOk = Math.abs(difference) < 0.005

  return (
    <>
      <PageHeading eyebrow="CLEAR, FAIR & SETTLED" title="Reconciliation" description="A transparent view of what each trip cost and how every rupee is shared." action={<Field label="View package" className="recon-filter"><select value={packageId} onChange={(event) => setPackageId(event.target.value === 'all' ? 'all' : Number(event.target.value))}><option value="all">All packages</option>{data.packages.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>} />
      <div className="recon-summary">
        <div className="recon-total-card"><span className="recon-label">TOTAL PACKAGE EXPENSES</span><strong>{currency(total)}</strong><span className="recon-sub">{expenses.length} recorded {expenses.length === 1 ? 'expense' : 'expenses'}</span><div className="recon-decoration"><Icon name="chart" size={48} /></div></div>
        <div className="recon-mini-card"><span className="mini-icon blue"><Icon name="users" /></span><span className="recon-label">PARTICIPANTS</span><strong>{people.length}</strong><span className="recon-sub">With a share in this view</span></div>
        <div className={`recon-mini-card balance-card ${balanceOk ? 'balanced' : 'unbalanced'}`}><span className={`mini-icon ${balanceOk ? 'green' : 'amber'}`}><Icon name={balanceOk ? 'check' : 'chart'} /></span><span className="recon-label">ALLOCATION STATUS</span><strong>{balanceOk ? 'Balanced' : 'Needs review'}</strong><span className="recon-sub">{balanceOk ? 'Every rupee is accounted for' : `${currency(Math.abs(difference))} unallocated`}</span></div>
      </div>
      <div className="recon-layout">
        <section className="panel recon-table-panel"><div className="panel-heading"><div><div className="section-kicker">INDIVIDUAL BREAKDOWN</div><h2>Participant shares</h2></div><span className="count-pill"><Icon name="users" size={15} />{people.length} people</span></div>
          {people.length ? <div className="table-wrap"><table className="data-table recon-table"><thead><tr><th>PARTICIPANT</th><th>TRANSACTIONS</th><th className="align-right">TOTAL SHARE</th></tr></thead><tbody>{people.map((person, index) => <tr key={person.id}><td><div className="person-cell"><span className={`person-avatar large avatar-color-${index % 4}`}>{person.name.charAt(0).toUpperCase()}</span><div><div className="transaction-name">{person.name}</div><div className="transaction-meta">{person.email || 'Trip participant'}</div></div></div></td><td>{person.transactions} {person.transactions === 1 ? 'expense' : 'expenses'}</td><td className="align-right amount-cell">{currency(person.total)}</td></tr>)}</tbody><tfoot><tr><td colSpan="2"><strong>Total allocated</strong></td><td className="align-right amount-cell">{currency(allocated)}</td></tr></tfoot></table></div> : <EmptyState icon="chart" title="Nothing to reconcile yet" text="Record expenses and map participants to see a complete breakdown." />}
        </section>
        <section className="panel allocation-panel"><div className="section-kicker">CHECK THE NUMBERS</div><h2>Expense balance</h2><p className="allocation-intro">The sum of participant shares should match the total expenses for this view.</p><div className="balance-line"><span>Total expenses</span><strong>{currency(total)}</strong></div><div className="balance-line"><span>Total participant shares</span><strong>{currency(allocated)}</strong></div><div className="balance-divider" /><div className="balance-line difference"><span>Difference</span><strong>{currency(difference)}</strong></div><div className={`balance-message${balanceOk ? ' success' : ' warning'}`}><span className="balance-message-icon"><Icon name={balanceOk ? 'check' : 'chart'} size={16} /></span><span>{balanceOk ? 'All expenses are fully allocated across participants.' : 'The share totals do not match. Review this package’s expense allocations.'}</span></div></section>
      </div>
      <section className="panel expense-breakdown"><div className="panel-heading"><div><div className="section-kicker">TRANSACTION DETAIL</div><h2>Expense allocations</h2></div></div>{expenses.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>EXPENSE</th><th>PACKAGE</th><th>SHARED WITH</th><th className="align-right">AMOUNT</th></tr></thead><tbody>{expenses.map((expense) => {
        const assigned = data.expense_participants.filter((share) => share.expense_id === expense.id)
        return <tr key={expense.id}><td><div className="transaction-name">{expense.category_name}</div><div className="transaction-meta">{expense.category_type} expense</div></td><td>{data.packages.find((pkg) => pkg.id === expense.package_id)?.name || 'Package removed'}</td><td><div className="share-chip-list">{assigned.map((share) => <span className="share-chip" key={share.id}>{data.participants.find((person) => person.id === share.participant_id)?.name || 'Former participant'} <strong>{currency(share.share_amount)}</strong></span>)}</div></td><td className="align-right amount-cell">{currency(expense.amount)}</td></tr>
      })}</tbody></table></div> : <EmptyState icon="receipt" title="No expenses to show" text="Add expenses to your package to see how they are allocated." />}</section>
    </>
  )
}

export default App
