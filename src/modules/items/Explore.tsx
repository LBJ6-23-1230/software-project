import { useEffect, useState, type FormEvent } from "react";
import {
  Search,
  MapPin,
  ArrowRight,
  Plus,
  SlidersHorizontal,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ArrowUpRight,
} from "lucide-react";
import {
  CATEGORIES,
  CAMPUSES,
  type Item,
  type ItemPage,
  type Match,
  type Stats,
  type User,
} from "../../../shared/types";
import { api, post, errorMessage } from "../../api/client";
import {
  Empty,
  ErrorBox,
  Loading,
  Modal,
  Status,
  formatDate,
  Info,
} from "../../components/ui";

export function ItemCard({
  item,
  onClick,
}: {
  item: Item;
  onClick: () => void;
}) {
  return (
    <button className="item-card" onClick={onClick}>
      <div className="item-image">
        <img
          src={item.imageUrl || "/assets/bag.jpg"}
          alt={item.title}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/assets/bag.jpg";
          }}
        />
        <span className={`item-type ${item.type}`}>
          {item.type === "found" ? "拾到物品" : "寻找失物"}
        </span>
        {item.status === "claimed" && (
          <span className="image-status">已找回</span>
        )}
      </div>
      <div className="item-card-body">
        <div className="item-meta">
          <span>{item.category}</span>
          <time>{formatDate(item.createdAt)} 发布</time>
        </div>
        <h3>{item.title}</h3>
        <p className="item-location">
          <MapPin size={14} />
          {item.location}
        </p>
        <div className="item-card-footer">
          <span>{item.campus}</span>
          <span className="card-link">
            查看详情
            <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </button>
  );
}

