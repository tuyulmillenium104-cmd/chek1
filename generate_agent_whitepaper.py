# -*- coding: utf-8 -*-
"""
Agent-Based Architecture Whitepaper for Rally Content Generation & Judging
"""

import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.lib import colors
from reportlab.lib.units import cm, inch, mm
from reportlab.platypus import (
    Paragraph, Spacer, PageBreak, Table, TableStyle,
    SimpleDocTemplate, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# ============================================================
# FONT REGISTRATION
# ============================================================
pdfmetrics.registerFont(TTFont('TimesNewRoman', '/usr/share/fonts/truetype/english/Times-New-Roman.ttf'))
pdfmetrics.registerFont(TTFont('Calibri', '/usr/share/fonts/truetype/english/calibri-regular.ttf'))
pdfmetrics.registerFont(TTFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'))
pdfmetrics.registerFont(TTFont('SimHei', '/usr/share/fonts/truetype/chinese/SimHei.ttf'))
pdfmetrics.registerFont(TTFont('SarasaMonoSC', '/usr/share/fonts/truetype/chinese/SarasaMonoSC-Regular.ttf'))

registerFontFamily('TimesNewRoman', normal='TimesNewRoman', bold='TimesNewRoman')
registerFontFamily('Calibri', normal='Calibri', bold='Calibri')
registerFontFamily('DejaVuSans', normal='DejaVuSans', bold='DejaVuSans')
registerFontFamily('SimHei', normal='SimHei', bold='SimHei')

# ============================================================
# COLOR SCHEME
# ============================================================
PRIMARY_DARK = colors.HexColor('#1F4E79')
PRIMARY_MED = colors.HexColor('#2E75B6')
ACCENT_TEAL = colors.HexColor('#00B0A0')
ACCENT_ORANGE = colors.HexColor('#ED7D31')
BG_LIGHT = colors.HexColor('#F5F5F5')
TEXT_DARK = colors.HexColor('#1A1A2E')
TEXT_SECONDARY = colors.HexColor('#4A4A6A')
CODE_BG = colors.HexColor('#F8F9FA')
CODE_BORDER = colors.HexColor('#DEE2E6')

TABLE_HEADER_COLOR = colors.HexColor('#1F4E79')
TABLE_HEADER_TEXT = colors.white
TABLE_ROW_EVEN = colors.white
TABLE_ROW_ODD = colors.HexColor('#F5F5F5')

# ============================================================
# STYLES
# ============================================================
PAGE_W, PAGE_H = A4
MARGIN = 2.2 * cm

# Cover styles
cover_title_style = ParagraphStyle(
    name='CoverTitle',
    fontName='TimesNewRoman',
    fontSize=36,
    leading=44,
    alignment=TA_CENTER,
    textColor=PRIMARY_DARK,
    spaceAfter=20
)

cover_subtitle_style = ParagraphStyle(
    name='CoverSubtitle',
    fontName='Calibri',
    fontSize=18,
    leading=26,
    alignment=TA_CENTER,
    textColor=TEXT_SECONDARY,
    spaceAfter=12
)

cover_author_style = ParagraphStyle(
    name='CoverAuthor',
    fontName='Calibri',
    fontSize=13,
    leading=20,
    alignment=TA_CENTER,
    textColor=TEXT_SECONDARY,
    spaceAfter=10
)

# Body styles
h1_style = ParagraphStyle(
    name='H1',
    fontName='TimesNewRoman',
    fontSize=20,
    leading=28,
    textColor=PRIMARY_DARK,
    spaceBefore=18,
    spaceAfter=10,
)

h2_style = ParagraphStyle(
    name='H2',
    fontName='TimesNewRoman',
    fontSize=15,
    leading=22,
    textColor=PRIMARY_MED,
    spaceBefore=14,
    spaceAfter=8,
)

h3_style = ParagraphStyle(
    name='H3',
    fontName='TimesNewRoman',
    fontSize=12.5,
    leading=19,
    textColor=colors.HexColor('#34495E'),
    spaceBefore=10,
    spaceAfter=6,
)

body_style = ParagraphStyle(
    name='Body',
    fontName='TimesNewRoman',
    fontSize=10.5,
    leading=17,
    textColor=TEXT_DARK,
    alignment=TA_JUSTIFY,
    spaceBefore=2,
    spaceAfter=6,
    firstLineIndent=0,
)

body_indent_style = ParagraphStyle(
    name='BodyIndent',
    fontName='TimesNewRoman',
    fontSize=10.5,
    leading=17,
    textColor=TEXT_DARK,
    alignment=TA_LEFT,
    spaceBefore=2,
    spaceAfter=4,
    leftIndent=18,
)

bullet_style = ParagraphStyle(
    name='Bullet',
    fontName='TimesNewRoman',
    fontSize=10.5,
    leading=17,
    textColor=TEXT_DARK,
    alignment=TA_LEFT,
    spaceBefore=2,
    spaceAfter=3,
    leftIndent=24,
    bulletIndent=12,
)

code_style = ParagraphStyle(
    name='Code',
    fontName='DejaVuSans',
    fontSize=8,
    leading=12,
    textColor=colors.HexColor('#D4D4D4'),
    alignment=TA_LEFT,
    spaceBefore=2,
    spaceAfter=2,
    leftIndent=6,
    rightIndent=6,
)

code_label_style = ParagraphStyle(
    name='CodeLabel',
    fontName='DejaVuSans',
    fontSize=7.5,
    leading=10,
    textColor=colors.HexColor('#999999'),
    alignment=TA_LEFT,
    spaceBefore=0,
    spaceAfter=0,
    leftIndent=6,
)

caption_style = ParagraphStyle(
    name='Caption',
    fontName='TimesNewRoman',
    fontSize=9.5,
    leading=14,
    textColor=TEXT_SECONDARY,
    alignment=TA_CENTER,
    spaceBefore=3,
    spaceAfter=6,
)

# Table styles
tbl_header_style = ParagraphStyle(
    name='TblHeader',
    fontName='TimesNewRoman',
    fontSize=10,
    leading=14,
    textColor=colors.white,
    alignment=TA_CENTER,
)

tbl_cell_style = ParagraphStyle(
    name='TblCell',
    fontName='TimesNewRoman',
    fontSize=9.5,
    leading=14,
    textColor=TEXT_DARK,
    alignment=TA_LEFT,
)

tbl_cell_center = ParagraphStyle(
    name='TblCellCenter',
    fontName='TimesNewRoman',
    fontSize=9.5,
    leading=14,
    textColor=TEXT_DARK,
    alignment=TA_CENTER,
)

highlight_style = ParagraphStyle(
    name='Highlight',
    fontName='TimesNewRoman',
    fontSize=10.5,
    leading=17,
    textColor=PRIMARY_DARK,
    alignment=TA_LEFT,
    spaceBefore=4,
    spaceAfter=4,
    leftIndent=12,
    borderColor=ACCENT_TEAL,
    borderWidth=0,
    borderPadding=6,
)

# ============================================================
# HELPER FUNCTIONS
# ============================================================
def make_code_block(code_text, label=""):
    """Create a styled code block"""
    elements = []
    bg_data = [[Paragraph(code_text, code_style)]]
    if label:
        bg_data.insert(0, [Paragraph(label, code_label_style)])
    bg_table = Table(bg_data, colWidths=[PAGE_W - 2*MARGIN - 12])
    bg_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#282C34')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#3E4451')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(bg_table)
    return elements

def make_comparison_table(data, col_widths, caption_text=""):
    """Create a styled comparison table"""
    styled_data = []
    for i, row in enumerate(data):
        styled_row = []
        for j, cell in enumerate(row):
            if i == 0:
                styled_row.append(Paragraph(f'<b>{cell}</b>', tbl_header_style))
            else:
                if j == 0:
                    styled_row.append(Paragraph(f'<b>{cell}</b>', tbl_cell_style))
                else:
                    styled_row.append(Paragraph(cell, tbl_cell_center))
        styled_data.append(styled_row)
    
    tbl = Table(styled_data, colWidths=col_widths)
    style_cmds = [
        ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]
    for idx in range(1, len(data)):
        bg = TABLE_ROW_EVEN if idx % 2 == 1 else TABLE_ROW_ODD
        style_cmds.append(('BACKGROUND', (0, idx), (-1, idx), bg))
    
    tbl.setStyle(TableStyle(style_cmds))
    
    elements = [Spacer(1, 12), tbl]
    if caption_text:
        elements.append(Spacer(1, 6))
        elements.append(Paragraph(caption_text, caption_style))
    elements.append(Spacer(1, 12))
    return elements

def make_flow_box(title, items, box_color):
    """Create a flow diagram box"""
    title_p = Paragraph(f'<b>{title}</b>', ParagraphStyle(
        name=f'FlowTitle_{title}', fontName='TimesNewRoman', fontSize=11,
        leading=16, textColor=colors.white, alignment=TA_CENTER
    ))
    item_style = ParagraphStyle(
        name=f'FlowItem_{title}', fontName='TimesNewRoman', fontSize=9,
        leading=14, textColor=TEXT_DARK, alignment=TA_LEFT, leftIndent=4
    )
    
    content = [[title_p]]
    for item in items:
        content.append([Paragraph(item, item_style)])
    
    tbl = Table(content, colWidths=[PAGE_W - 2*MARGIN - 40])
    tbl.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, 0), box_color),
        ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#FAFAFA')),
        ('BOX', (0, 0), (-1, -1), 1.5, box_color),
        ('LINEBELOW', (0, 0), (0, 0), 1, box_color),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    return tbl


