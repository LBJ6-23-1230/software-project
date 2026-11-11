"""Build the editable Word engineering report from its retained Markdown/PNG sources."""
from pathlib import Path
from urllib.parse import urljoin
import argparse
import re
from docx import Document
from docx.shared import Cm, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE as RT

ap=argparse.ArgumentParser()
ap.add_argument('--repository',type=Path,default=Path(__file__).resolve().parent.parent)
ap.add_argument('--output',type=Path,required=True)
ap.add_argument('--snapshot',required=True)
args=ap.parse_args()
root=args.repository.resolve()
source=root/'docs/csw/工程报告.md'
gh=f'https://github.com/LBJ6-23-1230/software-project/blob/{args.snapshot}/docs/csw/'
d=Document();s=d.sections[0]
s.page_width,s.page_height=Cm(21),Cm(29.7)
s.top_margin,s.bottom_margin=Cm(1.9),Cm(1.8)
s.left_margin,s.right_margin=Cm(2.2),Cm(2.2)
s.header_distance,s.footer_distance=Cm(0.8),Cm(0.8)

def font(r,size=11.5,bold=False,color='000000',east='宋体'):
    r.font.name='Calibri';r._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),east)
    r.font.size=Pt(size);r.font.bold=bold;r.font.color.rgb=RGBColor.from_string(color)

for name,size,east in [('Normal',11.5,'宋体'),('Title',21,'微软雅黑'),('Heading 1',14,'微软雅黑'),('Heading 2',12,'微软雅黑')]:
    st=d.styles[name];st.font.name='Calibri';st._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),east)
    st.font.size=Pt(size);st.font.color.rgb=RGBColor(0,0,0)
    st.paragraph_format.line_spacing=Pt(17.5)
    st.paragraph_format.space_after=Pt(7)
    st.paragraph_format.widow_control=True
    if name!='Normal':st.font.bold=True;st.paragraph_format.keep_with_next=True
    for e in st._element.xpath('.//w:pBdr'):e.getparent().remove(e)

def link(p,label,target,size):
    h=OxmlElement('w:hyperlink');h.set(qn('r:id'),p.part.relate_to(urljoin(gh,target),RT.HYPERLINK,is_external=True))
    r=OxmlElement('w:r');pr=OxmlElement('w:rPr')
    for tag,val in [('color','244E70'),('sz',str(int(size*2)))]:
        e=OxmlElement('w:'+tag);e.set(qn('w:val'),val);pr.append(e)
    fonts=OxmlElement('w:rFonts');fonts.set(qn('w:eastAsia'),'宋体');pr.append(fonts)
    r.append(pr);t=OxmlElement('w:t');t.text=label;r.append(t);h.append(r);p._p.append(h)

def inline(p,text,size=11.5,bold=False):
    # Keep clickable evidence links; render Markdown code spans as ordinary code text.
    text=text.replace('  ',' ')
    parts=re.split(r'(\[[^\]]+\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*)',text)
    for part in parts:
        if not part:continue
        m=re.fullmatch(r'\[([^\]]+)\]\(([^)]+)\)',part)
        if m:link(p,m.group(1),m.group(2),size)
        elif part.startswith('`'):
            r=p.add_run(part[1:-1]);font(r,size-0.5,bold)
        elif part.startswith('**'):font(p.add_run(part[2:-2]),size,True)
        else:font(p.add_run(part),size,bold)

def para(text='',size=11.5,after=7,keep=False,style=None):
    p=d.add_paragraph(style=style);p.paragraph_format.line_spacing=Pt(17.5 if size>=11 else 14.5)
    p.paragraph_format.space_after=Pt(after);p.paragraph_format.keep_with_next=keep
    p.paragraph_format.widow_control=True
    inline(p,text,size)
    if style and style in ('Title','Heading 1','Heading 2'):
        for r in p.runs:
            r.bold=True
            r._element.get_or_add_rPr().rFonts.set(qn('w:eastAsia'),'微软雅黑')
    if style=='Title':p.paragraph_format.line_spacing=Pt(28)
    return p

def table(rows):
    n=len(rows[0]);widths=([3.8,3.7,9.1] if n==3 else [16.6/n]*n)
    t=d.add_table(rows=0,cols=n);t.autofit=False
    for c,w in zip(t.columns,widths):c.width=Cm(w)
    borders=OxmlElement('w:tblBorders')
    for edge in ['top','left','bottom','right','insideH','insideV']:
        e=OxmlElement('w:'+edge)
        for k,v in [('val','single'),('sz','5'),('color','D9D9D9')]:e.set(qn('w:'+k),v)
        borders.append(e)
    t._tbl.tblPr.append(borders)
    mar=OxmlElement('w:tblCellMar')
    for side,v in [('top',65),('bottom',65),('left',100),('right',100)]:
        e=OxmlElement('w:'+side);e.set(qn('w:w'),str(v));e.set(qn('w:type'),'dxa');mar.append(e)
    t._tbl.tblPr.append(mar)
    for i,values in enumerate(rows):
        row=t.add_row();pr=row._tr.get_or_add_trPr();pr.append(OxmlElement('w:cantSplit'))
        if i==0:pr.append(OxmlElement('w:tblHeader'))
        for cell,text,w in zip(row.cells,values,widths):
            cell.width=Cm(w);cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
            sh=OxmlElement('w:shd');sh.set(qn('w:fill'),'243E50' if i==0 else ('F4F6F7' if i%2==0 else 'FFFFFF'));cell._tc.get_or_add_tcPr().append(sh)
            p=cell.paragraphs[0];p.paragraph_format.space_after=Pt(0);p.paragraph_format.line_spacing=Pt(14.5)
            if i==0:
                font(p.add_run(text),10,True,'FFFFFF');p.paragraph_format.keep_with_next=True
            else:inline(p,text,10)
    para('',size=3,after=2).paragraph_format.line_spacing=Pt(3)

