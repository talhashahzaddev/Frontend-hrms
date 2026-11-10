"""
Enterprise UI recolor helper (see docs/UI_REDESIGN.md).

Maps the old Tailwind-style palette (royal blue, slate, violet, teal, bright
status colors) onto the navy / neutral-grey token set, and strips decoration
that the standard forbids (colored glows, text shadows, backdrop blur).

Usage:
  python scripts/ui-recolor.py [--flatten-gradients] [--normalize-shape] [--dry-run] <file-or-dir> ...

Rules:
  * In Sass variable definitions ($x: #...) and inside Sass color functions,
    colors are replaced with plain hex so rgba($x, .2) etc. keep compiling.
  * Everywhere else, colors become var(--hr-*) tokens.
  * --flatten-gradients replaces linear/radial gradients with their first
    solid color stop (review the result visually).
  * --normalize-shape snaps border-radius to the 2/4/6/8px scale, box-shadow
    to the three elevation tokens, and font-weight 700+ to 600.
Only .scss/.css files are edited. Templates and TypeScript are reported, not changed.
"""
import re
import sys
from pathlib import Path

# token -> new hex
TOKENS = {
    'hr-navy': '#2552d0', 'hr-navy-hover': '#1e44ae', 'hr-navy-soft': '#eef3fd',
    'hr-navy-2': '#1e44ae', 'hr-navy-muted': '#8fa8e3',
    'hr-text': '#1f2328', 'hr-text-2': '#3d434b', 'hr-text-muted': '#5f6670',
    'hr-text-subtle': '#8b929b', 'hr-border-strong': '#c4c9d0', 'hr-border': '#dde1e6',
    'hr-border-soft': '#edeff2', 'hr-surface-2': '#f7f8fa',
    'hr-success': '#2e7d4f', 'hr-success-soft': '#eaf3ee', 'hr-success-ink': '#1f5c3a',
    'hr-danger': '#b42318', 'hr-danger-soft': '#fbeae9', 'hr-danger-ink': '#8a1c14',
    'hr-warning': '#9a6700', 'hr-warning-soft': '#fbf3e0', 'hr-warning-ink': '#7a5200',
}

GROUPS = {
    'hr-navy': '2563eb 3b82f6 4f46e5 6366f1 7c3aed 8b5cf6 6d28d9 0ea5e9 0284c7 06b6d4 0891b2 '
               '14b8a6 0d9488 9333ea a855f7 ec4899 db2777 2196f3 1976d2 1565c0 3f51b5 673ab7 '
               '9c27b0 00bcd4 009688 1e88e5 42a5f5 5c6bc0 7e57c2 ab47bc 667eea 764ba2 4a90e2 '
               '1e2f4d',
    'hr-navy-hover': '1d4ed8 1e40af 1e3a8a 172554 312e81 3730a3 4c1d95 5b21b6 0c4a6e 075985 '
                     '134e4a 0f1a3d 0d47a1 1a237e 4338ca',
    'hr-navy-soft': 'eff6ff dbeafe eef2ff e0e7ff f5f3ff ede9fe f0f9ff e0f2fe ecfeff cffafe '
                    'f0fdfa ccfbf1 faf5ff f3e8ff fdf2f8 fce7f3 ebf5ff e3f2fd e8eaf6 ede7f6 '
                    'f3e5f5 e0f7fa e0f2f1 f5f7ff e8f0fe',
    'hr-navy-muted': 'bfdbfe 93c5fd 60a5fa c7d2fe a5b4fc 818cf8 ddd6fe c4b5fd a78bfa 7dd3fc '
                     '38bdf8 67e8f9 22d3ee 99f6e4 5eead4 90caf9 64b5f6',
    'hr-text': '0f172a 111827 1e293b 1a1a1a 212121 222222 1f2937 0f1729',
    'hr-text-2': '334155 475569 374151 4b5563 424242 333333 444444 555555',
    'hr-text-muted': '64748b 6b7280 757575 666666 777777 616161',
    'hr-text-subtle': '94a3b8 9ca3af 9e9e9e 999999 aaaaaa',
    'hr-border-strong': 'cbd5e1 d1d5db bdbdbd cccccc',
    'hr-border': 'e2e8f0 e5e7eb e0e0e0 dddddd',
    'hr-border-soft': 'f1f5f9 f3f4f6 eeeeee f0f0f0 f5f5f5',
    'hr-surface-2': 'f8fafc f9fafb fafbfc fafafa f8f9fa f7f8fa',
    'hr-success': '16a34a 22c55e 10b981 059669 4caf50 43a047 2e7d32 28a745 34d399',
    'hr-success-ink': '15803d 047857 166534 065f46 14532d 1b5e20',
    'hr-success-soft': 'dcfce7 f0fdf4 d1fae5 ecfdf5 bbf7d0 a7f3d0 e8f5e9 c8e6c9 86efac',
    'hr-danger': 'dc2626 ef4444 e11d48 f43f5e f44336 e53935 d32f2f dc3545 f87171',
    'hr-danger-ink': 'b91c1c 991b1b 9f1239 7f1d1d c62828 b71c1c 881337',
    'hr-danger-soft': 'fee2e2 fef2f2 fff5f5 ffe4e6 fecaca ffebee ffcdd2 fff1f2 fda4af fca5a5',
    'hr-warning': 'd97706 f59e0b ea580c f97316 eab308 ca8a04 ff9800 fb8c00 f57c00 ffc107 ffa000 fbbf24 fb923c',
    'hr-warning-ink': 'b45309 92400e 78350f 9a3412 c2410c 854d0e e65100 a16207 713f12',
    'hr-warning-soft': 'fef3c7 fffbeb fff7ed ffedd5 fef9c3 fde68a fff3e0 fff8e1 ffe0b2 ffecb3 fed7aa fde047',
}

