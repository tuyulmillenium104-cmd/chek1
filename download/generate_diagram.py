import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import numpy as np

fig, ax = plt.subplots(1, 1, figsize=(14, 9))
ax.set_xlim(0, 14)
ax.set_ylim(0, 9.5)
ax.axis('off')
fig.patch.set_facecolor('white')

# Colors
C_INPUT = '#34495E'
C_P0 = '#00B0A0'
C_P1 = '#2980B9'
C_OPT = '#27AE60'
C_CRT = '#E67E22'
C_RECON = '#1F4E79'
C_OUTPUT = '#8E44AD'
C_ARROW = '#95A5A6'
C_WHITE = '#FFFFFF'
C_LIGHT = '#F8F9FA'
C_TEXT_W = 'white'
C_TEXT_D = '#1A1A2E'

def draw_box(ax, x, y, w, h, color, title, subtitle, items, text_color='white'):
    # Shadow
    shadow = FancyBboxPatch((x+0.05, y-0.05), w, h, 
        boxstyle="round,pad=0.15", facecolor='#E0E0E0', edgecolor='none', alpha=0.4)
    ax.add_patch(shadow)
    # Main box
    box = FancyBboxPatch((x, y), w, h, 
        boxstyle="round,pad=0.15", facecolor=color, edgecolor=color, linewidth=1.5)
    ax.add_patch(box)
    # Title
    ax.text(x + w/2, y + h - 0.3, title, ha='center', va='top',
        fontsize=10, fontweight='bold', color=text_color, family='sans-serif')
    # Subtitle
    ax.text(x + w/2, y + h - 0.6, subtitle, ha='center', va='top',
        fontsize=7.5, color=text_color, alpha=0.85, family='sans-serif')
    # Items
    for i, item in enumerate(items):
        ax.text(x + 0.25, y + h - 0.95 - i*0.28, item, ha='left', va='top',
            fontsize=7, color=text_color, alpha=0.9, family='sans-serif')

def draw_arrow_down(ax, x, y1, y2, label=''):
    ax.annotate('', xy=(x, y2), xytext=(x, y1),
        arrowprops=dict(arrowstyle='->', color=C_ARROW, lw=2))
    if label:
        ax.text(x + 0.15, (y1+y2)/2, label, fontsize=7, color=C_ARROW, 
            va='center', ha='left', style='italic')

def draw_split_arrow(ax, x_start, y_start, x_end_left, x_end_right, y_end):
    ax.annotate('', xy=(x_end_left, y_end+0.5), xytext=(x_start, y_start),
        arrowprops=dict(arrowstyle='->', color=C_ARROW, lw=2, connectionstyle='arc3,rad=-0.3'))
    ax.annotate('', xy=(x_end_right, y_end+0.5), xytext=(x_start, y_start),
        arrowprops=dict(arrowstyle='->', color=C_ARROW, lw=2, connectionstyle='arc3,rad=0.3'))

def draw_merge_arrow(ax, x_left, x_right, y_start, x_end, y_end):
    ax.annotate('', xy=(x_end, y_end), xytext=(x_left, y_start),
        arrowprops=dict(arrowstyle='->', color=C_ARROW, lw=2, connectionstyle='arc3,rad=0.3'))
    ax.annotate('', xy=(x_end, y_end), xytext=(x_right, y_start),
        arrowprops=dict(arrowstyle='->', color=C_ARROW, lw=2, connectionstyle='arc3,rad=-0.3'))

# ─── INPUT ───
draw_box(ax, 5, 8.7, 4, 0.6, C_INPUT, 'INPUT', 'Prompt Kompetisi + Konteks Rally', [], C_TEXT_W)

draw_arrow_down(ax, 7, 8.65, 8.1)

# ─── PHASE 0 ───
draw_box(ax, 4.2, 6.8, 5.6, 1.15, C_P0, 'PHASE 0: PreWriting Agent', '1 API call | ~3 detik', [
    '\u2022 Analyze prompt kompetisi',
    '\u2022 Generate Writing Brief (JSON)',
    '\u2022 Output: perspective, persona, tone,',
    '  structure, keyInsights, uniqueAngle',
])

draw_arrow_down(ax, 7, 6.75, 6.3)

# ─── PHASE 1 ───
draw_box(ax, 3.8, 4.9, 6.4, 1.25, C_P1, 'PHASE 1: Generator Agent', '2-6 API calls | ~8-12 detik', [
    '\u2022 Self-Correction Loop:',
    '  generate \u2192 selfCheck \u2192 revise (max 2-3x)',
    '\u2022 Anti-AI rules BUILT-IN ke system prompt',
    '\u2022 Writing brief sebagai fondasi kreatif',
    '\u2022 Diminishing returns detection',
])

# Split arrow
ax.annotate('', xy=(4.5, 4.15), xytext=(7, 4.85),
    arrowprops=dict(arrowstyle='->', color=C_ARROW, lw=2, connectionstyle='arc3,rad=-0.25'))