# ============================================================
# BUILD DOCUMENT
# ============================================================
output_path = '/home/z/my-project/download/Agent_Based_Arsitektur_Rally_Content_Generation.pdf'
os.makedirs(os.path.dirname(output_path), exist_ok=True)

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=MARGIN,
    rightMargin=MARGIN,
    topMargin=MARGIN,
    bottomMargin=MARGIN,
    title='Agent_Based_Arsitektur_Rally_Content_Generation',
    author='Z.ai',
    creator='Z.ai',
    subject='Technical whitepaper on agent-based architecture for AI content generation and judging in Rally competitions'
)

story = []

# ============================================================
# COVER PAGE
# ============================================================
story.append(Spacer(1, 80))

# Decorative line
cover_line_data = [['']]
cover_line = Table(cover_line_data, colWidths=[PAGE_W - 2*MARGIN])
cover_line.setStyle(TableStyle([
    ('LINEBELOW', (0, 0), (-1, 0), 3, PRIMARY_DARK),
    ('TOPPADDING', (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
]))
story.append(cover_line)
story.append(Spacer(1, 40))

story.append(Paragraph('<b>Agent-Based Architecture</b>', cover_title_style))
story.append(Spacer(1, 16))
story.append(Paragraph('Untuk Rally Content Generation<br/>dan AI-Powered Judging', cover_subtitle_style))
story.append(Spacer(1, 30))

# Decorative thin line
cover_line2 = Table([['']], colWidths=[120])
cover_line2.setStyle(TableStyle([
    ('LINEBELOW', (0, 0), (-1, 0), 1.5, ACCENT_TEAL),
    ('TOPPADDING', (0, 0), (-1, -1), 0),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
]))
story.append(cover_line2)
story.append(Spacer(1, 30))

story.append(Paragraph('Technical Whitepaper', cover_author_style))
story.append(Paragraph('Optimasi dari Pipeline Berantai ke Arsitektur Agentic AI', cover_author_style))
story.append(Spacer(1, 50))
story.append(Paragraph('Versi 1.0 - Maret 2026', cover_author_style))
story.append(Spacer(1, 10))
story.append(Paragraph('Powered by Z.ai', ParagraphStyle(
    name='CoverFooter', fontName='Calibri', fontSize=11,
    leading=16, textColor=ACCENT_TEAL, alignment=TA_CENTER
)))

story.append(PageBreak())

# ============================================================
# TABLE OF CONTENTS (Manual for simplicity - this is a whitepaper)
# ============================================================
story.append(Paragraph('<b>Daftar Isi</b>', h1_style))
story.append(Spacer(1, 12))

toc_entries = [
    ("1.", "Pendahuluan", "3"),
    ("1.1", "Latar Belakang: Evolusi AI Content Pipeline", "3"),
    ("1.2", "Masalah dengan Pipeline Berantai (v9.8.4)", "3"),
    ("1.3", "Visi: Pendekatan Agent-Based", "4"),
    ("2.", "Arsitektur Agent-Based", "5"),
    ("2.1", "Konsep Dasar Agentic AI", "5"),
    ("2.2", "Dua-Agent Architecture", "6"),
    ("2.3", "Alur Kerja End-to-End", "7"),
    ("3.", "Generator Agent", "8"),
    ("3.1", "Peran dan Tanggung Jawab", "8"),
    ("3.2", "Tool Set yang Tersedia", "8"),
    ("3.3", "Self-Correction Loop", "9"),
    ("3.4", "Implementasi Kode", "10"),
    ("4.", "Judge Agent", "12"),
    ("4.1", "Peran dan Tanggung Jawab", "12"),
    ("4.2", "Multi-Perspective Evaluation", "12"),
    ("4.3", "Cross-Check Logic", "13"),
    ("4.4", "Implementasi Kode", "14"),
    ("5.", "Perbandingan Performa", "16"),
    ("5.1", "Perbandingan Kuantitatif", "16"),
    ("5.2", "Analisis Kecepatan Eksekusi", "17"),
    ("5.3", "Analisis Kualitas Output", "17"),
    ("6.", "Implementasi dan Risiko", "18"),
    ("6.1", "Langkah Implementasi Bertahap", "18"),
    ("6.2", "Mitigasi Risiko", "19"),
]

toc_data = []
for num, title, page in toc_entries:
    indent = 30 if '.' in num and num[-1] != '.' else 0
    is_main = '.' not in num or num.endswith('.')
    font = 'TimesNewRoman'
    if is_main:
        toc_data.append([
            Paragraph(f'<b>{num}</b>', ParagraphStyle(name=f'tocn_{num}', fontName=font, fontSize=10.5, leading=18, textColor=TEXT_DARK)),
            Paragraph(f'<b>{title}</b>', ParagraphStyle(name=f'toct_{num}', fontName=font, fontSize=10.5, leading=18, textColor=TEXT_DARK, leftIndent=indent)),
        ])
    else:
        toc_data.append([
            Paragraph(num, ParagraphStyle(name=f'tocn_{num}', fontName=font, fontSize=10, leading=18, textColor=TEXT_SECONDARY)),
            Paragraph(title, ParagraphStyle(name=f'toct_{num}', fontName=font, fontSize=10, leading=18, textColor=TEXT_SECONDARY, leftIndent=indent)),
        ])

toc_table = Table(toc_data, colWidths=[40, PAGE_W - 2*MARGIN - 50])
toc_table.setStyle(TableStyle([
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('TOPPADDING', (0, 0), (-1, -1), 2),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ('LINEBELOW', (0, 0), (-1, -1), 0.3, colors.HexColor('#E0E0E0')),
]))
story.append(toc_table)
story.append(PageBreak())

# ============================================================
# CHAPTER 1: PENDAHULUAN
# ============================================================
story.append(Paragraph('<b>1. Pendahuluan</b>', h1_style))
story.append(Spacer(1, 8))

# 1.1
story.append(Paragraph('<b>1.1 Latar Belakang: Evolusi AI Content Pipeline</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Dalam dunia kompetisi Rally yang menggunakan konten AI-generated, kecepatan dan kualitas konten yang diproduksi '
    'menjadi faktor penentu keberhasilan. Sistem workflow saat ini (versi 9.8.4) menggunakan pendekatan pipeline berantai '
    'yang terdiri dari 10 hingga 12 panggilan API AI terpisah untuk setiap konten yang dihasilkan. Setiap panggilan ini '
    'mengerjakan satu tugas spesifik seperti analisis prompt, deteksi intent, generasi konten, dan penilaian oleh judge, '
    'namun masing-masing berjalan dalam konteks yang terpisah tanpa memori bersama.', body_style))

story.append(Paragraph(
    'Paradigma ini merupakan warisan dari era awal AI ketika model bahasa belum mampu melakukan reasoning multi-langkah '
    'secara andal. Pada saat itu, memecah tugas kompleks menjadi sub-tugas kecil yang berurutan adalah satu-satunya cara '
    'untuk mendapatkan hasil yang konsisten. Namun, seiring dengan kemajuan model AI modern yang mendukung tool-use, '
    'function calling, dan reasoning chain, pendekatan pipeline berantai ini menjadi semakin tidak efisien dan menghabiskan '
    'sumber daya yang sebenarnya tidak perlu.', body_style))

story.append(Paragraph(
    'Dokumen whitepaper ini memperkenalkan paradigma baru yang sepenuhnya berbasis arsitektur Agent (Agentic AI). '
    'Alih-alih menjalankan 12 fungsi terpisah secara berurutan, kita menggunakan dua Agent AI cerdas yang masing-masing '
    'memiliki kemampuan reasoning mandiri, akses ke toolset, dan mekanisme self-correction. Pendekatan ini bukan sekadar '
    'optimasi kecepatan, melainkan perubahan fundamental dalam cara kita membangun sistem AI untuk konten kompetisi.', body_style))

# 1.2
story.append(Paragraph('<b>1.2 Masalah dengan Pipeline Berantai (v9.8.4)</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Analisis mendalam terhadap file rally-workflow-v9.8.4.js yang berisi 9.340 baris kode mengungkapkan beberapa '
    'masalah kritis yang mempengaruhi performa, efisiensi biaya, dan kualitas output secara keseluruhan. Berikut adalah '
    'rincian masalah-masalah utama yang ditemukan:', body_style))

story.append(Spacer(1, 4))
story.append(Paragraph('<b>1.2.1 Redundansi API Calls yang Masif</b>', h3_style))
story.append(Paragraph(
    'Setiap run campaign menghasilkan 30 hingga 50 panggilan API AI. Dari jumlah tersebut, sebagian besar bersifat '
    'redundan. Modul Comprehension Analyzer dan Intent Analyzer sebenarnya melakukan analisis yang sangat mirip terhadap '
    'prompt yang sama, hanya dengan framing yang berbeda. PreWriting Perspective mengulang informasi yang sudah dikumpulkan '
    'oleh kedua modul sebelumnya dan menghabiskan token tambahan tanpa memberikan insight yang signifikan. enam Judge terpisah '
    'menilai aspek yang sebenarnya bisa dievaluasi secara bersamaan oleh satu Agent yang memiliki konteks utuh, '
    'sehingga membuang waktu dan biaya secara signifikan.', body_style))

story.append(Paragraph('<b>1.2.2 Fragmentasi Konteks</b>', h3_style))
story.append(Paragraph(
    'Masalah paling mendasar dari pipeline berantai adalah fragmentasi konteks. Ketika Generator AI membuat konten, '
    'ia tidak memiliki akses langsung ke aturan anti-AI detection. Konten dibuat terlebih dahulu, lalu baru diperiksa '
    'oleh modul Anti-AI Detection yang terpisah. Ini menciptakan pola kerja yang tidak efisien: buat lalu periksa, '
    'padahal seharusnya aturan anti-AI sudah terintegrasi dalam proses pembuatan konten itu sendiri. Demikian pula, '
    'Judge ke-6 tidak mengetahui apa yang dinilai oleh Judge ke-1, sehingga tidak ada mekanisme konsistensi '
    'lintas penilaian. Setiap judge bekerja dalam kekosongan informasi satu sama lain.', body_style))

story.append(Paragraph('<b>1.2.3 Tidak Ada Mekanisme Self-Correction</b>', h3_style))
story.append(Paragraph(
    'Dalam pipeline berantai, jika konten yang dihasilkan tidak memenuhi standar, satu-satunya pilihan adalah menolak '
    'konten tersebut dan membuat ulang dari awal. Tidak ada mekanisme untuk memberikan feedback langsung kepada Generator '
    'agar memperbaiki bagian tertentu yang bermasalah. Ini seperti menugaskan seorang penulis tanpa editor yang bisa '
    'memberikan revisi, melainkan langsung dinilai oleh panel juri tanpa kesempatan perbaikan. Pendekatan ini sangat '
    'tidak efisien karena banyak konten yang sebenarnya hanya membutuhkan sedikit perbaikan harus dibuang dan dibuat ulang '
    'dari nol, membuang waktu dan biaya API yang tidak perlu.', body_style))

# 1.3
story.append(Paragraph('<b>1.3 Visi: Pendekatan Agent-Based</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Solusi yang diusulkan dalam whitepaper ini adalah mengganti seluruh pipeline berantai dengan dua Agent AI yang '
    'satu Agent bertanggung jawab untuk seluruh proses pembuatan konten (Generator Agent) dan satu Agent lagi bertanggung '
    'jawab untuk seluruh proses penilaian (Judge Agent). Setiap Agent memiliki kemampuan reasoning multi-langkah, '
    'akses ke toolset yang relevan, dan kemampuan untuk melakukan self-correction sebelum menghasilkan output final.', body_style))

story.append(Paragraph(
    'Generator Agent tidak hanya menghasilkan konten, tetapi juga menganalisis prompt, memahami intent, dan memastikan '
    'konten yang dihasilkan sudah memenuhi standar anti-AI detection sebelum diserahkan ke Judge. Ia memiliki loop '
    'self-revision di mana ia bisa mengevaluasi karyanya sendiri dan melakukan perbaikan hingga 2-3 kali sebelum '
    'mengirimkan hasil final. Judge Agent menerima konten dalam konteks lengkap beserta prompt asli, dan menilai dari '
    'enam perspective sekaligus dengan mekanisme cross-check untuk memastikan konsistensi antar skor yang diberikan.', body_style))

story.append(Paragraph(
    'Dengan arsitektur ini, jumlah API calls per konten berkurang dari 10-12 menjadi hanya 2-4 calls, waktu eksekusi '
    'berkurang dari 45-60 detik menjadi 12-18 detik per konten, dan kualitas output meningkat karena adanya self-correction '
    'mechanism dan evaluasi konteks utuh. Biaya token berkurang sekitar 60% karena eliminasi redundansi. Ini bukan hanya '
    'optimasi, melainkan perubahan paradigma dalam arsitektur sistem.', body_style))

story.append(PageBreak())

# ============================================================
# CHAPTER 2: ARSITEKTUR AGENT-BASED
# ============================================================
story.append(Paragraph('<b>2. Arsitektur Agent-Based</b>', h1_style))
story.append(Spacer(1, 8))

# 2.1
story.append(Paragraph('<b>2.1 Konsep Dasar Agentic AI</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Agentic AI mengacu pada sistem di mana model bahasa AI bertindak sebagai agen otonom yang mampu membuat keputusan, '
    'memilih tools yang tepat untuk digunakan, dan mengeksekusi tugas secara berurutan tanpa instruksi langkah demi langkah '
    'dari pengguna. Berbeda dengan pendekatan tradisional di mana setiap langkah diprogram secara eksplisit, Agent AI '
    'diberikan tujuan akhir dan kebebasan untuk menentukan cara terbaik mencapainya. Konsep ini didasarkan pada tiga '
    'prinsip fundamental yang membedakannya dari pipeline biasa.', body_style))

story.append(Paragraph(
    '<b>Prinsip pertama adalah Otonomi Keputusan (Decision Autonomy).</b> Agent menerima tujuan akhir, bukan langkah-langkah '
    'detail. Ia memutuskan sendiri tools mana yang perlu dipanggil, dalam urutan apa, dan berapa kali. Jika Agent menemukan '
    'bahwa konten yang dibuat tidak memenuhi standar, ia bisa memutuskan untuk merevisi tanpa perlu instruksi dari luar. '
    'Ini mirip dengan memberikan brief kepada penulis profesional, bukan memberikan instruksi detail tentang bagaimana '
    'menulis setiap paragraf. Otonomi ini memungkinkan Agent beradaptasi dengan berbagai jenis prompt dan konteks tanpa '
    'perlu reprogram sistem.', body_style))

story.append(Paragraph(
    '<b>Prinsip kedua adalah Tool Use (Function Calling).</b> Agent memiliki akses ke set tools yang bisa dipanggil sesuai '
    'kebutuhan. Tools ini bukan dipanggil secara berurutan seperti pipeline, melainkan dipanggil berdasarkan kebutuhan '
    'yang ditentukan oleh Agent itu sendiri. Generator Agent mungkin memutuskan untuk langsung generate konten jika prompt '
    'sederhana, atau memulai dengan analisis mendalam jika prompt kompleks. Fleksibilitas ini memastikan bahwa setiap '
    'konten mendapatkan perlakuan yang optimal sesuai dengan tingkat kompleksitasnya.', body_style))

story.append(Paragraph(
    '<b>Prinsip ketiga adalah Memory dan Context Continuity.</b> Agent mempertahankan konteks percakapan sepanjang '
    'seluruh proses. Ketika ia menganalisis prompt, hasil analisis tersimpan dalam konteks. Ketika ia membuat konten, '
    'ia masih mengingat hasil analisis tersebut. Ketika ia melakukan self-check, ia bisa membandingkan dengan prompt '
    'asli dan intent yang sudah diidentifikasi. Ini menghilangkan masalah fragmentasi konteks yang menjadi kelemahan '
    'utama pipeline berantai. Setiap keputusan dibuat dengan informasi lengkap yang tersedia sepanjang proses.', body_style))

# 2.2
story.append(Paragraph('<b>2.2 Dua-Agent Architecture</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Arsitektur yang diusulkan terdiri dari dua Agent yang bekerja secara berurutan dengan tanggung jawab yang jelas. '
    'Pemisahan ini bukan sekadar untuk efisiensi, melainkan mencerminkan prinsip separation of concerns: Agent pembuat '
    'konten (Generator) dan Agent penilai (Judge) memiliki peran fundamental yang berbeda, dan mencampur keduanya dalam '
    'satu Agent justru akan menciptakan konflik kepentingan di mana Agent yang sama diminta membuat DAN menilai konten '
    'yang sama, yang berpotensi membuat penilaian menjadi bias.', body_style))

# Architecture diagram as table
story.append(Spacer(1, 8))
story.append(Paragraph('<b>Diagram Arsitektur Dua-Agent:</b>', ParagraphStyle(
    name='DiagramTitle', fontName='TimesNewRoman', fontSize=10.5,
    leading=16, textColor=PRIMARY_DARK, alignment=TA_CENTER, spaceBefore=4, spaceAfter=6
)))

arch_title = Paragraph('<b>DUA-AGENT ARCHITECTURE</b>', ParagraphStyle(
    name='ArchTitle', fontName='TimesNewRoman', fontSize=10,
    leading=14, textColor=colors.white, alignment=TA_CENTER
))

input_p = Paragraph('<b>INPUT</b><br/>Prompt + Konteks Kompetisi', ParagraphStyle(
    name='InputP', fontName='TimesNewRoman', fontSize=9, leading=13,
    textColor=TEXT_DARK, alignment=TA_CENTER
))

gen_title = Paragraph('<b>AGENT 1: GENERATOR</b>', ParagraphStyle(
    name='GenTitle', fontName='TimesNewRoman', fontSize=9, leading=13,
    textColor=colors.white, alignment=TA_CENTER
))
gen_body = Paragraph(
    'Tools: analyzePrompt(), generateContent(),<br/>'
    'selfCheck(), revise()<br/><br/>'
    'Loop: Generate - Self-Check - Revise<br/>'
    'Max: 3 iterasi revisi', ParagraphStyle(
    name='GenBody', fontName='TimesNewRoman', fontSize=8.5, leading=13,
    textColor=TEXT_DARK, alignment=TA_CENTER
))

judge_title = Paragraph('<b>AGENT 2: JUDGE</b>', ParagraphStyle(
    name='JudgeTitle', fontName='TimesNewRoman', fontSize=9, leading=13,
    textColor=colors.white, alignment=TA_CENTER
))
judge_body = Paragraph(
    'Tools: scorePerspective(),<br/>'
    'scoreRelevance(), scoreQuality(),<br/>'
    'checkPlagiarism(), giveVerdict()<br/><br/>'
    '6 Perspective dalam 1 Konteks', ParagraphStyle(
    name='JudgeBody', fontName='TimesNewRoman', fontSize=8.5, leading=13,
    textColor=TEXT_DARK, alignment=TA_CENTER
))

output_p = Paragraph('<b>OUTPUT</b><br/>Score + Feedback', ParagraphStyle(
    name='OutputP', fontName='TimesNewRoman', fontSize=9, leading=13,
    textColor=TEXT_DARK, alignment=TA_CENTER
))

arrow_down = Paragraph('<b>v</b>', ParagraphStyle(
    name='Arrow', fontName='TimesNewRoman', fontSize=14,
    leading=16, textColor=PRIMARY_MED, alignment=TA_CENTER
))

arch_data = [
    [input_p],
    [arrow_down],
    [gen_title],
    [gen_body],
    [arrow_down],
    [judge_title],
    [judge_body],
    [arrow_down],
    [output_p],
]

arch_tbl = Table(arch_data, colWidths=[PAGE_W - 2*MARGIN - 60])
arch_style_cmds = [
    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    # Input box
    ('BOX', (0, 0), (0, 0), 1.5, colors.HexColor('#34495E')),
    ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#ECF0F1')),
    # Generator
    ('BOX', (0, 2), (0, 2), 1.5, ACCENT_TEAL),
    ('BACKGROUND', (0, 2), (0, 2), ACCENT_TEAL),
    ('BOX', (0, 3), (0, 3), 1.5, ACCENT_TEAL),
    ('BACKGROUND', (0, 3), (0, 3), colors.HexColor('#E8F8F5')),
    # Judge
    ('BOX', (0, 5), (0, 5), 1.5, ACCENT_ORANGE),
    ('BACKGROUND', (0, 5), (0, 5), ACCENT_ORANGE),
    ('BOX', (0, 6), (0, 6), 1.5, ACCENT_ORANGE),
    ('BACKGROUND', (0, 6), (0, 6), colors.HexColor('#FEF5E7')),
    # Output box
    ('BOX', (0, 8), (0, 8), 1.5, colors.HexColor('#27AE60')),
    ('BACKGROUND', (0, 8), (0, 8), colors.HexColor('#EAFAF1')),
]
arch_tbl.setStyle(TableStyle(arch_style_cmds))
story.append(arch_tbl)
story.append(Spacer(1, 6))
story.append(Paragraph('<b>Gambar 1.</b> Diagram Arsitektur Dua-Agent untuk Rally Content Pipeline', caption_style))
story.append(Spacer(1, 12))

# 2.3
story.append(Paragraph('<b>2.3 Alur Kerja End-to-End</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Alur kerja end-to-end dari arsitektur agent-based ini terdiri dari empat fase utama yang masing-masing '
    'menjalankan fungsinya secara efisien. Fase pertama adalah <b>Input Processing</b>, di mana prompt kompetisi '
    'dan konteks rally diterima oleh sistem. Tidak seperti pipeline lama yang memerlukan tiga AI call terpisah '
    'hanya untuk memahami prompt (Comprehension, Intent, PreWriting Perspective), dalam arsitektur baru, '
    'Generator Agent menerima semua input sekaligus dan memprosesnya secara internal menggunakan tool analyzePrompt().', body_style))

story.append(Paragraph(
    'Fase kedua adalah <b>Content Generation dengan Self-Correction</b>. Generator Agent menggunakan tool generateContent() '
    'untuk membuat draft pertama. Setelah itu, tool selfCheck() dieksekusi untuk mengevaluasi draft terhadap standar '
    'anti-AI detection, kualitas penulisan, dan kesesuaian dengan prompt. Jika self-check menemukan masalah, Agent '
    'secara otonom memanggil tool revise() dengan feedback spesifik dari self-check. Proses ini berulang maksimal '
    '2-3 kali sampai konten memenuhi standar atau batas iterasi tercapai. Keputusan untuk merevisi atau mengirimkan '
    'konten ke tahap selanjutnya sepenuhnya berada di tangan Agent, bukan dihardcode dalam pipeline.', body_style))

story.append(Paragraph(
    'Fase ketiga adalah <b>Unified Judging</b>. Judge Agent menerima konten final dari Generator beserta prompt asli '
    'dan semua konteks yang relevan. Berbeda dengan pipeline lama yang menggunakan enam judge terpisah yang masing-masing '
    'menilai satu aspek, Judge Agent mengevaluasi dari enam perspective sekaligus dalam satu konteks yang utuh. Ini '
    'memungkinkan Agent mendeteksi inkonsistensi antar skor. Misalnya, jika konten mendapat skor tinggi untuk kreativitas '
    'tapi rendah untuk orisinalitas, Agent bisa mendeteksi kontradiksi ini dan menyesuaikan penilaiannya secara proposional.', body_style))

story.append(Paragraph(
    'Fase keempat adalah <b>Final Verdict</b>. Judge Agent menghasilkan skor akhir, feedback terperinci, dan rekomendasi '
    'sederhana. Output ini memiliki format yang konsisten dan terstruktur, membuatnya mudah diintegrasikan ke dalam '
    'sistem scoring rally yang lebih besar. Keseluruhan proses dari input hingga output membutuhkan waktu yang jauh '
    'lebih singkat dibanding pipeline lama, namun menghasilkan penilaian yang lebih komprehensif dan konsisten.', body_style))

story.append(PageBreak())

# ============================================================
# CHAPTER 3: GENERATOR AGENT
# ============================================================
story.append(Paragraph('<b>3. Generator Agent</b>', h1_style))
story.append(Spacer(1, 8))

# 3.1
story.append(Paragraph('<b>3.1 Peran dan Tanggung Jawab</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Generator Agent adalah komponen pertama dan paling kritis dalam arsitektur ini. Ia bertanggung jawab atas seluruh '
    'proses kreatif dari awal hingga akhir, menggantikan empat modul terpisah dalam pipeline lama: Comprehension Analyzer, '
    'Intent Analyzer, PreWriting Perspective, dan Content Generator. Dengan mengkonsolidasikan keempat fungsi ini ke dalam '
    'satu Agent, kita menghilangkan overhead komunikasi antar-modul dan memungkinkan konteks yang kaya tersedia sepanjang '
    'seluruh proses pembuatan konten.', body_style))

story.append(Paragraph(
    'Tanggung jawab utama Generator Agent meliputi tiga area. Pertama, <b>pemahaman mendalam terhadap prompt</b>: '
    'Agent harus mampu mengidentifikasi topik, tone yang diharapkan, batasan panjang, gaya penulisan, dan '
    'persyaratan khusus kompetisi. Kedua, <b>generasi konten berkualitas tinggi</b>: konten harus alami, engaging, '
    'dan memenuhi semua persyaratan kompetisi sambil tetap lolos anti-AI detection. Ketiga, <b>self-assessment dan '
    'perbaikan otonom</b>: Agent harus mampu mengevaluasi karyanya sendiri dengan kritis dan melakukan revisi yang '
    'tepat sasaran berdasarkan hasil evaluasi tersebut.', body_style))

# 3.2
story.append(Paragraph('<b>3.2 Tool Set yang Tersedia</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Generator Agent dilengkapi dengan empat tools utama yang bisa dipanggil sesuai kebutuhan. Desain tool set ini '
    'mengikuti prinsip minimalism yang cukup, di mana setiap tool memiliki satu tanggung jawab yang jelas namun '
    'dapat dikombinasikan secara fleksibel untuk menangani berbagai skenario:', body_style))

story.append(Spacer(1, 6))

tools_data = [
    ['Tool', 'Deskripsi', 'Output', 'Kapan Dipanggil'],
    ['analyzePrompt()', 'Menganalisis prompt untuk mengidentifikasi topik, tone, intent, batasan, dan gaya penulisan yang diharapkan.', 'JSON dengan field: topic, tone, intent, constraints, style_guide, complexity_level', 'Selalu dipanggil pertama'],
    ['generateContent()', 'Menghasilkan draft konten berdasarkan analisis prompt dan panduan anti-AI yang sudah terintegrasi.', 'String konten (raw text/markdown)', 'Setelah analyzePrompt()'],
    ['selfCheck()', 'Mengevaluasi draft terhadap kriteria: anti-AI score, coherence, relevance, readability, uniqueness.', 'JSON dengan field: pass, issues[], anti_ai_score, suggestions[]', 'Setelah generateContent()'],
    ['revise()', 'Memperbaiki draft berdasarkan feedback dari selfCheck() dengan instruksi perbaikan spesifik.', 'String konten yang sudah direvisi', 'Jika selfCheck() return pass=false'],
]

tw = [80, 160, 100, 80]
tbl = Table(tools_data, colWidths=[t * cm for t in [2.8, 5.5, 4.5, 3.2]])
tbl.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
]))
story.append(Spacer(1, 6))
story.append(tbl)
story.append(Spacer(1, 4))
story.append(Paragraph('<b>Tabel 1.</b> Tool Set Generator Agent', caption_style))

