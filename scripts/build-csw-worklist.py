"""Legacy expanded form. Current submission uses fill-csw-worklist-template.py."""
from pathlib import Path
from hashlib import sha256
from collections import Counter
from copy import deepcopy
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT
import json

import argparse, subprocess
parser=argparse.ArgumentParser()
parser.add_argument('--repository',type=Path,default=Path(__file__).resolve().parent.parent)
parser.add_argument('--template',type=Path,default=Path.home()/'Downloads/个人工作清单.docx')
parser.add_argument('--output-dir',type=Path,required=True)
parser.add_argument('--qa-dir',type=Path,required=True)
parser.add_argument('--snapshot',required=True)
args=parser.parse_args()
ROOT=args.repository.resolve()
REPO=ROOT
REF=args.template.resolve()
OUT=args.output_dir/'个人工作清单_陈思威_公约逐条核对修订版.docx'
TMP=args.qa_dir
TMP.mkdir(parents=True,exist_ok=True)
SHA=args.snapshot
GH = f'https://github.com/LBJ6-23-1230/software-project/blob/{SHA}/'
REF_HASH = sha256(REF.read_bytes()).hexdigest()

clauses = [
 (1, '适用范围', '范围条款', '本课程团队项目及F04—F06适用，不单独计为完成项。'),
 (2, '基本原则', '原则条款', '以真实、隐私、质量和协作为总体准则，通过具体条款核对。'),
 (3, '数据采集须说明用途', '基本落实', '本轮补充发布前用途、公开字段和撤回保留告知；不覆盖账号模块全部采集活动。'),
 (4, '发现设计隐患须及时提出', '部分落实', '已有问题审查与修复记录；本人提出问题的时间和团队沟通证据不足。'),
 (5, '高危操作须二次确认', '基本落实', '本人撤回前弹窗确认，后端校验权限与认领锁定；未提供撤回后的恢复入口。'),
 (6, '不伪造不隐瞒', '部分落实', '本次测试、统计口径和未测项明确；开发全过程及个人贡献仍需本人佐证。'),
 (7, '为视障老年用户做基础适配', '基本落实', '已有标签、焦点、对比度与错误提示；真实读屏及老年用户试用未验收。'),
 (8, '交付前做基础整理', '基本落实', '本次回归与构建通过，仓库保留界面检查记录；不等于全部质量目标已验收。'),
 (9, '核心功能免注册体验', '基本落实', '访客可搜索、筛选及查看公开详情；发布、修改、认领等写操作需要登录。'),
 (10, '交付前整理代码结构', '基本落实', '页面、服务端、共享契约与测试按职责组织，接口和交接文档可追溯。'),
 (11, '为减轻用户负担放弃功能', '待过程证据', '存在轻量化设计，但未见因用户负担而主动放弃具体功能的决策记录。'),
 (12, '进度冲突时的取舍原则', '待过程证据', '范围与质量边界已说明；未见真实进度冲突、同步和取舍记录。'),
 (13, '特殊用户群体检查项', '部分落实', '新增断网失败与恢复检查；真实弱网、低配及六类用户专项评估仍不完整。'),
 (14, '公约执行', '待过程证据', '有成员职责和交接约定；缺负责人提醒及公约执行跟踪记录。'),
 (15, '公约争议处理', '待过程证据', '需真实的团队或班级协商记录；系统中的认领争议功能不能替代本条。'),
]
assert Counter(c[2] for c in clauses) == {'基本落实':6, '部分落实':3, '待过程证据':4, '范围条款':1, '原则条款':1}

d = Document(REF)
for e in list(d._element.body):
    if e.tag != qn('w:sectPr'):
        d._element.body.remove(e)
s = d.sections[0]
s.page_width, s.page_height = Cm(21), Cm(29.7)
s.top_margin, s.bottom_margin = Cm(1.9), Cm(1.8)
s.left_margin, s.right_margin = Cm(2.2), Cm(2.2)
s.header_distance, s.footer_distance = Cm(0.8), Cm(0.8)

def set_font(run, size=11.5, bold=False, color='000000', east='宋体'):
    run.font.name = 'Calibri'
    run._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'), east)
    run.font.size, run.bold, run.font.color.rgb = Pt(size), bold, RGBColor.from_string(color)

