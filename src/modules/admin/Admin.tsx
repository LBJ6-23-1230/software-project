import { useEffect, useState, type FormEvent } from "react";
import {
  ShieldCheck,
  DatabaseBackup,
  FileCheck2,
  Scale,
  Plus,
  RotateCcw,
  Check,
  X,
} from "lucide-react";
import type { Backup, Dispute, Item } from "../../../shared/types";
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
export function Admin({ notify }: { notify: (s: string) => void }) {
  const [tab, setTab] = useState("review"),
    [items, setItems] = useState<Item[] | null>(null),
    [disputes, setDisputes] = useState<Dispute[] | null>(null),
    [backups, setBackups] = useState<Backup[] | null>(null),
    [revision, setRevision] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reviewFilter, setReviewFilter] = useState("pending"),
    [reject, setReject] = useState<Item | null>(null),
    [resolution, setResolution] = useState(""),
    [reason, setReason] = useState(""),
    [resolve, setResolve] = useState<Dispute | null>(null),
    [restore, setRestore] = useState<Backup | null>(null);
  useEffect(() => {
    let alive = true;
    setError("");
    Promise.all([
      api<Item[]>(
        "/admin/items" + (reviewFilter ? "?reviewStatus=" + reviewFilter : ""),
      ),
      api<Dispute[]>("/admin/disputes"),
      api<Backup[]>("/admin/backups"),
    ])
      .then(([i, d, b]) => {
        if (alive) {
          setItems(i);
          setDisputes(d);
          setBackups(b);
        }
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [revision, reviewFilter]);
  async function act(path: string, body: unknown, message: string) {
    setBusy(true);
    setError("");
    try {
      await post(path, body);
      setRevision((v) => v + 1);
      notify(message);
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function rejectItem(e: FormEvent) {
    e.preventDefault();
    if (
      reject &&
      (await act(
        `/admin/items/${reject.id}/review`,
        { action: "reject", reason },
        "信息已驳回 / 下架",
      ))
    ) {
      setReject(null);
      setReason("");
    }
  }
  async function resolveDispute(e: FormEvent) {
    e.preventDefault();
    if (
      resolve &&
      (await act(
        `/admin/disputes/${resolve.id}/resolve`,
        { resolution },
        "争议处理结果已记录",
      ))
    ) {
      setResolve(null);
      setResolution("");
    }
  }
  return (
    <>
      <PageHeading
        title="守护每一份校园善意"
        description="审核信息、处理争议，让每一次寻找与归还更安心。"
        action={
          <span className="admin-badge">
            <ShieldCheck size={16} />
            管理员工作台
          </span>
        }
      />
      <div className="admin-stats">
        <div className="panel">
          <FileCheck2 />
          <span>
            <b>
              {items?.filter((i) => i.reviewStatus === "pending").length ?? "—"}
            </b>
            当前列表待审信息
          </span>
        </div>
        <div className="panel">
          <Scale />
          <span>
            <b>{disputes?.filter((d) => d.status === "open").length ?? "—"}</b>
            待处理争议
          </span>
        </div>
        <div className="panel">
          <DatabaseBackup />
          <span>
            <b>{backups?.length ?? "—"}</b>可用备份
          </span>
        </div>
      </div>
      <div className="panel admin-panel">
        <div className="tabs">
          {[
            ["review", "信息审核", FileCheck2],
            ["disputes", "争议处理", Scale],
            ["backups", "数据备份", DatabaseBackup],
          ].map(([id, label, Icon]) => (
            <button
              key={id as string}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id as string)}
            >
              <Icon size={17} />
              {label as string}
            </button>
          ))}
        </div>
        <ErrorBox error={error} />
        {tab === "review" ? (
          <>
            <div className="admin-toolbar">
              <p>核实内容，保护公开信息质量。</p>
              <select
                aria-label="审核状态"
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
              >
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">未通过</option>
                <option value="">全部状态</option>
              </select>
            </div>
            {!items ? (
              <Loading />
            ) : items.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>物品信息</th>
                      <th>类型 / 地点</th>
                      <th>提交时间</th>
                      <th>状态</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <div className="table-item">
                            <img src={i.imageUrl || "/assets/bag.jpg"} alt="" />
                            <div>
                              <b>{i.title}</b>
                              <p>{i.description}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          {i.type === "found" ? "招领" : "寻物"}
                          <small>{i.location}</small>
                        </td>
                        <td>{formatTime(i.createdAt)}</td>
                        <td>
                          <Status value={i.reviewStatus} />
                        </td>
                        <td>
                          <div className="row-actions">
                            {i.reviewStatus === "pending" && (
                              <button
                                className="button small"
                                disabled={busy}
                                onClick={() =>
                                  act(
                                    `/admin/items/${i.id}/review`,
                                    { action: "approve" },
                                    "信息审核通过，已公开展示",
                                  )
                                }
                              >
                                <Check size={14} />
                                通过
                              </button>
                            )}
                            {i.reviewStatus !== "rejected" && (
                              <button
                                className="button secondary small"
                                disabled={busy}
                                onClick={() => setReject(i)}
                              >
                                <X size={14} />
                                {i.reviewStatus === "approved"
                                  ? "下架"
                                  : "驳回"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="当前没有需要处理的信息"
                description="新的发布和编辑会进入审核列表。"
              />
            )}
          </>
        ) : tab === "disputes" ? (
          !disputes ? (
            <Loading />
          ) : disputes.length ? (
            <div className="dispute-list">
              {disputes.map((d) => (
                <article key={d.id}>
                  <div className="dispute-heading">
                    <h3>认领争议 · {d.claimId.slice(-8)}</h3>
                    <Status value={d.status} />
                  </div>
                  <p>{d.reason}</p>
                  <small>{formatTime(d.createdAt)}</small>
                  {d.status === "open" ? (
                    <button
                      className="button secondary small"
                      onClick={() => setResolve(d)}
                    >
                      记录处理结果
                    </button>
                  ) : (
                    <div className="resolution">
                      <b>处理结果</b>
                      <p>{d.resolution}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="暂无认领争议"
              description="用户提交的争议会显示在这里。"
            />
          )
        ) : (
          <div className="backup-panel">
            <Info>
              备份保存业务数据库，可恢复到选定时间。恢复会覆盖备份之后的业务修改，请先创建当前备份。
            </Info>
            <div className="admin-toolbar">
              <div>
                <h3>本地数据备份</h3>
                <p>初版支持手动备份与恢复。</p>
              </div>
              <button
                className="button"
                disabled={busy}
                onClick={() => act("/admin/backups", {}, "备份已创建")}
              >
                <Plus size={16} />
                {busy ? "正在操作…" : "创建备份"}
              </button>
            </div>
            {!backups ? (
              <Loading />
            ) : backups.length ? (
              <div className="backup-list">
                {backups.map((b) => (
                  <article key={b.id}>
                    <DatabaseBackup size={24} />
                    <span>
                      <b>{formatTime(b.createdAt)}</b>
                      <small>
                        {b.id} · {(b.size / 1024).toFixed(1)} KB
                      </small>
                    </span>
                    <button
                      className="button secondary small"
                      onClick={() => setRestore(b)}
                    >
                      <RotateCcw size={14} />
                      恢复此备份
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title="还没有备份"
                description="创建第一份备份，为业务数据保留一个恢复点。"
              />
            )}
          </div>
        )}
      </div>
      {reject && (
        <Modal title="记录审核原因" onClose={() => setReject(null)}>
          <form className="stack-form" onSubmit={rejectItem}>
            <p>物品：{reject.title}</p>
            <label>
              原因
              <textarea
                required
                minLength={5}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="说明需要修改的内容或下架依据"
              />
            </label>
            <ErrorBox error={error} />
            <button className="button danger" disabled={busy}>
              确认驳回 / 下架
            </button>
          </form>
        </Modal>
      )}
      {resolve && (
        <Modal title="处理认领争议" onClose={() => setResolve(null)}>
          <form className="stack-form" onSubmit={resolveDispute}>
            <p>{resolve.reason}</p>
            <Info>此操作记录处理结论，不自动改变物品和认领状态。</Info>
            <label>
              处理结论
              <textarea
                required
                minLength={5}
                maxLength={2000}
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="说明核查情况和处理结论"
              />
            </label>
            <ErrorBox error={error} />
            <button className="button" disabled={busy}>
              保存处理结果
            </button>
          </form>
        </Modal>
      )}
      {restore && (
        <Modal title="恢复选定备份？" onClose={() => setRestore(null)}>
          <p>
            将恢复到 {formatTime(restore.createdAt)}{" "}
            的数据。备份之后的发布、认领、消息和用户变更可能丢失。
          </p>
          <Info>请确认已保存当前数据。本操作仅用于本地课程演示。</Info>
          <ErrorBox error={error} />
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setRestore(null)}
            >
              取消
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                if (
                  await act(
                    `/admin/backups/${restore.id}/restore`,
                    { confirm: true },
                    "备份已恢复",
                  )
                )
                  setRestore(null);
              }}
            >
              确认覆盖并恢复
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