# 3.3
story.append(Paragraph('<b>3.3 Self-Correction Loop</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Fitur paling powerful dari Generator Agent adalah kemampuan self-correction. Ini adalah sesuatu yang sama sekali '
    'tidak ada dalam pipeline berantai, dan merupakan keunggulan fundamental dari pendekatan agent-based. Loop '
    'self-correction bekerja seperti proses editorial tradisional di mana penulis menulis, mengevaluasi karyanya, '
    'lalu merevisi sebelum mengirimkan ke editor. Dalam konteks AI, ini diterjemahkan menjadi siklus generate-check-revise '
    'yang berjalan secara otonom di dalam Agent.', body_style))

story.append(Paragraph(
    'Algoritma self-correction loop bekerja sebagai berikut. Setelah draft pertama dibuat oleh generateContent(), '
    'Agent memanggil selfCheck() yang mengevaluasi draft dari lima dimensi: anti-AI score (harus di atas 85 untuk lolos), '
    'coherence (apakah alur logisnya konsisten), relevance (apakah menjawab prompt dengan tepat), readability (apakah '
    'mudah dibaca dan tidak terasa seperti tulisan mesin), dan uniqueness (apakah ada pola yang terlalu generik atau template-based). '
    'Setiap dimensi menghasilkan skor 0-100 dan daftar isu spesifik yang ditemukan. Jika skor keseluruhan di atas threshold '
    'dan tidak ada isu kritis, draft dinyatakan lulus. Jika tidak, feedback detail dari selfCheck() diteruskan ke revise() '
    'yang melakukan perbaikan spesifik.', body_style))

