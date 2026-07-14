from reportlab.pdfbase.pdfmetrics import stringWidth

def wrap_text_multiline(text, fontName, fontSize, max_width):
    result = []
    for original_line in (text or "").split('\n'):
        words = original_line.split()
        line = ""
        for word in words:
            test = f"{line} {word}".strip()
            if stringWidth(test, fontName, fontSize) <= max_width:
                line = test
            else:
                if line:
                    result.append(line)
                line = word
        if line:
            result.append(line)
    return result

def draw_text_fit_area(c, text, x, y, width, height, fontName="Helvetica", min_font=5, max_font=8, leading_ratio=1.13):
    font_size = max_font
    while font_size >= min_font:
        lines = []
        for original_line in (text or "").split('\n'):
            words = original_line.split()
            line = ""
            for word in words:
                test = f"{line} {word}".strip()
                if stringWidth(test, fontName, font_size) <= width:
                    line = test
                else:
                    if line:
                        lines.append(line)
                    line = word
            if line:
                lines.append(line)
        line_height = font_size * leading_ratio
        total_height = len(lines) * line_height
        if total_height <= height:
            break
        font_size -= 0.5
    max_lines = int(height // (font_size * leading_ratio))
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        if lines:
            if len(lines[-1]) > 4:
                lines[-1] = lines[-1][:-3] + "..."
    c.setFont(fontName, font_size)
    curr_y = y
    for line in lines:
        c.drawString(x, curr_y, line)
        curr_y -= font_size * leading_ratio
    return curr_y

def format_number(num, decimals=3):
    try:
        num = float(num)
        s = f"{{:,.{decimals}f}}".format(num)
        s = s.replace(",", "X").replace(".", ",").replace("X", ".")
        return s
    except Exception:
        return str(num) if num not in [None, "None"] else ""

def safe_get_attr(obj, attr, default=""):
    """Función segura para obtener atributos con fallback"""
    if obj is None:
        return default
    return getattr(obj, attr, default) or default
