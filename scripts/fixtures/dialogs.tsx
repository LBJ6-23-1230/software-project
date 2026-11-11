import { useState } from "react";
import { createRoot } from "react-dom/client";
import { Modal } from "../../src/components/ui";
import "../../src/styles.css";

function DialogFixture() {
  const [parent, setParent] = useState(false);
  const [child, setChild] = useState(false);
  return <main>
    <h1>弹窗隔离回归夹具</h1>
    <button onClick={() => setParent(true)}>打开第一层</button>
    {parent && <Modal title="第一层" onClose={() => setParent(false)}>
      <button onClick={() => setChild(true)}>打开第二层</button>
    </Modal>}
    {child && <Modal title="第二层" onClose={() => setChild(false)}>
      <button onClick={() => setChild(false)}>完成第二层</button>
    </Modal>}
  </main>;
}
createRoot(document.getElementById("root")!).render(<DialogFixture />);
