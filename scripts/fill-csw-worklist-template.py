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
    lines=text.split('\n')
    if nodes:
        anchor=nodes[0]
        anchor.text=lines[0]
        for n in nodes[1:]:n.text=''
    else:
        r=p.find('w:r',NS)
        if r is None:r=etree.SubElement(p,'{'+W+'}r')
        anchor=etree.SubElement(r,'{'+W+'}t');anchor.text=lines[0]
    for line in lines[1:]:
        br=etree.Element('{'+W+'}br');anchor.addnext(br)
        t=etree.Element('{'+W+'}t');t.text=line;br.addnext(t);anchor=t

def cell(t,row,col,text):
    p=tables[t].findall('w:tr',NS)[row].findall('w:tc',NS)[col].find('w:p',NS)
    fill(p,text);changed.append(f'table[{t}]/row[{row}]/cell[{col}]')

cell(0,0,1,'陈思威')
cell(0,0,3,'计算机2403')
cell(0,1,1,'校园失物招领系统')
cell(0,2,1,'负责信息发布和浏览：F04寻物/招领发布，F05分类搜索、分页与详情浏览，F06本人信息编辑与撤回，以及相应需求、设计、实现和测试。数据按模块口径填写。')
for row,left,right in [(0,'1,261','本轮411行'),(1,'12','11'),(2,'代码3次','本轮1次')]:
    cell(1,row,1,left);cell(1,row,3,right)
for col,text in enumerate(['Codex\nDeepSeek\n豆包','开发与文档\n代码修改\n需求分析',
                           '修复补测与资料整理\n辅助分析与修改代码\n梳理需求与功能范围',
                           '本轮持续使用\n按需使用\n前期使用']):
    cell(2,1,col,text)
fill(paragraphs[8],'第3、5、7、8、9、10条已有基本措施：发布前告知、撤回二次确认、基础无障碍、交付检查、访客浏览和模块化组织，共6条。第4、6、13条部分落实；第11、12、14、15条过程证据待补。')
fill(paragraphs[11],'需求与设计方面，明确F04—F06的功能边界及登录、审核、认领依赖，用UML与追溯表连接需求、实现和测试；问题处理中，复现并修复旧详情、旧查询结果误用，补充加载、重试及过时请求隔离；验证方面，新增5项接口测试和8项浏览器检查，覆盖字段边界、越权、分页和失败恢复，本轮30项回归通过；协作与维护方面，保留失败到通过的记录、图源和真实Git提交，区分AI辅助与团队既有成果，便于联调、复核和后续维护。')
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
          'additional_ai_usage_source':'User confirmed DeepSeek assisted code modification and Doubao was used in early requirements analysis; uses summarized without invented individual test or contribution history',
          'statistics_scope':'1261 physical lines in four items files; 411 added lines in seven module/verification code files; 12 directly related API tests, of which 11 include quality assertions; 3 code commits through 0326277, excluding later document commits; 1 improvement iteration'}
args.evidence.parent.mkdir(parents=True,exist_ok=True)
args.evidence.write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(evidence,ensure_ascii=False))
