import { useState, type FormEvent, type ChangeEvent } from "react";
import { Upload, Send, ImagePlus, MapPin, ClipboardList } from "lucide-react";
import {
  CAMPUSES,
  CATEGORIES,
  type Item,
  type ItemInput,
  type User,
} from "../../../shared/types";
import { post, patch, errorMessage } from "../../api/client";
import { ErrorBox, Info, PageHeading } from "../../components/ui";
export function Publish({
  item,
  onDone,
}: {
  user: User;
  item: Item | null;
  onDone: () => void;
}) {
  const [form, setForm] = useState<ItemInput>(
    item
      ? {
          type: item.type,
          title: item.title,
          category: item.category,
          location: item.location,
          campus: item.campus,
          occurredAt: item.occurredAt.slice(0, 10),
          description: item.description,
          imageUrl: item.imageUrl,
        }
      : {
          type: "found",
          title: "",
          category: "生活用品",
          location: "",
          campus: "南湖校区",
          occurredAt: new Date().toLocaleDateString("en-CA"),
          description: "",
          imageUrl: "",
        },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const update = (key: keyof ItemInput, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));
  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 700 * 1024
    ) {
      setError("请选择不超过 700 KB 的 JPG、PNG 或 WebP 图片。");
      e.target.value = "";
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onload = () => update("imageUrl", String(reader.result));
    reader.onerror = () => setError("无法读取图片，请重新选择。");
    reader.readAsDataURL(file);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        occurredAt: new Date(form.occurredAt + "T12:00:00").toISOString(),
      };
      if (item) await patch(`/items/${item.id}`, payload);
      else await post("/items", payload);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title={item ? "编辑发布信息" : "让物品与主人重新相遇"}
        description={
          item
            ? "更新后将重新审核，通过后恢复公开展示。"
            : "写下物品的线索，让寻找更容易一点。"
        }
      />
      <div className="form-layout">
        <form className="panel publish-form" onSubmit={submit}>
          <h3>
            <ClipboardList size={20} />
            基本信息
          </h3>
          <div className="type-picker">
            <button
              type="button"
              className={form.type === "found" ? "selected" : ""}
              onClick={() => update("type", "found")}
            >
              <b>我拾到了物品</b>
              <span>发布招领，帮助它回家</span>
            </button>
            <button
              type="button"
              className={form.type === "lost" ? "selected" : ""}
              onClick={() => update("type", "lost")}
            >
              <b>我遗失了物品</b>
              <span>发布寻物，寻找更多线索</span>
            </button>
          </div>
          <label>
            物品名称 <span className="required">*</span>
            <input
              required
              minLength={2}
              maxLength={80}
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="例如：图书馆拾到一把墨绿色雨伞"
            />
          </label>
          <div className="form-row">
            <label>
              物品分类
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              {form.type === "found" ? "拾取" : "遗失"}日期{" "}
              <span className="required">*</span>
              <input
                required
                type="date"
                value={form.occurredAt}
                onChange={(e) => update("occurredAt", e.target.value)}
              />
            </label>
          </div>
          <h3 className="form-section">
            <MapPin size={20} />
            在哪里遇见 / 遗失
          </h3>
          <div className="form-row">
            <label>
              所在校区
              <select
                value={form.campus}
                onChange={(e) => update("campus", e.target.value)}
              >
                {CAMPUSES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              具体地点 <span className="required">*</span>
              <input
                required
                minLength={2}
                maxLength={80}
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="例如：图书馆二楼自习区"
              />
            </label>
          </div>
          <label>
            物品描述 <span className="required">*</span>
            <textarea
              rows={4}
              required
              minLength={5}
              maxLength={2000}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="描述颜色、外观、拾取或遗失经过。请保留一两处细节，用于认领核验。"
            />
            <small className="field-count">
              {form.description.length} / 2000
            </small>
          </label>
          <label>
            物品图片
            <span className="upload-zone">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="待发布物品预览" />
              ) : (
                <>
                  <ImagePlus size={30} />
                  <b>选择一张清晰的物品照片</b>
                  <small>JPG / PNG / WebP，最大 700 KB</small>
                </>
              )}
              <span className="upload-button">
                <Upload size={15} />
                {form.imageUrl ? "更换图片" : "选择图片"}
              </span>
              <input
                className="file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={upload}
              />
            </span>
          </label>
          <ErrorBox error={error} />
          <div className="form-submit">
            <span>提交后由管理员审核，保护信息真实性。</span>
            <button className="button" disabled={busy}>
              <Send size={17} />
              {busy ? "正在提交…" : item ? "保存并提交审核" : "提交发布"}
            </button>
          </div>
        </form>
        <aside className="form-help panel">
          <h3>一份有用的发布</h3>
          <ol>
            <li>
              <b>说清楚在哪里</b>
              <p>楼栋、楼层、教室或座位，让范围更准确。</p>
            </li>
            <li>
              <b>留下可核验的细节</b>
              <p>不要一次公开所有特征，认领时再进行确认。</p>
            </li>
            <li>
              <b>照顾彼此的隐私</b>
              <p>证件照片请遮挡完整学号与姓名，联系方式通过站内沟通交换。</p>
            </li>
          </ol>
          <Info>没有照片也可以发布，系统将使用物品示意图。</Info>
        </aside>
      </div>
    </>
  );
}
