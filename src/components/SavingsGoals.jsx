import { formatCurrency } from '../utils/calculations'

function GoalCard({ goal, onAdd, onDelete }) {
  const progress = goal.targetAmount > 0
    ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
    : 0

  return (
    <article className="goal-card">
      <div className="goal-card-header">
        <h3 className="goal-name">{goal.name}</h3>
        <p className="goal-progress">
          {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
        </p>
      </div>
      <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="goal-card-actions">
        <button type="button" className="btn btn-secondary" onClick={() => onAdd(goal.id)}>
          Add
        </button>
        <button type="button" className="btn btn-ghost-danger" onClick={() => onDelete(goal)}>
          Delete
        </button>
      </div>
    </article>
  )
}

export default function SavingsGoals({ goals, onAddToGoal, onCreateGoal, onDeleteGoal }) {
  return (
    <section className="savings-section">
      <div className="section-header">
        <h2 className="section-title">Savings goals</h2>
        <button type="button" className="btn btn-text" onClick={onCreateGoal}>
          New goal
        </button>
      </div>

      {goals.length === 0 ? (
        <p className="empty-state">No savings goals yet. Create one to start tracking.</p>
      ) : (
        <ul className="goal-list">
          {goals.map((goal) => (
            <li key={goal.id}>
              <GoalCard goal={goal} onAdd={onAddToGoal} onDelete={onDeleteGoal} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