h=s.header.paragraphs[0];h.alignment=WD_ALIGN_PARAGRAPH.RIGHT
font(h.add_run('陈思威  F04至F06  模块工程记录'),8.5,color='66707A')
f=s.footer.paragraphs[0];f.alignment=WD_ALIGN_PARAGRAPH.CENTER
font(f.add_run('第 '),9,color='66707A')
for instr,suffix in [('PAGE',' 页  共 '),('NUMPAGES',' 页')]:
    fld=OxmlElement('w:fldSimple');fld.set(qn('w:instr'),instr);f._p.append(fld);font(f.add_run(suffix),9,color='66707A')

p=para('校园失物招领系统\nF04至F06模块工程记录',21,12,style='Title');p.alignment=WD_ALIGN_PARAGRAPH.CENTER
para('陈思威  计算机2403  csw',11,4).alignment=WD_ALIGN_PARAGRAPH.CENTER
para('开发与验证记录日期 2026年11月11日  交付校对日期 2026年11月12日',10,10).alignment=WD_ALIGN_PARAGRAPH.CENTER
para('内容包括需求与可行性、轻量迭代、OOA与OOD、7张设计图、实现与测试、公约评价，以及验收和维护安排。完整追溯表、逐时工作记录和演示脚本随仓库资料保留。',11,10)

lines=source.read_text(encoding='utf-8').splitlines();i=0;figures=0
while i<len(lines):
    line=lines[i].strip();i+=1
    if not line:continue
    if line.startswith('# '):continue
    # Initial author/date metadata are already in the clean title block.
    if i<7:continue
    if line.startswith('## '):
        title=re.sub(r'^(\d+)\.\s*',r'\1 ',line[3:]).replace('、',' ').replace('：',' ')
        p=para(title,14,8,True,'Heading 1');p.paragraph_format.space_before=Pt(10)
        continue
    if line.startswith('### '):
        p=para(line[4:],12,5,True,'Heading 2');p.paragraph_format.space_before=Pt(7);continue
    im=re.fullmatch(r'!\[([^\]]*)\]\(([^)]+)\)',line)
    if im:
        path=source.parent/im.group(2);assert path.is_file(),path
        p=para('',after=2,keep=True);p.alignment=WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(str(path),width=Cm(15.0))
        p.paragraph_format.line_spacing=1.0
        cp=para(im.group(1),9.5,8);cp.alignment=WD_ALIGN_PARAGRAPH.CENTER
        figures+=1;continue
    if line.startswith('|'):
        rows=[]
        while True:
            row=[c.strip() for c in line.strip('|').split('|')]
            if not all(re.fullmatch(r':?-+:?',c) for c in row):rows.append(row)
            if i>=len(lines) or not lines[i].strip().startswith('|'):break
            line=lines[i].strip();i+=1
        table(rows);continue
    if line.startswith('```'):
        code=[]
        while i<len(lines) and not lines[i].startswith('```'):code.append(lines[i]);i+=1
        i+=1
        p=para('\n'.join(code),9,7);p.paragraph_format.line_spacing=Pt(12);continue
    if line.startswith('- '):
        p=para('• '+line[2:],10.5,4);p.paragraph_format.left_indent=Cm(0.3);continue
    text=line
    while i<len(lines) and lines[i].strip() and not re.match(r'^(#|!\[|\||```|- )',lines[i].strip()):
        text+=' '+lines[i].strip();i+=1
    para(text)

# A concise, actionable handover page; detailed scripts remain in the repository.
p=para('验收速查',14,8,True,'Heading 1');p.paragraph_format.page_break_before=True
para('建议先讲清责任边界，再展示正常功能和异常恢复，最后打开代码、测试结果与图源。以下为待本人现场执行的顺序，不冒称已经完成验收。',11,8)
table([['阶段','现场操作','应观察到的结果'],
 ['发布','20260002登录，先查看用途告知，再提交唯一标题的虚构招领','先告知后填写；提交进入待审，本人记录可见。'],
 ['审核与浏览','admin批准后退出，以访客关键词、校区和类别检索','批准前不可公开；批准后可搜索、分页和打开当前详情。'],
 ['维护','本人编辑使其重审；对无活跃认领记录先取消、再确认撤回','编辑后待审；取消不变；确认后退出公开列表但记录保留。'],
 ['异常恢复','查看B02—B07报告与失败/成功截图，可在隔离脚本中复跑','失败不展示旧结果或旧认领表单；重试保持条件并重新读取。'],
 ['工程证据','展示需求追溯、3个真实代码提交、测试日志和7张UML/工程图','说明哪些为既有能力、哪些为本轮改进、哪些仍待验证。']])
para('演示账号为公开课程虚构账号：20260002作发布者、20260001作浏览/认领者、admin作管理员，统一演示密码Campus123!。不等于学校真实认证。',10.5,8)
para('完整现场命令与恢复说明',12,6,True,'Heading 2')
p=para('',10.5,8);link(p,'打开仓库中的验收演示脚本','验收演示脚本.md',10.5)
para('剩余限制：真实读屏和残障用户试用、真实弱网与低配设备性能、axe人工判定项、数据保留及撤回恢复方案。当前系统适用于本机课程演示，尚未进行生产部署验收。',10.5,8)

d.core_properties.title='F04至F06模块工程记录'
d.core_properties.author='陈思威';d.core_properties.subject='需求 设计 实现 测试 维护及公约证据'
args.output.parent.mkdir(parents=True,exist_ok=True);d.save(args.output)
assert figures==7,figures
print(f'OUTPUT {args.output}\nFIGURES {figures}')