for name, size, east, bold in [('Normal',11.5,'宋体',False),('Title',21,'微软雅黑',True),
                               ('Heading 1',14,'微软雅黑',True),('Heading 2',11.5,'微软雅黑',True)]:
    if name not in d.styles:
        d.styles.add_style(name,WD_STYLE_TYPE.PARAGRAPH)
    st=d.styles[name]
    st.font.name='Calibri'; st._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),east)
    st.font.size=Pt(size); st.font.bold=bold; st.font.color.rgb=RGBColor(0,0,0)
    pf=st.paragraph_format
    pf.space_before=Pt(0); pf.space_after=Pt(5)
    pf.line_spacing=Pt(17)
    pf.widow_control=True
    if name.startswith('Heading'):pf.keep_with_next=True
    for border in st._element.xpath('.//w:pBdr'):border.getparent().remove(border)

def para(text='', size=11.5, bold=False, after=5, before=0, color='000000', keep=False, style=None):
    p=d.add_paragraph(style=style)
    pf=p.paragraph_format
    pf.line_spacing=Pt(17 if size>=11 else 14.5)
    pf.space_after=Pt(after);pf.space_before=Pt(before)
    pf.keep_with_next=keep;pf.widow_control=True
    if text:set_font(p.add_run(text),size,bold,color)
    return p

def heading(text, page=False, level=1):
    p=para(text,14 if level==1 else 11.5,True,8 if level==1 else 3,0 if level==1 else 7,
           keep=True,style=f'Heading {level}')
    p.paragraph_format.page_break_before=page
    return p

def table(headers, rows, widths, size=10.5, has_header=True):
    t=d.add_table(rows=1 if has_header else 0, cols=len(widths))
    t.autofit=False;t.alignment=WD_TABLE_ALIGNMENT.CENTER
    pr=t._tbl.tblPr
    # Remove inherited table indentation from the teacher form.
    for e in list(pr):
        if e.tag==qn('w:tblInd'):pr.remove(e)
    tw=pr.find(qn('w:tblW'));tw.set(qn('w:type'),'dxa');tw.set(qn('w:w'),str(round(sum(widths)*567)))
    borders=OxmlElement('w:tblBorders')
    for edge in ['top','left','bottom','right','insideH','insideV']:
        b=OxmlElement('w:'+edge);b.set(qn('w:val'),'single');b.set(qn('w:sz'),'5');b.set(qn('w:color'),'D9D9D9');borders.append(b)
    pr.append(borders)
    mar=OxmlElement('w:tblCellMar')
    for side,v in [('top',65),('bottom',65),('left',105),('right',105)]:
        e=OxmlElement('w:'+side);e.set(qn('w:w'),str(v));e.set(qn('w:type'),'dxa');mar.append(e)
    pr.append(mar)
    for col,w in zip(t.columns,widths):col.width=Cm(w)
    if has_header:
        dataset=[headers]+rows
    else:dataset=rows
    for i,values in enumerate(dataset):
        row=t.rows[0] if i==0 and has_header else t.add_row()
        trpr=row._tr.get_or_add_trPr();trpr.append(OxmlElement('w:cantSplit'))
        if i==0 and has_header:
            trpr.append(OxmlElement('w:tblHeader'))
        for j,(cell,text) in enumerate(zip(row.cells,values)):
            cell.width=Cm(widths[j]);cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            tcpr=cell._tc.get_or_add_tcPr()
            sh=OxmlElement('w:shd');sh.set(qn('w:fill'),'243E50' if i==0 and has_header else ('F4F6F7' if i%2==0 else 'FFFFFF'));tcpr.append(sh)
            p=cell.paragraphs[0];pf=p.paragraph_format
            pf.line_spacing=Pt(14.5);pf.space_before=Pt(0);pf.space_after=Pt(0);pf.widow_control=True
            if i==0 and has_header:pf.keep_with_next=True
            p.alignment=WD_ALIGN_PARAGRAPH.LEFT
            set_font(p.add_run(str(text)),size,i==0 and has_header,'FFFFFF' if i==0 and has_header else '000000')
    para('',after=1,size=3).paragraph_format.line_spacing=Pt(3)
    return t

def detail(num, title, conclusion, text, evidence, size=11.2, clause=True):
    heading(f'{"第"+num+"条" if clause else "亮点"+num}  {title}  {conclusion}',level=2)
    p=para(text,size=size,after=2);p.paragraph_format.keep_together=True
    para(f'证据：{evidence}',size=9.5,color='5B6570',after=5)

