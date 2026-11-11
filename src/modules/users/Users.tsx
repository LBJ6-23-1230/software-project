import { AccessibleForm } from "../../components/AccessibleForm";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  ShieldCheck,
  UserRound,
  Pencil,
  ArrowRight,
  LogIn,
  CheckCircle2,
} from "../../components/icons";
import type { AuthResult, Item, ItemPage, User } from "../../../shared/types";
import { api, post, patch, setToken, errorMessage } from "../../api/client";
import {
  Empty,
  ErrorBox,
  Info,
  Loading,
  Modal,
  PageHeading,
  Status,
  formatDate,
} from "../../components/ui";

export function LoginDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (u: User) => void;
}) {
  const [register, setRegister] = useState(false),
    [studentId, setStudentId] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await post<AuthResult>(
        register ? "/auth/register" : "/auth/login",
        { studentId, password, ...(register ? { name } : {}) },
      );
      setToken(result.token);
      onSuccess(result.user);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={register ? "加入拾光校园" : "欢迎回到拾光校园"}
      onClose={onClose}
    >
      <div className="login-intro">
        <img src="/assets/logo.svg" alt="" />
        <p>连接每一份遗失与善意。</p>
      </div>
      <AccessibleForm onSubmit={submit} className="stack-form" aria-label="登录或注册表单">
        {register && (
          <label>
            昵称
            <input
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={30}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="大家怎么称呼你"
            />
          </label>
        )}
        <label>
          校园账号
          <input
            autoComplete="username"
            required
            maxLength={20}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="请输入学号或账号"
          />
        </label>
        <label>
          密码
          <input
            type="password"
            autoComplete={register ? "new-password" : "current-password"}
            required
            minLength={register ? 8 : 1}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={register ? "至少 8 位，包含字母和数字" : "请输入密码"}
          />
        </label>
        <ErrorBox error={error} focus />
        <button type="submit" className="button full" aria-busy={busy} disabled={busy}>
          <LogIn size={17} />
          {busy ? "请稍候…" : register ? "注册并登录" : "登录"}
        </button>
      </AccessibleForm>
      <p className="auth-switch">
        {register ? "已经有账号？" : "还没有账号？"}
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setRegister(!register);
            setError("");
          }}
        >
          {register ? "去登录" : "创建账号"}
        </button>
      </p>
      {!register && (
        <div className="demo-accounts">
          <span id="demo-accounts-label">快速填入演示账号</span>
          <div role="group" aria-labelledby="demo-accounts-label">
            {[
              ["20260001", "林同学"],
              ["20260002", "陈同学"],
              ["admin", "管理员"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-label={`填入${label}演示账号`}
                onClick={() => {
                  setStudentId(id);
                  setPassword("Campus123!");
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <small>仅供课程演示，不连接学校真实账号。</small>
        </div>
      )}
    </Modal>
  );
}

export function Profile({
  user,
  onUpdate,
  notify,
  onEdit,
  onClaims,
}: {
  user: User;
  onUpdate: (u: User) => void;
  notify: (s: string) => void;
  onEdit: (i: Item) => void;
  onClaims: () => void;
}) {
  const [tab, setTab] = useState("posts"),
    [data, setData] = useState<ItemPage | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [name, setName] = useState(user.name),
    [phone, setPhone] = useState(user.phone),
    [busy, setBusy] = useState(false),
    [binding, setBinding] = useState(false),
    [withdraw, setWithdraw] = useState<Item | null>(null),
    [page, setPage] = useState(1);
  const settingsTitle = useRef<HTMLHeadingElement>(null);
  const phoneHintId = useId();
  const showSettings = () => {
    setTab("settings");
    requestAnimationFrame(() => settingsTitle.current?.focus());
  };
  useEffect(() => {
    let alive = true;
    setData(null);
    api<ItemPage>(`/items?mine=true&page=${page}&pageSize=9`)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [user.id, revision, page]);
  useEffect(() => {
    setName(user.name);
    setPhone(user.phone);
  }, [user]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onUpdate(await patch<User>("/users/me", { name, phone }));
      notify("个人资料已保存");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function bind() {
    if (user.verified) return;
    setBinding(true);
    setError("");
    try {
      const updated = await patch<User>("/users/me", { verified: true });
      onUpdate(updated);
      notify("已完成演示校园身份绑定");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBinding(false);
    }
  }
  return (
    <>
      <PageHeading
        title="我的校园足迹"
        description="每一次发布与归还，都值得被好好记录。"
      />
      <div className="profile-banner panel">
        <span className="avatar avatar-large" aria-hidden="true">
          {user.name.slice(0, 1)}
        </span>
        <div>
          <h2>{user.name}</h2>
          <p>
            {user.role === "admin" ? "系统管理员" : "校园用户"}
            <span className="dot-divider">·</span>
            {user.verified ? "演示身份已绑定" : "尚未绑定校园身份"}
          </p>
        </div>
        <button type="button" className="button secondary" onClick={showSettings}>
          <Pencil size={15} />
          编辑资料
        </button>
      </div>
      <div className="profile-layout">
        <section className="panel" aria-label="我的校园足迹内容">
          <div className="tabs" role="group" aria-label="个人中心视图">
            <button
              type="button"
              aria-pressed={tab === "posts"}
              className={tab === "posts" ? "active" : ""}
              onClick={() => setTab("posts")}
            >
              我的发布 {data && <span>{data.total}</span>}
            </button>
            <button
              type="button"
              aria-pressed={tab === "settings"}
              className={tab === "settings" ? "active" : ""}
              onClick={() => setTab("settings")}
            >
              资料与隐私
            </button>
            <button type="button" onClick={onClaims}>
              我的认领
              <ArrowRight size={14} />
            </button>
          </div>
          <ErrorBox error={error} focus />
          {tab === "posts" ? (
            !data ? (
              <Loading />
            ) : data.items.length ? (
              <>
                <div className="my-items">
                  {data.items.map((item) => (
                    <article key={item.id}>
                      <img
                        src={item.imageUrl || "/assets/bag.jpg"}
                        alt=""
                      />
                      <div className="my-item-info">
                        <div className="inline-tags">
                          <span className={`item-type inline ${item.type}`}>
                            {item.type === "found" ? "招领" : "寻物"}
                          </span>
                          <Status value={item.reviewStatus} />
                          {item.status !== "active" && (
                            <Status value={item.status} />
                          )}
                        </div>
                        <h3>{item.title}</h3>
                        <p>
                          {item.location} ·{" "}
                          <time dateTime={item.createdAt}>
                            {formatDate(item.createdAt)}
                          </time>
                        </p>
                      </div>
                      {item.status === "active" && (
                        <div className="row-actions">
                          <button
                            type="button"
                            className="button secondary small"
                            aria-label={`编辑「${item.title}」`}
                            onClick={() => onEdit(item)}
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            className="text-button muted"
                            aria-label={`撤回「${item.title}」`}
                            onClick={() => setWithdraw(item)}
                          >
                            撤回
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
                <nav className="pagination" aria-label="我的发布分页">
                  <span>共 {data.total} 条</span>
                  <div>
                    <button
                      type="button"
                      className="button secondary small"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      上一页
                    </button>
                    <span>第 {page} 页</span>
                    <button
                      type="button"
                      className="button secondary small"
                      disabled={page * 9 >= data.total}
                      onClick={() => setPage(page + 1)}
                    >
                      下一页
                    </button>
                  </div>
                </nav>
              </>
            ) : (
              <Empty
                title="还没有发布信息"
                description="前往发布信息，记录你遗失或拾到的物品。"
              />
            )
          ) : (
            <AccessibleForm
              className="settings-form stack-form"
              aria-label="资料与隐私表单"
              onSubmit={save}
            >
              <h3 tabIndex={-1} ref={settingsTitle}>
                <UserRound size={18} />
                基本资料
              </h3>
              <label>
                昵称
                <input
                  required
                  minLength={2}
                  maxLength={30}
                  autoComplete="nickname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                校园账号
                <input value={user.studentId} readOnly />
                <small>账号仅在个人中心显示，不会公开在广场。</small>
              </label>
              <label>
                联系电话（选填）
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  pattern="[0-9]{11}"
                  maxLength={11}
                  aria-describedby={phoneHintId}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="11 位手机号"
                />
                <small id={phoneHintId}>
                  仅本人可见，不会自动分享给其他用户。
                </small>
              </label>
              <button
                type="submit"
                className="button"
                aria-busy={busy}
                disabled={busy}
              >
                {busy ? "正在保存…" : "保存资料"}
              </button>
            </AccessibleForm>
          )}
        </section>
        <aside className="profile-side" aria-label="校园身份与隐私提示">
          <div className="panel verification">
            <ShieldCheck size={28} />
            <h3>校园身份</h3>
            {user.verified ? (
              <>
                <span className="verified">
                  <CheckCircle2 size={16} />
                  演示绑定已完成
                </span>
                <p>当前为课程演示身份，不代表真实校园身份认证。</p>
              </>
            ) : (
              <>
                <p>完成演示绑定，体验完整的校园账号流程。</p>
                <button
                  type="button"
                  className="button secondary full"
                  aria-busy={binding}
                  disabled={busy || binding}
                  onClick={bind}
                >
                  {binding ? "正在绑定…" : "绑定演示校园身份"}
                </button>
              </>
            )}
            <Info>真实校园认证接口由用户管理模块后续对接。</Info>
          </div>
          <div className="safety-note">
            <h3>隐私由你掌握</h3>
            <p>
              聊天使用角色称呼。认领证明仅对当事人开放，发布信息时也请主动遮挡敏感内容。
            </p>
          </div>
        </aside>
      </div>
      {withdraw && (
        <Modal title="撤回这条发布？" onClose={() => setWithdraw(null)}>
          <p>
            撤回「{withdraw.title}
            」后，将不再出现在公开列表。有进行中认领的信息暂不能撤回。
          </p>
          <ErrorBox error={error} focus />
          <div className="dialog-actions">
            <button
              type="button"
              className="button secondary"
              onClick={() => setWithdraw(null)}
            >
              保留发布
            </button>
            <button
              type="button"
              className="button danger"
              aria-busy={busy}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await post(`/items/${withdraw.id}/withdraw`);
                  setWithdraw(null);
                  setRevision((r) => r + 1);
                  notify("信息已撤回");
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              确认撤回
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