ax.annotate('', xy=(9.5, 4.15), xytext=(7, 4.85),
    arrowprops=dict(arrowstyle='->', color=C_ARROW, lw=2, connectionstyle='arc3,rad=0.25'))

# ─── PHASE 2: OPTIMIST ───
draw_box(ax, 1.2, 2.6, 4.8, 1.35, C_OPT, 'PHASE 2a: JUDGE OPTIMIST', '1 API call | ~4 detik (PARALEL)', [
    '\u2022 Perspective & Depth (35%)',
    '\u2022 Creativity & Originality (40%)',
    '\u2022 Engagement & Impact (25%)',
    '\u2022 Bias: mencari KEKUATAN konten',
])

# ─── PHASE 2: CRITIC ───
draw_box(ax, 8, 2.6, 4.8, 1.35, C_CRT, 'PHASE 2b: JUDGE CRITIC', '1 API call | ~4 detik (PARALEL)', [
    '\u2022 Relevance & Alignment (35%)',
    '\u2022 Technical Quality (35%)',
    '\u2022 Anti-AI Compliance (30%)',
    '\u2022 Bias: mencari KELEMAHAN konten',
])

# Merge arrow
ax.annotate('', xy=(7, 2.15), xytext=(3.6, 2.55),
    arrowprops=dict(arrowstyle='->', color=C_ARROW, lw=2, connectionstyle='arc3,rad=0.25'))
ax.annotate('', xy=(7, 2.15), xytext=(10.4, 2.55),
    arrowprops=dict(arrowstyle='->', color=C_ARROW, lw=2, connectionstyle='arc3,rad=-0.25'))

# ─── PHASE 3: RECONCILIATION ───
draw_box(ax, 3.5, 0.75, 7, 1.25, C_RECON, 'PHASE 3: Reconciliation Layer', '0 API calls | ~0 detik (MATEMATIS)', [
    '\u2022 Weighted average: Optimist 55% + Critic 45%',
    '\u2022 Gap detection: gap > 25 = FLAG human review',
    '\u2022 Dimension mapping ke 6D scoring',
    '\u2022 Final verdict: APPROVE / REVISE / REJECT',
])

draw_arrow_down(ax, 7, 0.7, 0.25)

# ─── OUTPUT ───
draw_box(ax, 5, -0.4, 4, 0.6, C_OUTPUT, 'OUTPUT', 'Content + Score + Verdict + Feedback', [], C_TEXT_W)

# ─── LEGEND ───
legend_x = 0.3
legend_y = 9.1
ax.text(legend_x, legend_y, 'Total: 4-5 API calls | ~14-20 detik per konten', 
    fontsize=8, color=C_TEXT_D, fontweight='bold', family='sans-serif')
ax.text(legend_x, legend_y - 0.25, 'vs Pipeline v9.8.4: 10-12 calls | 45-60 detik', 
    fontsize=7, color='#E74C3C', family='sans-serif')

# Performance comparison badge
badge_x = 11.5
badge_y = 9.0
badge = FancyBboxPatch((badge_x, badge_y-0.2), 2.3, 0.55,
    boxstyle="round,pad=0.1", facecolor='#E8F8F5', edgecolor=C_P0, linewidth=1.5)
ax.add_patch(badge)
ax.text(badge_x + 1.15, badge_y + 0.1, '3-4x Lebih Cepat', ha='center', va='center',
    fontsize=8.5, fontweight='bold', color=C_P0, family='sans-serif')

# "PARALEL" label
ax.text(7, 4.55, '\u25C0 PARALEL \u25B6', ha='center', va='center',
    fontsize=8, fontweight='bold', color=C_TEXT_D, family='sans-serif',
    bbox=dict(boxstyle='round,pad=0.2', facecolor='#FEF9E7', edgecolor='#F39C12', linewidth=1))

# "VS" label between judges
ax.text(7, 3.25, 'VS', ha='center', va='center',
    fontsize=9, fontweight='bold', color='#E74C3C', family='sans-serif',
    bbox=dict(boxstyle='round,pad=0.15', facecolor='#FDEDEC', edgecolor='#E74C3C', linewidth=1))

# "BUKAN AI" label for reconciliation
ax.text(11, 1.35, 'PURE MATH\n(Bukan AI)', ha='center', va='center',
    fontsize=7, fontweight='bold', color=C_RECON, family='sans-serif',
    bbox=dict(boxstyle='round,pad=0.15', facecolor='#EBF5FB', edgecolor=C_RECON, linewidth=1, linestyle='--'))

plt.tight_layout(pad=0.5)
plt.savefig('/home/z/my-project/download/hybrid_3phase_flow.png', dpi=180, bbox_inches='tight',
    facecolor='white', edgecolor='none')
print("Diagram saved!")