def hyperlink(p,label,url):
    h=OxmlElement('w:hyperlink');h.set(qn('r:id'),p.part.relate_to(url,RT.HYPERLINK,is_external=True))
    r=OxmlElement('w:r');pr=OxmlElement('w:rPr')
    col=OxmlElement('w:color');col.set(qn('w:val'),'244E70');pr.append(col)
    sz=OxmlElement('w:sz');sz.set(qn('w:val'),'19');pr.append(sz)
    fonts=OxmlElement('w:rFonts');fonts.set(qn('w:eastAsia'),'宋体');pr.append(fonts)
    r.append(pr);t=OxmlElement('w:t');t.text=label;r.append(t);h.append(r);p._p.append(h)

# Running information and page numbering make a multi-page course form easy to read.
hp=s.header.paragraphs[0];hp.text='个人工作清单  陈思威  信息发布和浏览模块'
hp.alignment=WD_ALIGN_PARAGRAPH.RIGHT
for r in hp.runs:set_font(r,8.5,color='66707A')
fp=s.footer.paragraphs[0];fp.alignment=WD_ALIGN_PARAGRAPH.CENTER
set_font(fp.add_run('第 '),9,color='66707A')
for field in ['PAGE','NUMPAGES']:
    fld=OxmlElement('w:fldSimple');fld.set(qn('w:instr'),field);fp._p.append(fld)
    set_font(fp.add_run(' 页  共 ' if field=='PAGE' else ' 页'),9,color='66707A')

# PAGE 1 — preserve every field in the teacher form, with wider reading space.
p=para('个人工作清单',21,True,10,style='Title');p.alignment=WD_ALIGN_PARAGRAPH.CENTER
table(None,[['姓名','陈思威','班级','计算机2403'],['项目名称','校园失物招领系统','责任标识','csw']], [2,6.3,2,6.3],has_header=False,size=11)
heading('个人分工',level=2)
table(['编号','功能模块','责任范围与联动边界'],[
 ['F04','寻物与招领信息发布','负责两类发布表单、字段与图片校验、提交待审核；依赖xzh的会话身份，与gbl审核联动。'],
 ['F05','分类搜索与详情浏览','负责关键词、类型、类别、校区筛选、分页及详情；访客可浏览公开信息，为stt认领提供入口。'],
 ['F06','本人信息编辑与撤回','负责本人维护权限、编辑后重审和撤回；与stt的进行中认领锁定、gbl审核状态保持一致。'],
], [1.3,4.2,11.1])
para('上述职责贯穿需求分析、设计、实现维护、测试与联调。模块归属不等于各处代码均由本人独立编写；个人完成过程需结合实际提交、审核和实验记录说明。',10,after=5,color='4B5560')
heading('一 项目数据概况')
table(['指标','统计结果与口径'],[
 ['总代码行数','1,261行：两个页面、items局部样式及物品服务端文件的物理行数。'],
 ['AI辅助代码行数','本轮7个模块及验证代码文件新增411行、删除31行（不含资料生成器）；历史累计未记录。'],
 ['测试用例数','全项目接口/客户端30项；模块直接相关12项；另有浏览器专项8项。'],
 ['质量需求对应的测试用例数','接口相关11项（既有6项＋新增5项）；浏览器8项另含功能与异常交互断言。'],
 ['Git提交次数','代码修复与验证已提交3次（截至0326277，不含后续文档提交）；个人累计待核实。'],
 ['迭代版本数','本轮完成1次质量改进迭代；基于团队0.2.1。个人历史累计待补充。'],
], [5.2,11.4],size=10)
para('核对日期：2026年11月11日。代码快照0326277。物理行含空行与联动代码；AI辅助变更按Git差异统计，不能当作历史个人手写量。不同工具检查单位分别计数。本次30项回归、类型检查与构建通过。',9.5,after=5,color='4B5560')
heading('二 AI协同记录')
table(['AI工具','已确认使用阶段','主要用途','使用频率'],[
 ['Codex','本轮分析、设计、修改、测试与文档','辅助审查与修复3项缺口，补充测试、UML和工程记录；成员需理解并审核。','本轮持续使用\n历史频次未记录'],
],[2,3.7,7.1,3.8],size=10)

