import { useEffect, useId, useRef, type ReactNode } from "react";
import {
  X,
  SearchX,
  LoaderCircle,
  CheckCircle2,
  Clock3,
  CircleHelp,
} from "lucide-react";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const titleId = useId();
  const box = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    box.current?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key === "Tab") {
        const nodes = Array.from(
          box.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
          ) || [],
        ).filter((el) => el.offsetParent !== null);
        if (!nodes.length) {
          event.preventDefault();
          return;
        }
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === box.current)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === box.current)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={box}
      >
        <div className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            aria-label="关闭窗口"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Empty({
  title = "这里还没有内容",
  description = "试试调整筛选条件，或发布一条新信息。",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <SearchX size={38} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      正在加载…
    </div>
  );
}
export function ErrorBox({ error }: { error: string }) {
  return error ? (
    <p className="error-box" role="alert">
      {error}
    </p>
  ) : null;
}
export function Status({ value }: { value: string }) {
  const map: Record<string, [string, string]> = {
    active: ["进行中", "green"],
    claimed: ["已找回", "gray"],
    withdrawn: ["已撤回", "gray"],
    pending: ["待审核", "amber"],
    approved: ["已通过", "green"],
    rejected: ["未通过", "red"],
    completed: ["已完成", "green"],
    cancelled: ["已取消", "gray"],
    open: ["待处理", "amber"],
    resolved: ["已处理", "green"],
  };
  const [label, color] = map[value] || [value, "gray"];
  return (
    <span className={`status ${color}`}>
      {value === "pending" || value === "open" ? (
        <Clock3 size={12} />
      ) : value === "completed" || value === "claimed" ? (
        <CheckCircle2 size={12} />
      ) : null}
      {label}
    </span>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="subheading">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function Info({ children }: { children: ReactNode }) {
  return (
    <div className="info-box">
      <CircleHelp size={17} />
      <span>{children}</span>
    </div>
  );
}
export function formatDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? "时间待确认"
    : d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}
export function formatTime(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
}