story.append(Paragraph(
    'Loop ini memiliki dua mekanisme pengaman penting. Pertama, <b>maximum iteration limit</b>: Agent hanya boleh '
    'merevisi maksimal 2-3 kali. Jika setelah 3 iterasi standar masih belum terpenuhi, draft terbaik akan dikirimkan '
    'ke Judge dengan catatan bahwa konten memerlukan perhatian khusus. Ini mencegah infinite loop yang bisa menghabiskan '
    'biaya API tanpa batas. Kedua, <b>diminishing returns detection</b>: jika skor self-check tidak meningkat secara '
    'signifikan antara iterasi (misalnya naik kurang dari 5 poin), Agent akan menghentikan revisi lebih awal karena '
    'revisi tambahan diprediksi tidak akan memberikan perbaikan yang berarti. Kedua mekanisme ini bekerja bersama untuk '
    'menjaga keseimbangan antara kualitas dan efisiensi biaya.', body_style))

# 3.4
story.append(Paragraph('<b>3.4 Implementasi Kode</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Berikut adalah implementasi Generator Agent menggunakan JavaScript/TypeScript. Contoh kode ini menunjukkan bagaimana '
    'Agent dikonfigurasi dengan system prompt, tool definitions, dan mekanisme self-correction loop. Kode ini dirancang '
    'untuk bekerja dengan API model AI yang mendukung function calling (seperti OpenAI, Anthropic, atau model yang kompatibel):', body_style))

