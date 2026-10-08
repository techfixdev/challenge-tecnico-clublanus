import type { MovementStatus } from "../domain/movement";
import { MOVEMENT_STATUS_LABEL } from "../domain/movement-display";

const STATUS_CLASSES: Record<MovementStatus, string> = {
  COMPLETED: "bg-success-soft text-success",
  PENDING: "bg-warning-soft text-warning",
};

export function StatusBadge({
  status,
  size = "sm",
}: {
  status: MovementStatus;
  size?: "sm" | "md";
}) {
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${sizeClasses} ${STATUS_CLASSES[status]}`}
    >
      {MOVEMENT_STATUS_LABEL[status]}
    </span>
  );
}
