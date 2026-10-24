import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  MessageCircle,
  Send,
  ShieldCheck,
  Check,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import type { Claim, Message, User } from "../../../shared/types";
import { api, post, errorMessage } from "../../api/client";
import {
  Empty,
  ErrorBox,
  Info,
  Loading,
  Modal,
  PageHeading,
  Status,
  formatTime,
} from "../../components/ui";
const labels: Record<string, string> = {
  pending: "等待核验",
  approved: "等待交接",
  completed: "已归还",
  rejected: "未通过",
  cancelled: "已撤销",
};
export function Claims({
  user,
  notify,
}: {
  user: User;
  notify: (s: string) => void;
}) {
  const [claims, setClaims] = useState<Claim[] | null>(null),
    [selected, setSelected] = useState(""),
    [messages, setMessages] = useState<Message[]>([]),
    [content, setContent] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [filter, setFilter] = useState("all"),
    [dispute, setDispute] = useState(false),
    [reason, setReason] = useState(""),
    [confirm, setConfirm] = useState("");
  const active = claims?.find((c) => c.id === selected);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    api<Claim[]>("/claims")
      .then((data) => {
        if (alive) {
          setClaims(data);
          setSelected((id) =>
            data.some((c) => c.id === id) ? id : data[0]?.id || "",
          );
        }
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [revision, user.id]);
  useEffect(() => {
    let alive = true;
    setMessages([]);
    setError("");
    if (!selected) return;
    const load = () =>
      api<Message[]>(`/claims/${selected}/messages`)
        .then((m) => {
          if (alive) setMessages(m);
        })
        .catch((e) => {
          if (alive) setError(errorMessage(e));
        });
    load();
    const id = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [selected]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);
  async function action(action: string) {
    if (!active) return;
    setBusy(true);
    setError("");
    try {
      await post(`/claims/${active.id}/action`, { action });
      setConfirm("");
      setRevision((v) => v + 1);
      notify("认领状态已更新");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!active || !content.trim()) return;
    setBusy(true);
    setError("");
    try {
      const m = await post<Message>(`/claims/${active.id}/messages`, {
        content: content.trim(),
      });
      setMessages((ms) => [...ms, m]);
      setContent("");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function report(e: FormEvent) {
    e.preventDefault();
    if (!active) return;
    setBusy(true);
    setError("");
    try {
      await post("/disputes", { claimId: active.id, reason });
      setDispute(false);
      setReason("");
      notify("争议已提交，管理员将核查处理");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const shown = claims?.filter(
    (c) =>
      filter === "all" ||
      (filter === "mine" ? c.applicantId === user.id : c.ownerId === user.id),
  );
  return (
    <>
      <PageHeading
        title="每一步，都离重逢更近"
        description="查看认领进度，与对方核对线索，安心完成交接。"
        action={
          <button
            className="button secondary"
            onClick={() => setRevision((v) => v + 1)}
          >
            <RefreshCw size={16} />
            刷新进度
          </button>
        }
      />
      <ErrorBox error={error} />
      {!claims ? (
        <Loading />
      ) : !claims.length ? (
        <Empty
          title="还没有认领记录"
          description="在拾光广场找到相似物品后，打开详情提交认领申请。"
        />
      ) : (
        <div className="claims-layout">
          <section className="panel claim-list">
            <div className="tabs compact">
              {[
                ["all", "全部"],
                ["mine", "我申请的"],
                ["received", "待我处理"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={filter === id ? "active" : ""}
                  onClick={() => setFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            {shown?.length ? (
              shown.map((c) => (
                <button
                  key={c.id}
                  className={`claim-list-row ${selected === c.id ? "selected" : ""}`}
                  onClick={() => {
                    setSelected(c.id);
                    setContent("");
                  }}
                >
                  <div>
                    <span className="claim-avatar">
                      <MessageCircle size={20} />
                    </span>
                    <span>
                      <b>{c.itemTitle}</b>
                      <small>
                        {c.applicantId === user.id
                          ? "我申请认领"
                          : "有人认领我的物品"}
                      </small>
                    </span>
                  </div>
                  <footer>
                    <time>{formatTime(c.createdAt)}</time>
                    <span className={`claim-state ${c.status}`}>
                      {labels[c.status]}
                    </span>
                  </footer>
                </button>
              ))
            ) : (
              <Empty
                title="暂无记录"
                description="这个分类下还没有认领信息。"
              />
            )}
          </section>
          {active && (
            <section className="panel claim-detail">
              <div className="claim-detail-heading">
                <div>
                  <h2>{active.itemTitle}</h2>
                  <p>认领编号 {active.id.slice(-8)}</p>
                </div>
                <Status value={active.status} />
              </div>
              <div className="claim-progress">
                {["提交申请", "核验通过", "确认归还"].map((label, index) => {
                  const step =
                    active.status === "completed"
                      ? 2
                      : active.status === "approved"
                        ? 1
                        : 0;
                  return (
                    <div key={label} className={index <= step ? "done" : ""}>
                      <span>
                        {index < step ? <Check size={14} /> : index + 1}
                      </span>
                      {label}
                    </div>
                  );
                })}
              </div>
              {["rejected", "cancelled"].includes(active.status) && (
                <Info>
                  此申请已{active.status === "rejected" ? "被拒绝" : "撤销"}
                  ，流程已结束。历史沟通仍可查看。
                </Info>
              )}
              <div className="proof-box">
                <h4>
                  <ShieldCheck size={16} />
                  认领线索（仅双方可见）
                </h4>
                <p>{active.proof}</p>
              </div>
              <div className="claim-action-bar">
                {active.status === "pending" && active.ownerId === user.id && (
                  <>
                    <button
                      className="button small"
                      aria-busy={busy} disabled={busy}
                      onClick={() => setConfirm("approve")}
                    >
                      核验通过
                    </button>
                    <button
                      className="button secondary danger small"
                      aria-busy={busy} disabled={busy}
                      onClick={() => setConfirm("reject")}
                    >
                      拒绝申请
                    </button>
                  </>
                )}
                {active.status === "pending" &&
                  active.applicantId === user.id && (
                    <button
                      className="button secondary danger small"
                      aria-busy={busy} disabled={busy}
                      onClick={() => setConfirm("cancel")}
                    >
                      撤销申请
                    </button>
                  )}
                {active.status === "approved" &&
                  active.applicantId === user.id && (
                    <button
                      className="button small"
                      aria-busy={busy} disabled={busy}
                      onClick={() => setConfirm("complete")}
                    >
                      我已收到物品，确认归还
                    </button>
                  )}
                {active.status === "approved" && active.ownerId === user.id && (
                  <span className="muted">
                    请当面交接，等待申请人确认收到物品。
                  </span>
                )}
                <button
                  className="text-button muted"
                  onClick={() => setDispute(true)}
                >
                  <AlertTriangle size={14} />
                  提交争议
                </button>
              </div>
              <div className="conversation-heading">
                <h3>站内沟通</h3>
                <span>以角色称呼，保护真实身份</span>
              </div>
              <div className="messages" aria-live="polite">
                {!messages.length && (
                  <div className="chat-empty">
                    先打个招呼，核对只有彼此知道的细节。
                  </div>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`message ${m.senderId === user.id ? "mine" : ""}`}
                  >
                    <small>
                      {m.senderId === user.id
                        ? "我"
                        : m.senderId === active.ownerId
                          ? "拾到者"
                          : "认领人"}{" "}
                      · {formatTime(m.createdAt)}
                    </small>
                    <p>{m.content}</p>
                  </div>
                ))}
                <div ref={bottom} />
              </div>
              <form className="message-compose" onSubmit={send}>
                <input
                  aria-label="站内消息"
                  placeholder="写下想对对方说的话…"
                  value={content}
                  maxLength={1000}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={["completed", "rejected", "cancelled"].includes(
                    active.status,
                  )}
                />
                <button
                  className="button" aria-busy={busy}
                  disabled={
                    busy ||
                    !content.trim() ||
                    ["completed", "rejected", "cancelled"].includes(
                      active.status,
                    )
                  }
                >
                  <Send size={16} />
                  发送
                </button>
              </form>
              {["completed", "rejected", "cancelled"].includes(
                active.status,
              ) && (
                <p className="muted chat-readonly">
                  流程已结束，此会话仅供查阅。
                </p>
              )}
            </section>
          )}
        </div>
      )}
      {dispute && (
        <Modal title="提交认领争议" onClose={() => setDispute(false)}>
          <form onSubmit={report} className="stack-form">
            <Info>
              请具体说明情况，管理员将结合记录核查，不会自动改变认领结果。
            </Info>
            <label>
              争议说明
              <textarea
                required
                minLength={5}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例如：物品特征与描述不一致，或对方未实际归还…"
              />
            </label>
            <ErrorBox error={error} />
            <button className="button" aria-busy={busy} disabled={busy}>
              提交管理员处理
            </button>
          </form>
        </Modal>
      )}
      {confirm && (
        <Modal title="确认更新认领状态" onClose={() => setConfirm("")}>
          <p>
            {confirm === "complete"
              ? "请确认你已经实际收到物品。完成后物品将标记为已归还，其他申请会关闭。"
              : confirm === "approve"
                ? "请先核验认领线索。通过后将等待申请人确认实际交接。"
                : confirm === "reject"
                  ? "确认认领线索不符，拒绝这次申请？"
                  : "确认撤销本次申请？"}
          </p>
          <ErrorBox error={error} />
          <div className="dialog-actions">
            <button className="button secondary" onClick={() => setConfirm("")}>
              暂不操作
            </button>
            <button
              className={`button ${confirm === "reject" || confirm === "cancel" ? "danger" : ""}`}
              aria-busy={busy} disabled={busy}
              onClick={() => action(confirm)}
            >
              {busy ? "正在处理…" : "确认"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
