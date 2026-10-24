import { useEffect, useRef, useState } from "react";
import {
  Compass,
  Plus,
  MessageCircle,
  UserRound,
  ShieldCheck,
  ArrowUpRight,
  Menu,
  X,
  LogOut,
  Leaf,
} from "lucide-react";
import type { User, Item } from "../shared/types";
import { api, post, setToken } from "./api/client";
import { Explore } from "./modules/items/Explore";
import { Publish } from "./modules/items/Publish";
import { LoginDialog, Profile } from "./modules/users/Users";
import { Claims } from "./modules/claims/Claims";
import { Admin } from "./modules/admin/Admin";
import { Empty } from "./components/ui";
export type Page = "explore" | "publish" | "claims" | "profile" | "admin";
const getPage = (): Page => {
  const p = location.hash.replace("#/", "") as Page;
  return ["explore", "publish", "claims", "profile", "admin"].includes(p)
    ? p
    : "explore";
};
export default function App() {
  const [page, setPage] = useState<Page>(getPage),
    [user, setUser] = useState<User | null>(null),
    [authReady, setAuthReady] = useState(false),
    [login, setLogin] = useState(false),
    [mobile, setMobile] = useState(false),
    [toast, setToast] = useState(""),
    [editing, setEditing] = useState<Item | null>(null),
    [version, setVersion] = useState(0);
  useEffect(() => {
    api<User>("/auth/me")
      .then(setUser)
      .catch(() => setToken(""))
      .finally(() => setAuthReady(true));
    const f = () => {
      setPage(getPage());
      setMobile(false);
    };
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  const sidebarRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!mobile) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(
        sidebar.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((node) => node.offsetParent !== null);
    focusables()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobile(false);
        return;
      }
      if (event.key !== "Tab") return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [mobile]);  function navigate(p: Page) {
    location.hash = "/" + p;
    setPage(p);
    setMobile(false);
    window.scrollTo(0, 0);
  }
  const notify = (message: string) => {
    setToast(message);
    setVersion((v) => v + 1);
  };
  const nav = [
    { id: "explore" as Page, label: "拾光广场", icon: Compass },
    { id: "publish" as Page, label: "发布信息", icon: Plus },
    { id: "claims" as Page, label: "我的认领", icon: MessageCircle },
    { id: "profile" as Page, label: "个人中心", icon: UserRound },
  ];
  const protectedPage = page !== "explore" && !user;
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="关闭导航"
          onClick={() => setMobile(false)}
        />
      )}
      <aside ref={sidebarRef} className={`sidebar ${mobile ? "is-open" : ""}`}>
        <a href="#/explore" className="brand" aria-label="拾光校园首页">
          <img src="/assets/logo.svg" alt="" />
          <div>
            拾光校园<small>让遗失，遇见归还。</small>
          </div>
        </a>
        <button
          className="mobile-close icon-button"
          aria-label="关闭导航"
          onClick={() => setMobile(false)}
        >
          <X />
        </button>
        <div className="nav-caption">校园服务</div>
        <nav>
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${page === id ? "active" : ""}`}
              onClick={() => {
                if (id === "publish") setEditing(null);
                navigate(id);
              }}
            >
              <Icon size={20} />
              {label}
              {id === "explore" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="nav-caption">管理服务</div>
        <button
          className={`nav-item ${page === "admin" ? "active" : ""}`}
          onClick={() => navigate("admin")}
        >
          <ShieldCheck size={20} />
          管理工作台
        </button>
        <div className="sidebar-bottom">
          <div className="kindness">
            <Leaf size={22} />
            <strong>每一份善意，都有回响</strong>
            <p>
              让物品回到主人身边，
              <br />
              也让校园多一点温暖。
            </p>
          </div>
          <div className="sidebar-footer">
            武汉理工大学校园互助项目<small>课程演示版 · 虚构示例数据</small>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-toggle icon-button"
              aria-expanded={mobile}
              aria-label="打开导航"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <span className="breadcrumb">
              校园互助 <span>/</span>{" "}
              <strong>
                {nav.find((n) => n.id === page)?.label || "管理工作台"}
              </strong>
            </span>
          </div>
          <div className="topbar-actions">
            <span className="campus-indicator">
              <span />
              校园里的温暖连接
            </span>
            {user ? (
              <>
                <button
                  className="account-button"
                  onClick={() => navigate("profile")}
                >
                  <span className="avatar">{user.name.slice(0, 1)}</span>
                  <span>{user.name}</span>
                </button>
                <button
                  className="icon-button"
                  title="退出登录"
                  aria-label="退出登录"
                  onClick={async () => {
                    try {
                      await post("/auth/logout");
                    } finally {
                      setToken("");
                      setUser(null);
                      navigate("explore");
                      notify("已退出登录");
                    }
                  }}
                >
                  <LogOut size={17} />
                </button>
              </>
            ) : (
              <button className="button small" onClick={() => setLogin(true)}>
                登录 / 注册
                <ArrowUpRight size={15} />
              </button>
            )}
          </div>
        </header>
        <main className="main-content" id="main-content">
          {protectedPage ? (
            <Empty
              title={authReady ? "登录后继续" : "正在恢复登录状态"}
              description="用校园账号登录，发布信息、管理认领，与对方取得联系。"
              action={
                <button className="button" onClick={() => setLogin(true)}>
                  登录 / 注册
                </button>
              }
            />
          ) : page === "explore" ? (
            <Explore
              key={version}
              user={user}
              onLogin={() => setLogin(true)}
              onPublish={() => {
                setEditing(null);
                navigate("publish");
              }}
              onClaim={() => navigate("claims")}
              notify={notify}
            />
          ) : page === "publish" ? (
            <Publish
              user={user!}
              item={editing}
              onDone={() => {
                setEditing(null);
                navigate("profile");
                notify("信息已提交，审核通过后会在广场展示");
              }}
            />
          ) : page === "profile" ? (
            <Profile
              user={user!}
              onUpdate={setUser}
              notify={notify}
              onEdit={(item) => {
                setEditing(item);
                navigate("publish");
              }}
              onClaims={() => navigate("claims")}
            />
          ) : page === "claims" ? (
            <Claims user={user!} notify={notify} />
          ) : user?.role === "admin" ? (
            <Admin notify={notify} />
          ) : (
            <Empty
              title="这里是管理员工作台"
              description="当前账号没有管理权限。可以在登录窗口选择管理员演示账号查看。"
              action={
                <button
                  className="button secondary"
                  onClick={() => setLogin(true)}
                >
                  切换账号
                </button>
              }
            />
          )}
        </main>
        <footer className="main-footer">
          <span>拾光校园，让每一次归还都有迹可循。</span>
          <span>善意传递 · 隐私保护</span>
        </footer>
      </div>
      {login && (
        <LoginDialog
          onClose={() => setLogin(false)}
          onSuccess={(u) => {
            setUser(u);
            setLogin(false);
            notify("登录成功，欢迎回到拾光校园");
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