HEX2TOKEN = {}
for tok, hexes in GROUPS.items():
    for h in hexes.split():
        HEX2TOKEN[h] = tok
# 3-digit shorthands that matter
SHORT = {'333': '333333', '444': '444444', '555': '555555', '666': '666666', '777': '777777',
         '999': '999999', 'aaa': 'aaaaaa', 'ccc': 'cccccc', 'ddd': 'dddddd', 'eee': 'eeeeee'}

# colored rgba channels -> navy channels; slate shadow -> black
RGBA_MAP = {
    (37, 99, 235): (37, 82, 208), (59, 130, 246): (37, 82, 208), (29, 78, 216): (37, 82, 208),
    (99, 102, 241): (37, 82, 208), (79, 70, 229): (37, 82, 208), (124, 58, 237): (37, 82, 208),
    (139, 92, 246): (37, 82, 208), (14, 165, 233): (37, 82, 208), (6, 182, 212): (37, 82, 208),
    (20, 184, 166): (37, 82, 208), (96, 165, 250): (37, 82, 208), (102, 126, 234): (37, 82, 208),
    (23, 37, 84): (37, 82, 208), (30, 58, 138): (37, 82, 208),
    (15, 23, 42): (0, 0, 0), (30, 41, 59): (0, 0, 0), (100, 116, 139): (95, 102, 112),
    (22, 163, 74): (46, 125, 79), (34, 197, 94): (46, 125, 79), (16, 185, 129): (46, 125, 79),
    (220, 38, 38): (180, 35, 24), (239, 68, 68): (180, 35, 24),
    (217, 119, 6): (154, 103, 0), (245, 158, 11): (154, 103, 0),
}
NEUTRAL_SHADOW = {(0, 0, 0), (15, 23, 42)}

HEX_RE = re.compile(r'#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b')
RGBA_RE = re.compile(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*[\d.]+\s*)?\)')
SASS_VAR_DEF = re.compile(r'^\s*\$[\w-]+\s*:')
SASS_FN = re.compile(r'(lighten|darken|mix|rgba|transparentize|fade-out|fade-in|adjust-hue|'
                     r'saturate|desaturate|scale-color|adjust-color|color\.[a-z-]+)\(')
GRADIENT_RE = re.compile(r'(repeating-)?(linear|radial|conic)-gradient\(')


def hex_lookup(h):
    h = h.lower()
    if len(h) == 3:
        h = SHORT.get(h, h)
    return HEX2TOKEN.get(h)