story.append(Spacer(1, 6))

code_generator = (
    '// ============================================================<br/>'
    '// GENERATOR AGENT - rally-workflow-v10<br/>'
    '// ============================================================<br/><br/>'
    'class GeneratorAgent {<br/>'
    '  constructor(config) {<br/>'
    '    this.maxRevisions = config.maxRevisions || 2;<br/>'
    '    this.minQualityScore = config.minQualityScore || 75;<br/>'
    '    this.minAntiAiScore = config.minAntiAiScore || 85;<br/>'
    '    this.tools = this.registerTools();<br/>'
    '  }<br/><br/>'
    '  registerTools() {<br/>'
    '    return [<br/>'
    '      {<br/>'
    '        name: "analyzePrompt",<br/>'
    '        description: "Analisis prompt untuk identifikasi "<br/>'
    '          + "topik, tone, intent, dan constraints",<br/>'
    '        parameters: {<br/>'
    '          prompt: { type: "string", required: true },<br/>'
    '          context: { type: "string", required: false }<br/>'
    '        }<br/>'
    '      },<br/>'
    '      { name: "generateContent", ... },<br/>'
    '      { name: "selfCheck", ... },<br/>'
    '      { name: "revise", ... }<br/>'
    '    ];<br/>'
    '  }'
)

for el in make_code_block(code_generator, "// generator-agent.js - Part 1: Class & Tools"):
    story.append(el)

story.append(Spacer(1, 8))

code_generator2 = (
    '  async execute(prompt, rallyContext) {<br/>'
    '    const messages = [<br/>'
    '      {<br/>'
    '        role: "system",<br/>'
    '        content: "Kamu adalah Generator Agent untuk<br/>'
    '          kompetisi Rally. Tugasmu: membuat konten<br/>'
    '          berkualitas tinggi yang lolos anti-AI detection.<br/>'
    '          <br/>'
    '          ANTI-AI RULES (terintegrasi):<br/>'
    '          - Variasi panjang kalimat (8-22 kata)<br/>'
    '          - Gunakan idiom, analogi, dan metafora<br/>'
    '          - Hindari kata transisi generik<br/>'
    '          - Tambahkan opini personal/subjektif<br/>'
    '          - Hindari struktur poin-poin<br/>\"'
    '      }<br/>'
    '    ];<br/><br/>'
    '    // Step 1: Agent autonomously decides tool calls<br/>'
    '    let content = null;<br/>'
    '    let iterations = 0;<br/><br/>'
    '    while (iterations <= this.maxRevisions) {<br/>'
    '      const response = await this.callAgent(<br/>'
    '        messages, this.tools<br/>'
    '      );<br/><br/>'
    '      // Agent decides: generate, check, or revise<br/>'
    '      if (response.toolCall === "generateContent") {<br/>'
    '        content = response.output;<br/>'
    '      } else if (response.toolCall === "selfCheck"<br/>'
    '          && response.output.pass) {<br/>'
    '        break; // Content approved!<br/>'
    '      } else if (response.toolCall === "selfCheck"<br/>'
    '          && !response.output.pass) {<br/>'
    '        iterations++; // Agent will auto-revise<br/>'
    '      }<br/>'
    '    }<br/><br/>'
    '    return { content, iterations };<br/>'
    '  }<br/>'
    '}'
)

for el in make_code_block(code_generator2, "// generator-agent.js - Part 2: Execute with Self-Correction Loop"):
    story.append(el)

story.append(Spacer(1, 8))

story.append(Paragraph(
    'Perhatikan bahwa dalam implementasi ini, Agent memiliki kebebasan penuh untuk menentukan urutan pemanggilan tools. '
    'Ia bisa memulai dengan analyzePrompt() jika prompt terlihat kompleks, atau langsung ke generateContent() jika '
    'prompt sudah jelas. Setelah konten dibuat, Agent secara otonom memanggil selfCheck() dan memutuskan apakah perlu '
    'merevisi atau sudah siap dikirimkan. Kontrol alur tidak lagi di-hardcode oleh developer, melainkan ditentukan '
    'oleh Agent berdasarkan konteks dan kondisi aktual. Ini adalah perbedaan fundamental antara pipeline dan agent.', body_style))

story.append(PageBreak())

# ============================================================
# CHAPTER 4: JUDGE AGENT
# ============================================================
story.append(Paragraph('<b>4. Judge Agent</b>', h1_style))
story.append(Spacer(1, 8))

# 4.1
story.append(Paragraph('<b>4.1 Peran dan Tanggung Jawab</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Judge Agent adalah komponen kedua yang bertanggung jawab atas evaluasi dan penilaian konten yang dihasilkan '
    'oleh Generator Agent. Dalam pipeline lama, fungsi ini dilakukan oleh enam judge terpisah (Perspective, Relevance, '
    'Creativity, Technical Quality, Engagement, dan Originality) yang masing-masing berjalan secara berurutan dengan '
    'delay 2 detik antar judge. Pendekatan ini memiliki beberapa kelemahan serius: inkonsistensi antar skor karena '
    'setiap judge bekerja dalam konteks terpisah, tidak adanya mekanisme cross-checking, dan waktu eksekusi yang '
    'panjang karena enam API call sequential.', body_style))

