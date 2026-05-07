'use client'

import { cn } from '@/lib/utils'

const STEPS = [
  { number: 1, label: 'Envío' },
  { number: 2, label: 'Pago' },
  { number: 3, label: 'Confirmación' },
]

interface StepIndicatorProps {
  currentStep: number
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  return (
    <nav aria-label="Pasos del checkout">
      <ol className="flex items-center justify-center gap-2 sm:gap-4">
        {STEPS.map((step, idx) => {
          const isDone = step.number < currentStep
          const isCurrent = step.number === currentStep

          return (
            <li key={step.number} className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-colors',
                    isDone && 'bg-secondary text-secondary-foreground',
                    isCurrent && 'bg-primary text-primary-foreground',
                    !isDone && !isCurrent && 'bg-muted text-muted-foreground'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isDone ? '✓' : step.number}
                </span>
                <span
                  className={cn(
                    'hidden text-sm sm:block',
                    isCurrent && 'font-semibold text-foreground',
                    !isCurrent && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'h-px w-8 sm:w-16',
                    isDone ? 'bg-secondary' : 'bg-border'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
