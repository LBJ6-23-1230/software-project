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
ap.add_argument('--two-pages',action='store_true',help='Expanded covenant and highlights, using the original template pagination')
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
if args.two_pages:
    covenant=[
        '（1）第3条 用途告知。发布前说明信息用途、公开字段及撤回保留含义，提醒遮挡敏感信息；不将文字提示等同于自动脱敏。',
        '（2）第5条 二次确认。撤回前弹窗说明影响，确认后执行；服务端再次检查本人权限和认领状态，保留记录而非直接删除。',
        '（3）第7条 基础适配。保留字段标签、错误反馈与弹窗焦点约束，修正本模块错误文字对比度；真实读屏和老年用户试用仍待验。',
        '（4）第8、10条 交付整理。执行接口回归、类型检查和构建，按模块组织页面、接口与测试，保留统一契约和交接说明。',
        '（5）第9条 免注册体验。访客可搜索、筛选并查看公开详情；发布、维护和认领继续执行登录及权限校验。',
        '（6）落实边界。以上覆盖6条基本措施。第4、6、13条部分落实；第11、12、14、15条需补真实过程证据，不以功能存在替代行为证明。',
    ]
    highlights=[
        '1. 明确需求与质量目标。负责F04发布、F05检索浏览、F06本人维护，梳理正常流程、异常输入、权限和状态限制；将需求细化为字段边界、审核可见性、分页完整性与维护权限等验收条件，并明确与登录、认领、审核模块的接口边界。',
        '2. 用业务模型指导设计。围绕用户、物品和认领记录整理关系，以用例、领域概念、组件、序列、状态和活动图说明模块行为，保留7张可编辑图源。区分信息类型、生命周期与审核状态，将OOA业务对象映射到现有TypeScript接口、React组件及服务端路由。',
        '3. 修复旧数据误导。复现并修复详情接口失效后仍显示旧状态和认领表单、查询失败后仍展示旧结果的问题。明确加载、成功、空结果和失败状态，提供同条件重试；切换相关物品或返回原物品时重新读取，确保操作依据当前详情。',
        '4. 避免异步结果覆盖。对查询、详情和推荐请求增加取消与存活检查，切换时清理旧数据、推荐和认领证明。通过600毫秒延迟验证晚到响应隔离，并用变化后的标题与已归还状态检查重试结果，配合服务端权限校验保持状态一致。',
        '5. 补齐关键测试。新增5项接口测试和8项浏览器检查，覆盖字段边界、日期图片负例、6组组合筛选、3页完整性、越权、身份注入和编辑重审，以及告知、404、请求中断、重试、慢响应和390px布局。全项目30项回归、类型检查和生产构建通过，数量按模块与工具分别记录。',
        '6. 保留失败到复验的过程。记录浏览器基线0/8、中间6/8、最终8/8的结果，定位错误文字对比度不足并用局部样式修正；修正冒烟测试等待方式，保留原业务断言。原有无障碍与业务流程完成复验，真实读屏、弱网设备和自动扫描待判项继续列为待办。',
        '7. 做好协作与维护留痕。以追溯表关联需求、设计、源码、测试和Git提交，保留问题定位、方案取舍、失败截图及复验输出，并整理验收脚本与维护清单。按实际情况说明AI辅助，区分团队既有成果与本轮增量，涉及共享接口、数据库和状态规则时先协调。',
    ]
    fill(paragraphs[8],'\n'.join(covenant))
    fill(paragraphs[11],'\n\n'.join(highlights))
else:
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
          'structure':'Original 3 tables, 12 body paragraphs, all labels, fonts, paragraph properties and section geometry preserved; content uses natural template pagination',
          'variant':'two-page detailed' if args.two_pages else 'one-page concise',
          'additional_ai_usage_source':'User confirmed DeepSeek assisted code modification and Doubao was used in early requirements analysis; uses summarized without invented individual test or contribution history',
          'statistics_scope':'1261 physical lines in four items files; 411 added lines in seven module/verification code files; 12 directly related API tests, of which 11 include quality assertions; 3 code commits through 0326277, excluding later document commits; 1 improvement iteration'}
args.evidence.parent.mkdir(parents=True,exist_ok=True)
args.evidence.write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(evidence,ensure_ascii=False))
