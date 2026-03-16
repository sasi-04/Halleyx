interface Step {
  name: string;
  completed: boolean;
  isCurrent?: boolean;
}

export function WorkflowProgress({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-col gap-3 text-sm">
      {steps.map((step, index) => (
        <li key={step.name} className="flex items-center gap-3">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
              step.completed
                ? "bg-neutral-900 text-white border-neutral-900"
                : step.isCurrent
                ? "border-neutral-900 text-neutral-900"
                : "border-neutral-300 text-neutral-400"
            }`}
          >
            {index + 1}
          </div>
          <div>
            <div className="font-medium">
              {step.name}
              {step.isCurrent && (
                <span className="ml-2 text-xs uppercase tracking-wide text-amber-600">
                  Current
                </span>
              )}
            </div>
            <div className="text-xs text-neutral-500">
              {step.completed
                ? "Completed"
                : step.isCurrent
                ? "In progress"
                : "Pending"}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