# PAGE 2 — all 15 clauses, with an explicit and conservative counting rule.
heading('三 班级开发公约履行',page=True)
para('逐条核对15条：6条基本落实，3条部分落实，4条待补过程证据；第1、2条属于适用范围和总原则，单独列示。',12,True,after=7)
para('本结论限定于F04—F06及其联动界面。“基本落实”表示已有明确措施和相应代码或检查记录，仍须注明验证边界；不是对全项目、全部场景或个人开发全过程的完整验收。',10.5,after=7)
table(['条款与主题','核对结论','主要依据及边界'],[
 [f'第{n}条  {title}',status,brief] for n,title,status,brief in clauses
],[4.6,2.6,9.4],size=10)
para('条款依据为所附班级公约PDF全文。以下说明将技术事实、既有测试记录、个人行为证据和待补工作分别表述；不因代码存在就推定已履行沟通、提醒或协商义务。',10,after=0,color='4B5560')

# PAGE 3 — clauses 3 to 8, measures and limitations kept together.
heading('公约履行详情 第三至第八条',page=True)
detail('三','数据采集须说明用途','基本落实',
 '本轮在首个输入字段前加入说明：内容用于展示寻物与招领线索、管理员审核和后续核对；审核通过后，标题、时间、地点、描述、照片等向访客公开；撤回退出公开列表但记录保留。明确提醒不填写真实敏感身份信息、系统不会自动脱敏。该说明同时适用于发布与编辑，不增加强制勾选步骤。账号模块的数据采集告知仍需由其负责人另行核对。',
 'E02、E03、E11的B01/B08；移动端与告知区域扫描已通过。')
detail('四','发现设计隐患须及时提出','部分落实',
 '本轮审查实际复现3项P2问题：失效详情仍开放旧表单、失败查询混用旧结果、发布用途告知不足，并在本次迭代记录、修改和复验；追加检查又发现错误提示对比度不足，随后修正。以上形成当前迭代的问题处理证据。历史材料和AI审查不能证明本人开发全程的上报时间、对象及沟通过程，故本条保留部分落实。',
 'E10、E11和本轮初始审查记录；历史个人过程需据实补充。')
detail('五','高危操作须二次确认','基本落实',
 '用户点击撤回后先显示确认弹窗，明确说明将退出公开列表及进行中认领的限制，点击“确认撤回”才发送请求。服务端另行检查发布者身份和业务状态；通过修改status保留记录，而非直接物理删除。此结论覆盖本人发布的撤回操作；目前没有撤回后的恢复入口，不能把保留数据库记录写成“支持用户撤销或恢复”。',
 'E03的撤回接口、E04的确认弹窗；E06覆盖撤回与认领状态约束。')
detail('六','不伪造不隐瞒','部分落实',
 '本清单分别记录模块存量、本轮Git差异、个人历史待补项与不同工具的检查数量。本轮保存基线0/8、中间6/8、最终8/8的浏览器报告；30项接口及客户端回归通过，类型检查和构建通过。冒烟曾因同步断言读取加载态失败，保留原地点断言并补正确等待后复验通过。没有把失败过程删除后只保留成功结论，也未冒称完整个人历史。',
 'E06、E08、E11；失败、中间和通过报告均保留。')
detail('七','为视障老年用户做基础适配','基本落实',
 '页面已有标签、筛选状态、结果播报、焦点和公共弹窗适配。本轮新增错误场景扫描发现对比度不足，使用模块局部深红样式修复；告知与两种错误态共3次扫描未检出违规。已重跑原10次扫描、28项交互及15项边界回归，全部通过。仍有插画对比度等自动检查不确定项；真实读屏、真实系统主题和老年用户试用尚未验收。',
 'E02、E05、E07、E08、E11。0违规不等于完整无障碍合规。')
detail('八','交付前做基础整理','基本落实',
 '本轮重新进行自动回归、类型检查与构建，保存发布告知、失败列表、失效详情及390px页面截图。修复加载、失败和重试反馈后，普通与强制颜色模式的发布→审核→搜索详情→认领→消息→核验冒烟各6/6通过。这些支持基础交付整理，不代替全量文案校对、真实用户试用或教师最终验收。',
 'E05、E06、E08及本次构建日志。')

