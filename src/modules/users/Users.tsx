import { useEffect, useState, type FormEvent } from "react";
import {
  ShieldCheck,
  UserRound,
  Pencil,
  ArrowRight,
  LogIn,
  CheckCircle2,
} from "lucide-react";
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
      <form onSubmit={submit} className="stack-form">
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
        <ErrorBox error={error} />
        <button className="button full" disabled={busy}>
          <LogIn size={17} />
          {busy ? "请稍候…" : register ? "注册并登录" : "登录"}
        </button>
      </form>
      <p className="auth-switch">
        {register ? "已经有账号？" : "还没有账号？"}
        <button
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
          <span>快速填入演示账号</span>
          <div>
            {[
              ["20260001", "林同学"],
              ["20260002", "陈同学"],
              ["admin", "管理员"],
            ].map(([id, label]) => (
              <button
                key={id}
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
    [withdraw, setWithdraw] = useState<Item | null>(null),
    [page, setPage] = useState(1);
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
    setBusy(true);
    try {
      onUpdate(await patch<User>("/users/me", { verified: true }));
      notify("已完成演示校园身份绑定");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title="我的校园足迹"
        description="每一次发布与归还，都值得被好好记录。"
      />
      <div className="profile-banner panel">
        <span className="avatar avatar-large">{user.name.slice(0, 1)}</span>
        <div>
          <h2>{user.name}</h2>
          <p>
            {user.role === "admin" ? "系统管理员" : "校园用户"}
            <span className="dot-divider">·</span>
            {user.verified ? "演示身份已绑定" : "尚未绑定校园身份"}
          </p>
        </div>
        <button className="button secondary" onClick={() => setTab("settings")}>
          <Pencil size={15} />
          编辑资料
        </button>
      </div>
      <div className="profile-layout">
        <section className="panel">
          <div className="tabs">
            <button
              className={tab === "posts" ? "active" : ""}
              onClick={() => setTab("posts")}
            >
              我的发布 {data && <span>{data.total}</span>}
            </button>
            <button
              className={tab === "settings" ? "active" : ""}
              onClick={() => setTab("settings")}
            >
              资料与隐私
            </button>
            <button onClick={onClaims}>
              我的认领
              <ArrowRight size={14} />
            </button>
          </div>
          <ErrorBox error={error} />
          {tab === "posts" ? (
            !data ? (
              <Loading />
            ) : data.items.length ? (
              <>
                <div className="my-items">
                  {data.items.map((item) => (
                    <article key={item.id}>
                      <img
                        src={item.imageUrl || "/assets/bag.svg"}
                        alt={item.title}
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
                          {item.location} · {formatDate(item.createdAt)}
                        </p>
                      </div>
                      {item.status === "active" && (
                        <div className="row-actions">
                          <button
                            className="button secondary small"
                            onClick={() => onEdit(item)}
                          >
                            编辑
                          </button>
                          <button
                            className="text-button muted"
                            onClick={() => setWithdraw(item)}
                          >
                            撤回
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
                <div className="pagination">
                  <span>共 {data.total} 条</span>
                  <div>
                    <button
                      className="button secondary small"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      上一页
                    </button>
                    <span>{page}</span>
                    <button
                      className="button secondary small"
                      disabled={page * 9 >= data.total}
                      onClick={() => setPage(page + 1)}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Empty
                title="还没有发布信息"
                description="前往发布信息，记录你遗失或拾到的物品。"
              />
            )
          ) : (
            <form className="settings-form stack-form" onSubmit={save}>
              <h3>
                <UserRound size={18} />
                基本资料
              </h3>
              <label>
                昵称
                <input
                  required
                  minLength={2}
                  maxLength={30}
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
                  pattern="[0-9]{11}"
                  maxLength={11}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="11 位手机号"
                />
                <small>仅本人可见，不会自动分享给其他用户。</small>
              </label>
              <button className="button" disabled={busy}>
                {busy ? "正在保存…" : "保存资料"}
              </button>
            </form>
          )}
        </section>
        <aside className="profile-side">
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
                  className="button secondary full"
                  disabled={busy}
                  onClick={bind}
                >
                  绑定演示校园身份
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
          <ErrorBox error={error} />
          <div className="dialog-actions">
            <button
              className="button secondary"
              onClick={() => setWithdraw(null)}
            >
              保留发布
            </button>
            <button
              className="button danger"
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