export function Explore({
  user,
  onLogin,
  onPublish,
  onClaim,
  notify,
}: {
  user: User | null;
  onLogin: () => void;
  onPublish: () => void;
  onClaim: () => void;
  notify: (s: string) => void;
}) {
  const [data, setData] = useState<ItemPage | null>(null),
    [stats, setStats] = useState<Stats | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [type, setType] = useState(""),
    [category, setCategory] = useState(""),
    [campus, setCampus] = useState(""),
    [input, setInput] = useState(""),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [detail, setDetail] = useState<Item | null>(null);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), pageSize: "9" });
    for (const [key, value] of Object.entries({ q, type, category, campus })) {
      if (value) params.set(key, value);
    }
    api<ItemPage>("/items?" + params)
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [page, q, type, category, campus]);
  useEffect(() => {
    api<Stats>("/stats")
      .then(setStats)
      .catch(() => {});
  }, []);
  function search(e: FormEvent) {
    e.preventDefault();
    setQ(input.trim());
    setPage(1);
  }
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-note">
            <span />
            把遗失的小事，交给整个校园
          </div>
          <h1>
            总有一份善意，
            <br />
            让失物回到你身边。
          </h1>
          <p>寻找遗失的物品，也帮别人找回小小的安心。</p>
          <div className="hero-actions">
            <button className="button" onClick={onPublish}>
              <Plus size={18} />
              发布失物 / 招领
            </button>
            <span>
              <HeartHandshake size={17} />
              一起，让善意发生
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit" />
          <div className="art-note note-one">
            <span className="paper-pin" />
            <img src="/assets/keys.svg" alt="" />
            <b>是你的钥匙吗？</b>
            <small>寻找它的主人</small>
          </div>
          <div className="art-note note-two">
            <img src="/assets/card.svg" alt="" />
            <b>你的失物，有了新消息</b>
            <span>
              <HeartHandshake size={15} />
              让每一次相遇都有回音
            </span>
          </div>
          <div className="art-seal">
            <HeartHandshake size={25} />
          </div>
          <span className="art-star star-one">✧</span>
          <span className="art-star star-two">✧</span>
        </div>
      </section>
      <div className="stat-strip">
        <div>
          <span className="stat-icon green">
            <HeartHandshake size={20} />
          </span>
          <span>
            <strong>{stats?.completed ?? "—"}</strong>件物品已回到主人身边
          </span>
        </div>
        <div>
          <span className="stat-icon blue">
            <Search size={20} />
          </span>
          <span>
            <strong>{stats?.lost ?? "—"}</strong>条寻物信息
          </span>
        </div>
        <div>
          <span className="stat-icon amber">
            <MapPin size={20} />
          </span>
          <span>
            <strong>{stats?.found ?? "—"}</strong>条招领信息
          </span>
        </div>
        <span className="stat-footnote">当前演示数据</span>
      </div>
      <div className="explore-layout">
        <section className="list-section">
          <div className="section-title">
            <div>
              <h2>校园失物动态</h2>
              <p>也许你在找的，就在这里。</p>
            </div>
            <span className="live-label">
              <span />
              持续传递善意
            </span>
          </div>
          <form className="search-bar" onSubmit={search}>
            <Search size={20} />
            <input
              aria-label="搜索物品名称、描述或地点"
              placeholder="搜索物品名称、描述或地点…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className="button small" type="submit">
              搜索
            </button>
          </form>
          <div className="filter-top">
            <div className="segmented" aria-label="信息类型">
              {[
                ["", "全部信息"],
                ["found", "招领信息"],
                ["lost", "寻物信息"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={type === value ? "selected" : ""}
                  onClick={() => {
                    setType(value);
                    setPage(1);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="filters">
              <SlidersHorizontal size={16} />
              <select
                aria-label="选择校区"
                value={campus}
                onChange={(e) => {
                  setCampus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">全部校区</option>
                {CAMPUSES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="category-filters">
            <button
              className={!category ? "selected" : ""}
              onClick={() => {
                setCategory("");
                setPage(1);
              }}
            >
              全部分类
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                className={category === c ? "selected" : ""}
                onClick={() => {
                  setCategory(c);
                  setPage(1);
                }}
              >
                {c}
              </button>
            ))}
          </div>
          <ErrorBox error={error} />
          {loading ? (
            <Loading />
          ) : data?.items.length ? (
            <>
              <div className="item-grid">
                {data.items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onClick={() => setDetail(item)}
                  />
                ))}
              </div>
              <div className="pagination">
                <span>共 {data.total} 条信息</span>
                <div>
                  <button
                    className="icon-button"
                    aria-label="上一页"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span>
                    {page} /{" "}
                    {Math.max(1, Math.ceil(data.total / data.pageSize))}
                  </span>
                  <button
                    className="icon-button"
                    aria-label="下一页"
                    disabled={page * data.pageSize >= data.total}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : !error ? (
            <Empty
              title="暂时没有匹配的物品"
              description="换个关键词或分类试试，也可以先发布寻物信息。"
              action={
                <button
                  className="button secondary"
                  onClick={() => {
                    setCategory("");
                    setCampus("");
                    setType("");
                    setQ("");
                    setInput("");
                  }}
                >
                  清除筛选
                </button>
              }
            />
          ) : null}
        </section>
        <aside className="right-rail">
          <div className="guide-card">
            <span className="guide-icon">
              <HeartHandshake size={25} />
            </span>
            <h3>拾到物品，怎么办？</h3>
            <p>
              你的一点帮助，
              <br />
              可能是别人一整天的幸运。
            </p>
            <ol>
              <li>
                <span>1</span>
                <div>
                  <b>发布招领信息</b>
                  <small>描述物品与拾取地点</small>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <b>核对认领信息</b>
                  <small>保留关键特征用于验证</small>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <b>安心完成归还</b>
                  <small>当面核验，在系统确认</small>
                </div>
              </li>
            </ol>
            <button className="text-button" onClick={onPublish}>
              我拾到了物品
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="safety-note">
            <ShieldCheck size={21} />
            <h3>让善意，也有保障</h3>
            <p>
              请勿公开完整学号、证件号码或手机号。认领时核对物品细节，在校园公共场所交接。
            </p>
          </div>
          <div className="rail-footer">
            <LeafMark />
            一件失物，一次温暖的重逢。
          </div>
        </aside>
      </div>
      {detail && (
        <ItemDetail
          item={detail}
          user={user}
          onClose={() => setDetail(null)}
          onLogin={() => {
            setDetail(null);
            onLogin();
          }}
          onClaim={() => {
            setDetail(null);
            notify("认领申请已提交，可以在“我的认领”查看进展");
            onClaim();
          }}
        />
      )}
    </>
  );
}
function LeafMark() {
  return <HeartHandshake size={16} />;
}
function ItemDetail({
  item,
  user,
  onClose,
  onLogin,
  onClaim,
}: {
  item: Item;
  user: User | null;
  onClose: () => void;
  onLogin: () => void;
  onClaim: () => void;
}) {
  const [current, setCurrent] = useState<Item>(item),
    [proof, setProof] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [matches, setMatches] = useState<Match[]>([]);
  // The modal opens from a list snapshot; refresh from the API so status,
  // review and claimability always reflect the latest item data.
  useEffect(() => {
    let alive = true;
    setCurrent(item);
    api<Item>(`/items/${item.id}`)
      .then((fresh) => {
        if (alive) setCurrent(fresh);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [item.id]);
  useEffect(() => {
    api<Match[]>(`/items/${current.id}/matches`)
      .then(setMatches)
      .catch(() => {});
  }, [current.id]);
  function openMatch(matchItem: Item) {
    setCurrent(matchItem);
    setProof("");
    setError("");
  }
  function backToOrigin() {
    setCurrent(item);
    setProof("");
    setError("");
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await post("/claims", { itemId: current.id, proof });
      onClaim();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  const viewingMatch = current.id !== item.id;
  return (
    <Modal
      title={current.type === "found" ? "招领详情" : "寻物详情"}
      onClose={onClose}
      wide
    >
      <div className="detail-layout">
        <div className="detail-visual">
          <img src={current.imageUrl || "/assets/bag.jpg"} alt={current.title} />
          <Info>认领前请核对物品特征，不要向任何人支付认领费用。</Info>
        </div>
        <div className="detail-copy">
          {viewingMatch && (
            <button className="text-button detail-back" onClick={backToOrigin}>
              <ChevronLeft size={14} />
              返回原物品
            </button>
          )}
          <div className="inline-tags">
            <span className={`item-type inline ${current.type}`}>
              {current.type === "found" ? "拾到物品" : "寻找失物"}
            </span>
            <Status value={current.status} />
          </div>
          <h2>{current.title}</h2>
          <div className="detail-facts">
            <p>
              <MapPin size={16} />
              {current.campus} · {current.location}
            </p>
            <p>
              <CalendarDays size={16} />
              {formatDate(current.occurredAt)}{" "}
              {current.type === "found" ? "拾到" : "遗失"}
            </p>
          </div>
          <h4>物品描述</h4>
          <p className="description">{current.description}</p>
          <p className="muted">
            发布者：校园用户 · {formatDate(current.createdAt)}
          </p>
          {current.type === "found" &&
          current.status === "active" &&
          current.reviewStatus === "approved" ? (
            user?.id === current.ownerId ? (
              <Info>
                这是你发布的信息，可在个人中心管理，在我的认领中处理申请。
              </Info>
            ) : !user ? (
              <button className="button full" onClick={onLogin}>
                登录后申请认领
              </button>
            ) : (
              <form onSubmit={submit} className="claim-form">
                <label>
                  认领证明
                  <textarea
                    required
                    minLength={5}
                    maxLength={1000}
                    value={proof}
                    onChange={(e) => setProof(e.target.value)}
                    placeholder="描述只有你知道的物品特征，例如内侧标记、遗失经过等。"
                  />
                </label>
                <small>证明仅对认领双方可见，不会展示在广场。</small>
                <ErrorBox error={error} />
                <button className="button full" aria-busy={busy} disabled={busy}>
                  {busy ? "正在提交…" : "这是我的，申请认领"}
                </button>
              </form>
            )
          ) : (
            <Info>
              {current.type === "lost"
                ? "如果你拾到了相似物品，请发布招领信息，便于失主核对并申请认领。"
                : "此物品当前不接受新的认领申请。"}
            </Info>
          )}
        </div>
      </div>
      {matches.length > 0 && (
        <div className="matches">
          <h3>
            <Sparkles size={18} />
            可能相关的物品
          </h3>
          <p>根据类别、地点与关键词规则推荐，点击可查看详情并申请认领。</p>
          <div className="match-list">
            {matches.slice(0, 3).map((m) => (
              <button
                key={m.item.id}
                className="match-item"
                onClick={() => openMatch(m.item)}
              >
                <img src={m.item.imageUrl || "/assets/bag.jpg"} alt="" />
                <span>
                  <b>{m.item.title}</b>
                  <small>{m.reasons.join(" · ")}</small>
                </span>
                <ChevronRight size={14} className="match-arrow" />
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
