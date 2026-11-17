import { Badge } from "@/components/ui/badge"
import type { TaskStatus } from "@/lib/api"
import { cn } from "@/lib/utils"

const STYLES: Record<TaskStatus, string> = {
  created: "bg-muted text-muted-foreground",
  running: "bg-sky-500/15 text-sky-300",
  awaiting_approval: "bg-amber-500/15 text-amber-300",
  blocked: "bg-orange-500/15 text-orange-300",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
}

const LABELS: Record<TaskStatus, string> = {
  created: "Created",
  running: "Running",
  awaiting_approval: "Needs approval",
  blocked: "Needs input",
  cancelled: "Cancelled",
  completed: "Completed",
  failed: "Failed",
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <Badge className={cn("border-0", STYLES[status])}>{LABELS[status]}</Badge>
}

export function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  const style = { low: "text-emerald-300 border-emerald-500/30", medium: "text-amber-300 border-amber-500/30", high: "text-red-300 border-red-500/30" }[risk]
  return (
    <Badge variant="outline" className={style}>
      {risk} risk
    </Badge>
  )
}
