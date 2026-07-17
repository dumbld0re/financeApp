import { formatCurrency, isLongTerm } from '../utils/calculations'

function GoalCard({ goal, onAdd, onWithdraw, onDelete, onComplete }) {
  const longTerm = isLongTerm(goal)
  const hasTarget = !longTerm && goal.targetAmount > 0
  const progress = hasTarget
    ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
    : 0

  return (
    <article className={`goal-card ${longTerm ? 'goal-card--long-term' : ''}`}>
      <div className="goal-card-header">
        <div>
          <h3 className="goal-name">{goal.name}</h3>
          {longTerm && <span className="goal-badge">Long-term</span>}
        </div>
        <p className="goal-progress">
          {hasTarget
            ? `${formatCurrency(goal.currentAmount)} / ${formatCurrency(goal.targetAmount)}`
            : formatCurrency(goal.currentAmount)}
        </p>
      </div>

      {hasTarget && (
        <div className="progress-bar" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      <div className="goal-card-actions">
        <button type="button" className="btn btn-secondary" onClick={() => onAdd(goal.id)}>
          Add
        </button>
        {goal.currentAmount > 0 && (
          <button type="button" className="btn btn-secondary" onClick={() => onWithdraw(goal)}>
            Withdraw
          </button>
        )}
        {!longTerm && goal.currentAmount > 0 && (
          <button type="button" className="btn btn-complete" onClick={() => onComplete(goal)}>
            Complete
          </button>
        )}
        <button type="button" className="btn btn-ghost-danger" onClick={() => onDelete(goal)}>
          {longTerm ? 'Remove' : 'Delete'}
        </button>
      </div>
    </article>
  )
}

function GoalSection({ goals, emptyText, onAddToGoal, onWithdrawGoal, onDeleteGoal, onCompleteGoal }) {
  if (goals.length === 0) {
    return <p className="empty-state">{emptyText}</p>
  }

  return (
    <ul className="goal-list">
      {goals.map((goal) => (
        <li key={goal.id}>
          <GoalCard
            goal={goal}
            onAdd={onAddToGoal}
            onWithdraw={onWithdrawGoal}
            onDelete={onDeleteGoal}
            onComplete={onCompleteGoal}
          />
        </li>
      ))}
    </ul>
  )
}

export default function SavingsGoals({
  goals,
  onAddToGoal,
  onWithdrawGoal,
  onCreateGoal,
  onDeleteGoal,
  onCompleteGoal,
}) {
  const active = goals.filter((g) => !g.completedAt)
  const longTerm = active.filter((g) => isLongTerm(g))
  const shortGoals = active.filter((g) => !isLongTerm(g))

  return (
    <section className="savings-section">
      <div className="section-header">
        <h2 className="section-title">Savings</h2>
        <button type="button" className="btn btn-text" onClick={onCreateGoal}>
          New
        </button>
      </div>

      <div className="savings-subsection">
        <h3 className="subsection-title">Long-term</h3>
        <GoalSection
          goals={longTerm}
          emptyText="No long-term savings yet."
          onAddToGoal={onAddToGoal}
          onWithdrawGoal={onWithdrawGoal}
          onDeleteGoal={onDeleteGoal}
          onCompleteGoal={onCompleteGoal}
        />
      </div>

      <div className="savings-subsection">
        <h3 className="subsection-title">Goals</h3>
        <GoalSection
          goals={shortGoals}
          emptyText="No goals yet — save for something specific."
          onAddToGoal={onAddToGoal}
          onWithdrawGoal={onWithdrawGoal}
          onDeleteGoal={onDeleteGoal}
          onCompleteGoal={onCompleteGoal}
        />
      </div>
    </section>
  )
}