# PAGE 4 — remaining operative clauses and six distinct user groups.
heading('公约履行详情 第九至第十五条',page=True)
detail('九','核心功能免注册体验','基本落实',
 '未登录访客可查询审核通过的公开物品，使用关键词和类型、分类、校区筛选、分页及详情查看；发布、修改、撤回和认领申请需要登录。这样为浏览提供免注册入口，并保留写操作的身份约束。适用范围是信息浏览，不表述为“所有核心操作均免注册”。', 'E03公开查询接口、E05搜索与详情页面、E06访客可见性测试。')
detail('十','交付前整理代码结构','基本落实',
 '发布与浏览页面在items模块，物品接口在服务端items模块，公共数据结构、请求客户端与测试单独组织；任务清单、接口契约和交接文档说明F04—F06的责任与依赖。F06撤回按钮位于个人中心，需与xzh协作；匹配、公共无障碍等共享或其他成员的代码不直接计为本人独立工作。', 'E01、E02—E06、E09。')
detail('十一','为减轻用户负担放弃功能','待过程证据',
 '当前无需图片也可发布，浏览无需注册，体现降低操作负担的设计；但“没有实现某项功能”不等于因用户负担主动放弃它。未见具体功能、用户负担分析、备选方案和团队决定的完整记录，本条暂不计入基本落实。', 'E02支持无图发布、E09记载初版范围；仍需真实取舍记录。')
detail('十二','进度冲突时的取舍原则','待过程证据',
 '设计和验证文档明确演示边界、核心流程及未测项，可作为后续取舍的依据。但现有材料不能确认发生过哪次进度冲突、怎样优先质量与安全、删减了哪些非必要功能以及何时同步团队；不能补写未发生或未留痕的进度决策。', 'E09。若实际发生冲突，需补充原因、决策、责任人及后续验证。')
heading('第十三条  特殊用户群体检查项  部分落实',level=2)
para('公约列出的六类群体逐一核对如下。技术措施存在与真实用户专项测试完成，是两种不同结论。',size=10.5,after=4)
table(['用户群体','当前措施或证据','仍需补充的验证'],[
 ['老年用户','已有文字标签、焦点与基础操作反馈。','老年用户任务试用、可读性及误操作观察。'],
 ['视障色弱色盲用户','ARIA、键盘焦点、强制颜色及既有自动审计。','真实读屏听读、系统主题和实际用户试用。'],
 ['低配手机用户','分页、图片懒加载及部分窄屏检查。','低配实机、CPU限制、帧率和资源占用测试。'],
 ['经济困难用户','当前演示版无支付入口，公开浏览免注册。','尚无针对该群体的实际负担评估。'],
 ['隐私敏感用户','发布前用途告知、字段保护及维护权限。','账号模块告知、描述与图片误披露风险评估。'],
 ['无稳定网络用户','已模拟请求中断，验证错误提示及同条件重试。','真实弱网、长时离线及不确定写入结果专项验证。'],
],[3.2,6.6,6.8],size=9.5)
para('证据：E02、E03、E05—E08。现有措施不足以宣称六类群体已全部完成专项验收。',size=9.5,color='5B6570',after=4)
detail('十四','公约执行','待过程证据',
 '已有成员分工和交接约定，尚不足以证明负责人持续提醒和检查本公约。需补充真实提醒、检查或会议记录，以及本人的实际整改反馈。', 'E01、E09仅支持分工与交接，不能替代公约执行跟踪。',size=10.5)
detail('十五','公约争议处理','待过程证据',
 '本条针对公约执行分歧，系统的失物认领争议功能不能替代团队协商。现有材料无法确认本条是否触发；本人可据实说明未发生，或补充真实协商记录。', '不编造争议、会议或一致意见。',size=10.5)

# PAGE 5 — capabilities are grounded in module behavior, not invented individual history.
heading('四 个人工作亮点')
detail('一','需求与质量要求对应','本轮可核对工作',
 '本轮新增5项接口测试，覆盖字段上下界、日期、图片、6组筛选、3页完整性和维护权限；新增8项浏览器检查，覆盖用途告知、旧数据、重试、竞态与移动端。需求、实现和测试按F04—F06对应。', 'E01、E03、E06、E11。新增与既有覆盖分别计数。',clause=False)
