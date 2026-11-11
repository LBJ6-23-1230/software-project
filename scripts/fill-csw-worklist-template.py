"""Fill the teacher's retained form in place, without changing its layout or styles."""
from pathlib import Path
from zipfile import ZipFile
from hashlib import sha256
from copy import deepcopy
import argparse
import json
from lxml import etree

ap=argparse.ArgumentParser()
ap.add_argument('--template',type=Path,default=Path.home()/'Downloads/个人工作清单.docx')
ap.add_argument('--output',type=Path,required=True)
ap.add_argument('--evidence',type=Path,required=True)
args=ap.parse_args()
W='http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS={'w':W}
source_hash=sha256(args.template.read_bytes()).hexdigest()
with ZipFile(args.template) as z:
    entries=[(i,z.read(i.filename)) for i in z.infolist()]
parts={i.filename:data for i,data in entries}
doc=etree.fromstring(parts['word/document.xml'])
baseline=deepcopy(doc)
body=doc.find('w:body',NS)
tables=body.findall('w:tbl',NS)
paragraphs=body.findall('w:p',NS)
assert len(tables)==3 and len(paragraphs)==12
changed=[]

def fill(p,text):
    # Reuse existing runs and their exact formatting. Only an empty slot needs a new run.
    nodes=p.findall('.//w:t',NS)
    if nodes:
        nodes[0].text=text
        for n in nodes[1:]:n.text=''
    else:
        r=p.find('w:r',NS)
        if r is None:r=etree.SubElement(p,'{'+W+'}r')
        t=etree.SubElement(r,'{'+W+'}t');t.text=text

def cell(t,row,col,text):
    p=tables[t].findall('w:tr',NS)[row].findall('w:tc',NS)[col].find('w:p',NS)
    fill(p,text);changed.append(f'table[{t}]/row[{row}]/cell[{col}]')

cell(0,0,1,'陈思威')
cell(0,0,3,'计算机2403')
cell(0,1,1,'校园失物招领系统')
cell(0,2,1,'负责信息发布和浏览：F04寻物/招领发布，F05分类搜索、分页与详情浏览，F06本人信息编辑与撤回，以及相应需求、设计、实现和测试。数据按模块口径填写。')
for row,left,right in [(0,'1,261','本轮411行'),(1,'12','11'),(2,'代码3次','本轮1次')]:
    cell(1,row,1,left);cell(1,row,3,right)
for col,text in enumerate(['Codex','分析、实现、测试及文档','缺陷定位、代码辅助修改、补测与资料整理','本轮按需使用']):
    cell(2,1,col,text)
fill(paragraphs[8],'第3、5、7、8、9、10条已有基本措施：发布前告知、撤回二次确认、基础无障碍、交付检查、访客浏览和模块化组织，共6条。第4、6、13条部分落实；第11、12、14、15条过程证据待补。')
fill(paragraphs[11],'针对失效详情沿用旧快照、查询失败混用旧结果等问题，补充加载、错误和重试处理；新增5项接口测试和8项浏览器检查，保留基线失败、修复、复验及Git提交记录，便于追溯。')
changed+=['body/paragraph[8]','body/paragraph[11]']

# Only filled slots may differ. No original paragraph, row, cell or property is removed.
def strip_filled(root):
    out=deepcopy(root);b=out.find('w:body',NS);ts=b.findall('w:tbl',NS);ps=b.findall('w:p',NS)
    targets=[ts[t].findall('w:tr',NS)[r].findall('w:tc',NS)[c].find('w:p',NS)
             for t,r,c in [(0,0,1),(0,0,3),(0,1,1),(0,2,1),
                           (1,0,1),(1,0,3),(1,1,1),(1,1,3),(1,2,1),(1,2,3),
                           (2,1,0),(2,1,1),(2,1,2),(2,1,3)]]+[ps[8],ps[11]]
    for p in targets:
        for r in p.findall('w:r',NS):
            # Empty slots may gain a content-only run; existing formatting remains checked separately.
            for n in list(r):
                if n.tag!='{'+W+'}rPr':r.remove(n)
            if len(r)==0:p.remove(r)
    return etree.tostring(out)
assert strip_filled(baseline)==strip_filled(doc),'Unintended structural or formatting change'
xml=etree.tostring(doc,xml_declaration=True,encoding='UTF-8',standalone=True)
args.output.parent.mkdir(parents=True,exist_ok=True)
with ZipFile(args.output,'w') as z:
    for info,data in entries:z.writestr(info,xml if info.filename=='word/document.xml' else data)
with ZipFile(args.output) as z:
    changed_parts=[n for n,data in parts.items() if z.read(n)!=data]
    assert changed_parts==['word/document.xml']
assert sha256(args.template.read_bytes()).hexdigest()==source_hash
evidence={'template':args.template.name,'template_sha256':source_hash,'output':args.output.name,
          'changed_package_parts':changed_parts,'filled_slots':changed,
          'structure':'Original 3 tables, 12 body paragraphs, all labels, properties and section geometry preserved',
          'statistics_scope':'1261 physical lines in four items files; 411 added lines in seven module/verification code files; 12 directly related API tests, of which 11 include quality assertions; 3 code commits through 0326277, excluding later document commits; 1 improvement iteration'}
args.evidence.parent.mkdir(parents=True,exist_ok=True)
args.evidence.write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(evidence,ensure_ascii=False))
