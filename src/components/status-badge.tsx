import { Badge } from "@/components/ui/badge"
import type { TaskStatus } from "@/lib/api"
import { cn } from "@/lib/utils"

const STYLES: Record<TaskStatus, string> = {
  created: "bg-muted text-muted-foreground",
  running: "bg-info/15 text-info",
  awaiting_approval: "bg-warning/15 text-warning",
  blocked: "bg-warning/15 text-warning",
  cancelled: "bg-muted text-muted-foreground",
  completed: "bg-success/15 text-success",
  failed: "bg-danger/15 text-danger",
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
  const style = { low: "text-success border-success/30", medium: "text-warning border-warning/30", high: "text-danger border-danger/30" }[risk]
  return (
    <Badge variant="outline" className={style}>
      {risk} risk
    </Badge>
  )
}