detail('二','状态与异常处理','可核对的模块工作',
 '修复失效详情沿用旧快照、失败筛选显示旧结果，补同条件重试和过时请求隔离。保留原有三维业务状态及后端权限；缺陷如实记录为前端状态一致性问题，未夸大为权限绕过。', 'E03、E05、E11；未改变认领或审核状态机。',clause=False)
detail('三','跨模块协作与证据边界','个人说明应据实补充',
 '发布依赖xzh身份，公开展示受gbl审核影响，维护受stt认领状态约束；个人中心和公共无障碍由团队协作。保留设计决策、失败与通过报告、UML和真实提交；个人历史工作量由本人补充。', 'E01、E04、E07、E09。',clause=False)
heading('证据索引',level=2)
para(f'链接固定到{SHA[:7]}资料快照。团队或工具记录不自动等于本人独立贡献。',10,after=5)
sources = [
 ('E01','职责及接口','docs/task-list.md', 'F04—F06任务、质量目标与接口边界'),
 ('E02','发布页面','src/modules/items/Publish.tsx', '字段与图片校验、隐私提示、无图发布'),
 ('E03','物品服务端','server/modules/items.ts', '身份、公开查询、重审、撤回与状态锁定'),
 ('E04','个人中心撤回入口','src/modules/users/Users.tsx', '撤回提示、取消和确认按钮'),
 ('E05','浏览页面','src/modules/items/Explore.tsx', '访客搜索、筛选、详情和异常反馈'),
 ('E06','接口与边界测试','server/tests/items.test.ts', '5项新增边界、筛选分页、权限与重审测试'),
 ('E07','无障碍实现说明','docs/accessibility.md', '共享适配措施、历史结果及验证边界'),
 ('E08','本轮生产验证','reports/csw/2026-11-11-a11y/report.json', '重跑10次扫描、28项交互；另有15项边界回归'),
 ('E09','设计与协作边界','docs/handoff.md', '成员分工、共享契约与交接要求'),
 ('E10','历史问题审查','reports/code-review-2026-10-24.md', '历史问题线索；须结合verification.md核查'),
 ('E11','本轮模块浏览器检查','reports/csw/2026-11-11-final/report.json', '8/8及3次扫描；基线、中间和截图另存同级目录'),
]
t=table(['编号','证据文件','支持的核对内容'],[[a,b,c] for a,b,_,c in sources],[1.4,5.1,10.1],size=9.5)
for i,(code,label,path,meaning) in enumerate(sources):
    p=t.rows[i+1].cells[1].paragraphs[0]
    p.clear();hyperlink(p,label,GH+path)
para('完整工程记录、OOA/OOD、UML图片及验收脚本见docs/csw；命令输出和截图见reports/csw。业务检查使用隔离数据，真实用户专项验收与个人历史统计仍待补充。',9.5,after=0,color='4B5560')

d.core_properties.title='个人工作清单'
d.core_properties.subject='陈思威 信息发布和浏览模块 班级开发公约逐条核对'
d.core_properties.author='陈思威'
d.core_properties.comments=''
settings=d.settings.element
upd=OxmlElement('w:updateFields');upd.set(qn('w:val'),'true');settings.append(upd)
OUT.parent.mkdir(parents=True,exist_ok=True)
d.save(OUT)
assert sha256(REF.read_bytes()).hexdigest()==REF_HASH

audit=json.loads((REPO/'reports/a11y-0.2.1-2026-11-11/report.json').read_text(encoding='utf-8'))
reg=json.loads((REPO/'reports/a11y-regression-2026-11-11/report.json').read_text(encoding='utf-8'))
assert len(audit['runs'])==10 and sum(len(r['violations']) for r in audit['runs'])==0
assert len(audit['checks'])==28 and all(c['pass'] for c in audit['checks'])
assert len(reg['checks'])==15 and all(c['passed'] for c in reg['checks'])
report={'file':str(OUT),'source_sha256':REF_HASH,'snapshot':SHA,
        'clauses':clauses,'counts':dict(Counter(c[2] for c in clauses)),
        'tests_current':{'total':30,'pass':30,'fail':0},
        'a11y_source':'rerun this iteration; existing reports retained separately',
        'layout':'A4, margins 1.9/1.8/2.2/2.2 cm; 11.5pt body, 14pt headings; planned 5 pages'}
(TMP/'revision-evidence.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'output':str(OUT),'counts':report['counts'],'bytes':OUT.stat().st_size},ensure_ascii=False))