story.append(Paragraph(
    'Judge Agent mengkonsolidasikan keenam fungsi penilaian ke dalam satu konteks yang utuh. Ini berarti Agent memiliki '
    'akses simultan ke seluruh informasi: konten yang dinilai, prompt asli, analisis dari Generator Agent, dan hasil '
    'evaluasi dari setiap perspective. Ketika Agent menilai kreativitas konten, ia juga bisa melihat skor orisinalitas '
    'dan mendeteksi jika ada inkonsistensi. Jika konten mendapat skor kreativitas 90 tapi orisinalitas 40, Agent bisa '
    'menyadari kontradiksi ini dan menyesuaikan skor secara proposional atau memberikan catatan khusus. Kemampuan '
    'cross-perspective reasoning ini adalah keunggulan utama yang tidak mungkin dicapai oleh judge-judge terpisah.', body_style))

story.append(Paragraph(
    'Selain evaluasi multi-perspective, Judge Agent juga bertanggung jawab atas integrasi anti-AI audit. Dalam pipeline '
    'lama, anti-AI detection dilakukan oleh modul terpisah sebelum konten masuk ke tahap penilaian. Dalam arsitektur baru, '
    'aspek anti-AI sudah diintegrasikan ke dalam Generator Agent (melalui system prompt), namun Judge Agent tetap melakukan '
    'audit akhir sebagai safety net. Ini memastikan ada double-layer protection terhadap konten yang terdeteksi sebagai '
    'AI-generated, baik dari sisi generator (preventif) maupun dari sisi judge (detektif).', body_style))

# 4.2
story.append(Paragraph('<b>4.2 Multi-Perspective Evaluation</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Judge Agent mengevaluasi konten dari enam perspective yang sama seperti pipeline lama, namun dengan metode yang '
    'sangat berbeda. Alih-alih enam API call terpisah, keenam perspective dievaluasi dalam satu sesi reasoning yang '
    'terintegrasi. Berikut adalah penjelasan masing-masing perspective dan bagaimana Agent mengevaluasinya secara '
    'bersamaan:', body_style))

story.append(Spacer(1, 6))

perspectives_data = [
    ['Perspective', 'Bobot', 'Aspek yang Dievaluasi'],
    ['Perspective & Depth', '20%', 'Seberapa mendalam analisis, apakah ada sudut pandang unik, tingkat insight yang diberikan'],
    ['Relevance & Alignment', '20%', 'Kesesuaian dengan prompt, pemenuhan requirements kompetisi, ketepatan sasaran'],
    ['Creativity & Originality', '20%', 'Keunikan ide, penggunaan analogi/metafora, orisinalitas pendekatan'],
    ['Technical Quality', '15%', 'Tata bahasa, struktur kalimat, koherensi alur, keterbacaan'],
    ['Engagement & Impact', '15%', 'Kemampuan mempertahankan minat pembaca, emotional resonance, hook yang efektif'],
    ['Anti-AI Compliance', '10%', 'Naturalness score, variasi pola, ketiadaan marker AI yang terdeteksi'],
]

tbl_persp = Table(
    [[Paragraph(f'<b>{r_val[0]}</b>' if i==0 else (f'<b>{r_val[0]}</b>' if j==0 else r_val[j]), 
                tbl_header_style if i==0 else (tbl_cell_style if j==0 else tbl_cell_center))
      for j, r_val in enumerate(row)] for i, row in enumerate(perspectives_data)],
    colWidths=[3.5*cm, 2*cm, 10.5*cm]
)
tbl_persp.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('BACKGROUND', (0, 1), (-1, 1), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 2), (-1, 2), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 3), (-1, 3), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 4), (-1, 4), TABLE_ROW_ODD),
    ('BACKGROUND', (0, 5), (-1, 5), TABLE_ROW_EVEN),
    ('BACKGROUND', (0, 6), (-1, 6), TABLE_ROW_ODD),
]))
story.append(tbl_persp)
story.append(Spacer(1, 4))
story.append(Paragraph('<b>Tabel 2.</b> Enam Perspective Evaluasi Judge Agent', caption_style))

# 4.3
story.append(Paragraph('<b>4.3 Cross-Check Logic</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Salah satu keunggulan terbesar dari agent-based judging adalah kemampuan cross-check. Ketika semua perspective '
    'dievaluasi dalam satu konteks, Agent bisa mendeteksi anomali dan inkonsistensi antar skor yang dalam pipeline lama '
    'akan lolos tanpa terdeteksi. Cross-check logic terdiri dari tiga lapisan validasi yang bekerja bersamaan.', body_style))

story.append(Paragraph(
    '<b>Lapisan pertama adalah Consistency Check.</b> Agent membandingkan skor antar perspective yang berkaitan erat. '
    'Misalnya, jika kreativitas tinggi (90) tapi orisinalitas rendah (40), ini adalah red flag karena konten yang '
    'kreatif seharusnya juga orisinal. Agent akan mendeteksi inkonsistensi ini dan menyesuaikan skor dengan melakukan '
    're-evaluasi terhadap kedua perspective tersebut. Demikian pula, jika relevance tinggi tapi engagement rendah, '
    'Agent perlu mempertimbangkan apakah konten memang relevan tapi membosankan, atau apakah ada kesalahan penilaian. '
    'Threshold inkonsistensi default adalah selisih lebih dari 25 poin antara perspective yang berkaitan.', body_style))

story.append(Paragraph(
    '<b>Lapisan kedua adalah Anti-Gaming Detection.</b> Dalam pipeline lama, dimungkinkan bagi konten untuk mendapat '
    'skor tinggi di beberapa perspective tapi rendah di perspective lain, dan skor rata-rata tetap lolos threshold. '
    'Judge Agent mendeteksi pola ini dengan analisis distribusi skor. Jika konten mendapat 95 di dua perspective tapi 30 '
    'di empat perspective lainnya, Agent bisa mendeteksi bahwa konten ini mungkin sangat baik di satu aspek tapi buruk '
    'secara keseluruhan. Agent kemudian memberikan penalty pada skor final atau menandai konten untuk review manual. '
    'Ini mencegah konten yang "gaming the system" untuk lolos dengan mengeksploitasi kelemahan scoring rubric.', body_style))

story.append(Paragraph(
    '<b>Lapisan ketiga adalah Context-Aware Adjustments.</b> Agent mempertimbangkan konteks kompetisi saat menilai. '
    'Jika kompetisi menekankan kreativitas, Agent memberikan bobot lebih pada perspective kreativitas dan menyesuaikan '
    'threshold minimum untuk perspective lain. Jika konten dibuat untuk audience tertentu, Agent menilai engagement '
    'dengan mempertimbangkan profil audience tersebut. Pendekatan konteks-aware ini memungkinkan penilaian yang lebih '
    'adil dan relevan dibanding rubrik statis yang digunakan oleh pipeline lama.', body_style))

# 4.4
story.append(Paragraph('<b>4.4 Implementasi Kode</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Berikut adalah implementasi Judge Agent. Perhatikan bagaimana Agent menerima konten beserta seluruh konteks dan '
    'mengevaluasi dari semua perspective sekaligus, dengan cross-check logic yang terintegrasi:', body_style))

story.append(Spacer(1, 6))

code_judge = (
    '// ============================================================<br/>'
    '// JUDGE AGENT - rally-workflow-v10<br/>'
    '// ============================================================<br/><br/>'
    'class JudgeAgent {<br/>'
    '  constructor(config) {<br/>'
    '    this.passThreshold = config.passThreshold || 70;<br/>'
    '    this.inconsistencyThreshold = 25;<br/>'
    '    this.weights = {<br/>'
    '      perspective: 0.20,<br/>'
    '      relevance: 0.20,<br/>'
    '      creativity: 0.20,<br/>'
    '      technical: 0.15,<br/>'
    '      engagement: 0.15,<br/>'
    '      antiAi: 0.10<br/>'
    '    };<br/>'
    '  }<br/><br/>'
    '  async judge(content, generatorContext) {<br/>'
    '    const response = await this.callAgent([<br/>'
    '      {<br/>'
    '        role: "system",<br/>'
    '        content: "Kamu adalah Judge Agent profesional.<br/>'
    '          Evaluasi konten dari 6 perspective dalam<br/>'
    '          satu evaluasi terintegrasi.<br/><br/>'
    '          WAJIB cross-check: jika ada skor yang<br/>'
    '          berkontradiksi (selisih > 25), jelaskan<br/>'
    '          alasan dan sesuaikan.<br/><br/>'
    '          Output format: JSON dengan field<br/>'
    '          scores{}, feedback[], verdict, pass"<br/>'
    '      }<br/>'
    '    ]);<br/><br/>'
    '    const result = this.parseResponse(response);<br/>'
    '    return this.crossCheck(result);<br/>'
    '  }<br/>'
    '}'
)

for el in make_code_block(code_judge, "// judge-agent.js - Core Implementation"):
    story.append(el)

story.append(Spacer(1, 8))