def recolor_value(text, use_vars):
    def hex_sub(m):
        tok = hex_lookup(m.group(1))
        if not tok:
            return m.group(0)
        return f'var(--{tok})' if use_vars else TOKENS[tok]

    def rgba_sub(m):
        rgb = tuple(int(m.group(i)) for i in (1, 2, 3))
        alpha = m.group(4) or ''
        new = RGBA_MAP.get(rgb)
        if not new:
            return m.group(0)
        fn = 'rgba' if alpha else 'rgb'
        return f'{fn}({new[0]}, {new[1]}, {new[2]}{alpha})'

    return HEX_RE.sub(hex_sub, RGBA_RE.sub(rgba_sub, text))


def split_args(s, start):
    """Return index just past the matching ')' for the '(' at s[start-1]."""
    depth = 1
    i = start
    while i < len(s) and depth:
        if s[i] == '(':
            depth += 1
        elif s[i] == ')':
            depth -= 1
        i += 1
    return i


def first_solid_stop(args):
    for part in re.split(r',(?![^(]*\))', args):
        part = part.strip()
        m = re.search(r'(var\(--[\w-]+\)|#[0-9a-fA-F]{3,6}\b|rgba?\([^)]*\)|\b(white|black)\b)', part)
        if m and 'transparent' not in part:
            return m.group(0)
    return None


def flatten_gradients(line):
    out = ''
    i = 0
    while True:
        m = GRADIENT_RE.search(line, i)
        if not m:
            return out + line[i:]
        end = split_args(line, m.end())
        args = line[m.end():end - 1]
        stop = first_solid_stop(args)
        out += line[i:m.start()] + (stop or 'transparent')
        i = end


RADIUS_DECL = re.compile(r'^(\s*border(?:-(?:top|bottom)-(?:left|right))?-radius\s*:\s*)([^;!]+?)(\s*(?:!important)?\s*;.*)$', re.S)
SHADOW_DECL = re.compile(r'^(\s*box-shadow\s*:\s*)([^;!]+?)(\s*(?:!important)?\s*;.*)$', re.S)
WEIGHT_DECL = re.compile(r'^(\s*font-weight\s*:\s*)(700|800|900|bold|bolder)(\s*(?:!important)?\s*;.*)$', re.S)


def radius_token(v):
    v = v.strip()
    m = re.fullmatch(r'([\d.]+)(px|rem|em)', v)
    if not m:
        return v  # 50%, 999px handled below, var(), 0, inherit...
    px = float(m.group(1)) * (16 if m.group(2) != 'px' else 1)
    if px == 0 or px >= 99:
        return v  # square or pill/circle: leave for manual review
    if px <= 2:
        return '2px'
    if px <= 9:
        return 'var(--hr-radius)'
    if px <= 14:
        return 'var(--hr-radius-lg)'
    return 'var(--hr-radius-xl)'


def shadow_token(value):
    v = value.strip()
    if v in ('none', 'unset', 'initial', 'inherit') or v.startswith('var(') or 'inset' in v:
        return value
    blurs = [float(b) for b in re.findall(r'(?:^|,)\s*-?[\d.]+(?:px)?\s+-?[\d.]+(?:px)?\s+([\d.]+)px', v)]
    if not blurs:
        return value
    b = max(blurs)
    if b <= 4:
        return 'var(--hr-shadow-sm)'
    if b <= 15:
        return 'var(--hr-shadow-md)'
    return 'var(--hr-shadow-lg)'


def normalize_shape(line):
    m = RADIUS_DECL.match(line)
    if m:
        vals = ' '.join(radius_token(p) for p in m.group(2).split())
        return m.group(1) + vals + m.group(3)
    m = SHADOW_DECL.match(line)
    if m:
        return m.group(1) + shadow_token(m.group(2)) + m.group(3)
    m = WEIGHT_DECL.match(line)
    if m:
        return m.group(1) + '600' + m.group(3)
    return line