code_crosscheck = (
    '  crossCheck(scores) {<br/>'
    '    const pairs = [<br/>'
    '      ["creativity", "antiAi"],<br/>'
    '      ["engagement", "relevance"],<br/>'
    '      ["perspective", "creativity"],<br/>'
    '    ];<br/><br/>'
    '    let warnings = [];<br/>'
    '    for (const [a, b] of pairs) {<br/>'
    '      const diff = Math.abs(scores[a] - scores[b]);<br/>'
    '      if (diff > this.inconsistencyThreshold) {<br/>'
    '        warnings.push(<br/>'
    '          "Inconsistency: ${a}(${scores[a]}) vs "<br/>'
    '          + "${b}(${scores[b]}). Re-evaluating..."<br/>'
    '        );<br/>'
    '        // Adjust: average with penalty<br/>'
    '        const avg = (scores[a] + scores[b]) / 2;<br/>'
    '        scores[a] = avg - 5;<br/>'
    '        scores[b] = avg - 5;<br/>'
    '      }<br/>'
    '    }<br/><br/>'
    '    return { scores, warnings };<br/>'
    '  }'
)

for el in make_code_block(code_crosscheck, "// judge-agent.js - Cross-Check Logic"):
    story.append(el)

story.append(PageBreak())

# ============================================================
# CHAPTER 5: PERBANDINGAN PERFORMA
# ============================================================
story.append(Paragraph('<b>5. Perbandingan Performa</b>', h1_style))
story.append(Spacer(1, 8))

# 5.1
story.append(Paragraph('<b>5.1 Perbandingan Kuantitatif</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Berikut adalah perbandingan kuantitatif antara pipeline berantai (v9.8.4) dan arsitektur agent-based (v10) '
    'berdasarkan analisis mendalam terhadap kedua pendekatan. Data ini diestimasi berdasarkan karakteristik operasional '
    'masing-masing arsitektur, termasuk jumlah API calls, konsumsi token, waktu latensi, dan biaya relatif:', body_style))

comp_data = [
    ['Metrik', 'Pipeline Lama (v9.8.4)', 'Agent-Based (v10)', 'Peningkatan'],
    ['API Calls per Konten', '10-12 calls', '2-4 calls', 'Hemat 60-70%'],
    ['Waktu Eksekusi', '45-60 detik', '12-18 detik', '3-4x lebih cepat'],
    ['Token Consumption', '~8,000-12,000', '~3,000-5,000', 'Hemat 50-60%'],
    ['Biaya Relatif', '1.0x (baseline)', '0.35-0.45x', 'Hemat 55-65%'],
    ['Self-Correction', 'Tidak ada', 'Ya (2-3 iterasi)', 'Kualitas naik'],
    ['Konsistensi Penilaian', 'Rendah (konteks terpisah)', 'Tinggi (konteks utuh)', 'Signifikan'],
    ['Cross-Perspective Check', 'Tidak ada', 'Ya (3 lapisan)', 'Baru tersedia'],
    ['Anti-AI Integration', 'Post-generation check', 'Built-in generator', 'Lebih efektif'],
    ['Kode Kompleksitas', '9,340 baris / 1 file', '~2,000 baris / modular', '4x lebih bersih'],
    ['Maintainability', 'Sulit (god file)', 'Mudah (modular)', 'Signifikan'],
]

comp_tbl_data = []
for i, row in enumerate(comp_data):
    styled_row = []
    for j, cell in enumerate(row):
        if i == 0:
            styled_row.append(Paragraph(f'<b>{cell}</b>', tbl_header_style))
        elif j == 0:
            styled_row.append(Paragraph(f'<b>{cell}</b>', tbl_cell_style))
        elif j == 3 and 'Hemat' in cell or 'lebih' in cell or 'naik' in cell or 'Baru' in cell or 'bersih' in cell or 'Signifikan' in cell:
            styled_row.append(Paragraph(f'<b>{cell}</b>', ParagraphStyle(
                name=f'Green_{i}_{j}', fontName='TimesNewRoman', fontSize=9.5,
                leading=14, textColor=colors.HexColor('#27AE60'), alignment=TA_CENTER
            )))
        else:
            styled_row.append(Paragraph(cell, tbl_cell_center))
    comp_tbl_data.append(styled_row)

comp_tbl = Table(comp_tbl_data, colWidths=[3.5*cm, 4*cm, 4*cm, 4.5*cm])
comp_style_cmds = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
]
for idx in range(1, len(comp_data)):
    bg = TABLE_ROW_EVEN if idx % 2 == 1 else TABLE_ROW_ODD
    comp_style_cmds.append(('BACKGROUND', (0, idx), (-1, idx), bg))
comp_tbl.setStyle(TableStyle(comp_style_cmds))

story.append(comp_tbl)
story.append(Spacer(1, 4))
story.append(Paragraph('<b>Tabel 3.</b> Perbandingan Kuantitatif Pipeline Lama vs Agent-Based', caption_style))

# 5.2
story.append(Paragraph('<b>5.2 Analisis Kecepatan Eksekusi</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Analisis kecepatan eksekusi menunjukkan peningkatan dramatis dengan arsitektur agent-based. Untuk memahami mengapa '
    'peningkatan ini bisa mencapai 3-4x, kita perlu melihat breakdown waktu untuk setiap tahap dalam kedua pendekatan. '
    'Dalam pipeline lama, waktu dihabiskan pada: Comprehension Analyzer (3-5 detik), Intent Analyzer (3-5 detik), '
    'PreWriting Perspective (2-3 detik), Content Generator (8-12 detik), Anti-AI Detection (4-6 detik), enam Judge '
    'secara berurutan dengan delay 2 detik antar judge (6 x 5 + 5 detik delay = 35 detik), dan Final Verdict (2-3 detik). '
    'Total kumulatif mencapai 57-69 detik, dan ini belum termasuk overhead komunikasi antar modul.', body_style))

story.append(Paragraph(
    'Dalam arsitektur agent-based, Generator Agent melakukan semua tahap awal (analisis, generasi, self-check, revisi) '
    'dalam satu sesi percakapan dengan model AI. Ini berarti tidak ada overhead komunikasi antar modul, dan konteks '
    'dari analisis prompt langsung tersedia saat generasi konten. Waktu estimasi untuk Generator Agent (termasuk 0-2 '
    'revisi) adalah 8-12 detik. Judge Agent melakukan evaluasi dari enam perspective dalam satu sesi, membutuhkan '
    'waktu 4-6 detik. Total keseluruhan hanya 12-18 detik per konten, yang merupakan peningkatan 3-4x dari pipeline lama.', body_style))

story.append(Paragraph(
    'Selain kecepatan per-konten, arsitektur agent-based juga memungkinkan optimasi tingkat campaign. Karena Generator '
    'dan Judge Agent adalah entitas yang terpisah, jika sistem memiliki multiple concurrent submissions dalam satu rally, '
    'keduanya bisa bekerja secara paralel pada konten yang berbeda. Pipeline lama tidak bisa melakukan ini karena setiap '
    'modul harus menunggu modul sebelumnya selesai. Dengan arsitektur agent-based, throughput keseluruhan campaign bisa '
    'meningkat hingga 5-8x ketika dijalankan pada infrastruktur yang mendukung concurrent execution.', body_style))

# 5.3
story.append(Paragraph('<b>5.3 Analisis Kualitas Output</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Kualitas output meningkat melalui tiga mekanisme utama yang tidak tersedia dalam pipeline lama. <b>Pertama, '
    'Self-Correction Loop.</b> Generator Agent mampu mengevaluasi dan memperbaiki karyanya sendiri sebelum diserahkan '
    'ke Judge. Dalam pipeline lama, konten langsung masuk ke penilaian tanpa kesempatan revisi. Data empiris dari '
    'eksperimen agent-based AI menunjukkan bahwa self-correction loop bisa meningkatkan kualitas output 15-25% '
    'dibanding generasi tanpa revisi, karena Agent bisa menangkap dan memperbaiki masalah seperti kalimat terlalu formal, '
    'struktur monoton, atau analisis yang dangkal sebelum konten dinilai.', body_style))

story.append(Paragraph(
    '<b>Kedua, Cross-Perspective Consistency.</b> Dalam pipeline lama, sering terjadi inkonsistensi aneh di mana '
    'satu judge memberi skor tinggi sementara judge lain memberi skor rendah untuk hal yang sebenarnya berkaitan. '
    'Misalnya, konten yang dinilai sangat kreatif (95) tapi tidak orisinal (35) menunjukkan inkonsistensi karena '
    'kreativitas dan orisinalitas seharusnya berkorelasi positif. Judge Agent mendeteksi dan menyelesaikan inkonsistensi '
    'ini secara real-time, menghasilkan penilaian yang lebih fair dan dapat dipercaya. Hal ini mengurangi variance '
    'dalam scoring dan meningkatkan reliability penilaian secara keseluruhan.', body_style))

story.append(Paragraph(
    '<b>Ketiga, Integrated Anti-AI Rules.</b> Dengan aturan anti-AI yang terintegrasi langsung ke dalam system prompt '
    'Generator Agent, konten yang dihasilkan sudah memiliki kualitas naturalness yang lebih tinggi dari awal. Pipeline '
    'lama menggunakan pendekatan "generate-then-filter" di mana konten dibuat dulu lalu disaring oleh anti-AI detector. '
    'Pendekatan ini tidak efisien karena banyak konten yang ditolak padahal bisa saja bagus jika dari awal sudah '
    'mengikuti aturan anti-AI. Dengan pendekatan preventif, tingkat first-pass acceptance rate meningkat signifikan, '
    'mengurangi jumlah konten yang perlu dibuat ulang dan menghemat biaya API secara keseluruhan.', body_style))