def process_line(line, flatten, shape=False):
    if shape:
        stripped = line.strip()
        if not (stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*')):
            line = normalize_shape(line)
    stripped = line.strip()
    if stripped.startswith('//') or stripped.startswith('/*') or stripped.startswith('*'):
        return line
    in_sass_def = bool(SASS_VAR_DEF.match(line))
    # inside Sass color functions keep literal hex
    if SASS_FN.search(line) and not in_sass_def:
        parts = []
        last = 0
        for fm in SASS_FN.finditer(line):
            end = split_args(line, fm.end())
            parts.append(recolor_value(line[last:fm.start()], True))
            parts.append(recolor_value(line[fm.start():end], False))
            last = end
        parts.append(recolor_value(line[last:], True))
        new = ''.join(parts)
    else:
        new = recolor_value(line, use_vars=not in_sass_def)

    low = new.lower()
    # drop text shadows and backdrop blur
    if re.match(r'\s*(-webkit-)?(text-shadow|backdrop-filter)\s*:', low):
        indent = re.match(r'\s*', new).group(0)
        prop = new.strip().split(':')[0]
        imp = ' !important' if '!important' in low else ''
        return f'{indent}{prop}: none{imp};\n' if new.endswith('\n') else f'{indent}{prop}: none{imp};'
    # colored glows: box-shadow using a non-neutral color -> none
    if re.match(r'\s*box-shadow\s*:', low) and 'inset' not in low:
        colors = RGBA_RE.findall(new)
        colored = [c for c in colors if tuple(map(int, c[:3])) not in NEUTRAL_SHADOW]
        if colored or 'var(--hr-navy' in low:
            indent = re.match(r'\s*', new).group(0)
            imp = ' !important' if '!important' in low else ''
            nl = '\n' if new.endswith('\n') else ''
            return f'{indent}box-shadow: none{imp};{nl}'
    if flatten and GRADIENT_RE.search(new) and not in_sass_def:
        new = flatten_gradients(new)
        new = collapse_color_layers(new)
    return new


LAYERS_DECL = re.compile(r'^(\s*background(?:-color)?\s*:\s*)(.+?)(\s*(?:!important)?\s*;\s*)$', re.S)


def collapse_color_layers(line):
    """'background: a, b, c' made only of colors is invalid CSS: keep the base (last) layer."""
    m = LAYERS_DECL.match(line)
    if not m:
        return line
    parts = [p.strip() for p in re.split(r',(?![^(]*\))', m.group(2))]
    if len(parts) < 2:
        return line
    color = re.compile(r'^(var\(--[\w-]+\)|#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|transparent|white|black)$')
    if all(color.match(p) for p in parts):
        base = next((p for p in reversed(parts) if p != 'transparent'), parts[-1])
        return m.group(1) + base + m.group(3)
    return line


def process_file(path, flatten, dry, shape=False):
    src = path.read_text(encoding='utf-8')
    if flatten:
        # join multi-line background declarations so layers can be flattened as one value
        src = re.sub(r'(background(?:-image)?\s*:)([^;{}]*?\n[^;{}]*?;)',
                     lambda m: m.group(1) + ' ' + re.sub(r'\s*\n\s*', ' ', m.group(2)).strip(), src)
    lines = src.splitlines(keepends=True)
    out = [process_line(l, flatten, shape) for l in lines]
    new = ''.join(out)
    changed = sum(1 for a, b in zip(lines, out) if a != b)
    if changed and not dry:
        path.write_text(new, encoding='utf-8')
    remaining = len(GRADIENT_RE.findall(new))
    return changed, remaining


def main():
    args = sys.argv[1:]
    flatten = '--flatten-gradients' in args
    dry = '--dry-run' in args
    shape = '--normalize-shape' in args
    targets = [a for a in args if not a.startswith('--')]
    total = 0
    for t in targets:
        p = Path(t)
        files = [p] if p.is_file() else sorted(list(p.rglob('*.scss')) + list(p.rglob('*.css')))
        for f in files:
            if f.name == '_variables.scss':
                continue
            changed, remaining = process_file(f, flatten, dry, shape)
            total += changed
            if changed or remaining:
                print(f'{changed:5d} lines changed  {remaining:3d} gradients left  {f}')
    print(f'TOTAL lines changed: {total}{" (dry run)" if dry else ""}')


if __name__ == '__main__':
    main()