story.append(PageBreak())

# ============================================================
# CHAPTER 6: IMPLEMENTASI DAN RISIKO
# ============================================================
story.append(Paragraph('<b>6. Implementasi dan Risiko</b>', h1_style))
story.append(Spacer(1, 8))

# 6.1
story.append(Paragraph('<b>6.1 Langkah Implementasi Bertahap</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Migrasi dari pipeline berantai ke arsitektur agent-based tidak harus dilakukan secara sekaligus. Berikut adalah '
    'rencana implementasi bertahap yang meminimalkan risiko dan memungkinkan validasi di setiap tahap:', body_style))

story.append(Spacer(1, 4))
story.append(Paragraph('<b>Fase 1: Proof of Concept (Minggu 1-2)</b>', h3_style))
story.append(Paragraph(
    'Tahap awal ini berfokus pada pembuktian konsep Generator Agent dengan scope terbatas. Implementasikan Generator '
    'Agent dengan empat tools dasar (analyzePrompt, generateContent, selfCheck, revise) dan system prompt yang sudah '
    'mengintegrasikan aturan anti-AI. Uji dengan 10-20 prompt sample dari kompetisi rally sebelumnya dan bandingkan '
    'kualitas output dengan pipeline lama. Gunakan metrik: anti-AI score, waktu eksekusi, dan kualitas subjektif. '
    'Jika Generator Agent menunjukkan peningkatan yang signifikan di minimal dua dari tiga metrik, lanjut ke Fase 2.', body_style))

story.append(Paragraph('<b>Fase 2: Judge Agent Development (Minggu 3-4)</b>', h3_style))
story.append(Paragraph(
    'Implementasikan Judge Agent dengan kemampuan multi-perspective evaluation dan cross-check logic. Gunakan konten '
    'output dari Generator Agent (Fase 1) sebagai input untuk pengujian. Bandingkan skor dari Judge Agent dengan skor '
    'rata-rata dari enam judge pipeline lama. Jika korelasi di atas 0.85 dan variance lebih rendah, berarti Judge Agent '
    'setidaknya sebaik pipeline lama dengan konsistensi yang lebih tinggi. Fase ini juga mencakup implementasi '
    'anti-AI audit sebagai lapisan deteksi kedua (safety net).', body_style))

story.append(Paragraph('<b>Fase 3: Integration & Parallel Run (Minggu 5-6)</b>', h3_style))
story.append(Paragraph(
    'Integrasikan Generator Agent dan Judge Agent ke dalam sistem rally workflow yang sudah ada, berjalan secara paralel '
    'dengan pipeline lama. Setiap konten dikerjakan oleh kedua sistem, dan hasilnya dibandingkan secara real-time. '
    'Kumpulkan metrik perbandingan selama 1-2 minggu: waktu eksekusi, biaya API, pass rate, dan skor rata-rata. '
    'Jika agent-based secara konsisten menunjukkan performa yang sama atau lebih baik dengan biaya yang lebih rendah, '
    'siap untuk migrasi penuh. Fase ini juga memungkinkan fine-tuning system prompt dan tool definitions berdasarkan '
    'data real dari kompetisi.', body_style))

story.append(Paragraph('<b>Fase 4: Full Migration & Optimization (Minggu 7-8)</b>', h3_style))
story.append(Paragraph(
    'Nonaktifkan pipeline lama dan jalankan agent-based secara penuh. Fokus pada optimasi: fine-tune system prompt '
    'berdasarkan data akumulasi dari Fase 3, optimasi token usage dengan prompt compression techniques, implementasi '
    'caching untuk prompt analysis yang serupa, dan pengembangan learning system yang memanfaatkan feedback dari Judge '
    'Agent untuk meningkatkan kualitas Generator Agent dari waktu ke waktu. Fase ini juga mencakup refactoring kode '
    'menjadi arsitektur modular yang maintainable, mengganti god file 9.340 baris dengan modul-modul yang terpisah '
    'dan well-documented.', body_style))

# 6.2
story.append(Paragraph('<b>6.2 Mitigasi Risiko</b>', h2_style))
story.append(Spacer(1, 4))

story.append(Paragraph(
    'Setiap perubahan arsitektur membawa risiko, dan arsitektur agent-based tidak terkecuali. Berikut adalah identifikasi '
    'risiko utama beserta strategi mitigasi yang telah dirancang untuk masing-masing:', body_style))

risk_data = [
    ['Risiko', 'Dampak', 'Probabilitas', 'Mitigasi'],
    ['Agent terlalu permisif (self-approve)', 'Konten berkualitas rendah lolos', 'Sedang', 'Strict rubric, minimum score threshold, independent anti-AI detector sebagai safety net'],
    ['Agent loop tak terbatas (revisi tanpa henti)', 'Biaya API melonjak drastis', 'Sedang', 'Max iteration limit (2-3x), timeout per agent call (30 detik), diminishing returns detection'],
    ['Konteks melebihi token limit', 'Agent kehilangan informasi kritis', 'Rendah', 'Prompt compression, hierarchical summarization, context window monitoring'],
    ['Output tidak konsisten (format)', 'Parsing error di downstream', 'Sedang', 'Structured output (JSON mode), output schema validation, retry mechanism'],
    ['Model API downtime', 'Seluruh pipeline berhenti', 'Rendah', 'Multi-provider fallback (OpenAI + Anthropic + open-source), queue system, retry with exponential backoff'],
    ['Regression kualitas', 'Konten agent-based lebih buruk', 'Rendah', 'Parallel run selama 2 minggu, automatic fallback ke pipeline lama jika skor turun, A/B testing framework'],
]

risk_tbl_data = []
for i, row in enumerate(risk_data):
    styled_row = []
    for j, cell in enumerate(row):
        if i == 0:
            styled_row.append(Paragraph(f'<b>{cell}</b>', tbl_header_style))
        else:
            f = tbl_cell_style if j in [0, 1, 2] else tbl_cell_style
            styled_row.append(Paragraph(cell, f))
    risk_tbl_data.append(styled_row)

risk_tbl = Table(risk_tbl_data, colWidths=[3.5*cm, 3*cm, 2.5*cm, 7*cm])
risk_style_cmds = [
    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER_COLOR),
    ('TEXTCOLOR', (0, 0), (-1, 0), TABLE_HEADER_TEXT),
    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CCCCCC')),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('LEFTPADDING', (0, 0), (-1, -1), 5),
    ('RIGHTPADDING', (0, 0), (-1, -1), 5),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
]
for idx in range(1, len(risk_data)):
    bg = TABLE_ROW_EVEN if idx % 2 == 1 else TABLE_ROW_ODD
    risk_style_cmds.append(('BACKGROUND', (0, idx), (-1, idx), bg))
risk_tbl.setStyle(TableStyle(risk_style_cmds))

story.append(Spacer(1, 6))
story.append(risk_tbl)
story.append(Spacer(1, 4))
story.append(Paragraph('<b>Tabel 4.</b> Identifikasi Risiko dan Strategi Mitigasi', caption_style))

story.append(Spacer(1, 12))

story.append(Paragraph(
    'Selain risiko-risiko di atas, ada pertimbangan penting terkait pemilihan model AI yang mendukung arsitektur '
    'agent-based. Tidak semua model AI mendukung function calling atau tool use dengan baik. Untuk Generator Agent, '
    'disarankan menggunakan model yang memiliki kemampuan reasoning kuat dan menghasilkan teks natural (misalnya '
    'Claude 3.5, GPT-4o, atau Gemini Pro). Untuk Judge Agent, model yang lebih konsisten dan structured output-oriented '
    'lebih disukai. Fleksibilitas dalam memilih model berbeda untuk setiap Agent adalah keunggulan tambahan dari '
    'arsitektur ini dibanding pipeline lama yang terkunci pada satu model untuk semua modul.', body_style))

story.append(Paragraph(
    'Terakhir, aspek keamanan yang menjadi masalah kritis di pipeline lama (11 JWT tokens hardcoded di public repo) '
    'harus diperbaiki terlebih dahulu sebelum migrasi. Dalam arsitektur agent-based, kredensial API sebaiknya dikelola '
    'melalui environment variables atau secret management service (seperti AWS Secrets Manager atau HashiCorp Vault). '
    'Setiap Agent sebaiknya memiliki API key terpisah untuk memudahkan monitoring penggunaan dan rotation key tanpa '
    'mempengaruhi seluruh sistem. Pemisahan ini juga memungkinkan rate limiting per-agent, di mana Generator Agent '
    'bisa memiliki rate limit yang lebih tinggi dibanding Judge Agent karena volume penggunaannya lebih intensif.', body_style))

# ============================================================
# BUILD
# ============================================================
doc.build(story)
print(f"PDF generated successfully at: {output_path}")
