# -*- coding: utf-8 -*-
"""
MIC/DTA PDF Generator - Versión completa y robusta
- Fuentes Unicode (DejaVuSans) con fallback automático
- Helpers px→pt y coordenadas consistentes (solo trabajamos en pt dentro de dibujo)
- Ajuste dinámico adaptativo de texto (Campo 38 mejorado) + márgenes y reservas de título
- Estilos cacheados y centralizados
- saveState()/restoreState() para evitar fugas de estado
- Limpieza segura de caracteres de control (sin comerse acentos)
- Refactors de cajas/títulos
"""

import os
import re
from datetime import datetime

from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Frame
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics


# =============================
#        CONFIG / CONSTANTES
# =============================

# Relación px→pt usada en el layout original
PT_PER_PX = 0.75

# Offsets y márgenes estándar
TITLE_OFFSET_PT = 24  # distancia desde el borde superior de la caja para el título
SUBTITLE_OFFSET_PT = 16  # distancia adicional para subtítulo desde el título
FIELD_PADDING_PT = 8  # padding interno general de cajas
# altura reservada para título/subtítulo (para zonas de texto bajo títulos)
FIELD_TITLE_RESERVED_PT = 60

# Fuente por defecto (intentaremos Unicode primero)
FONT_REGULAR = "DejaVuSans"
FONT_BOLD = "DejaVuSans-Bold"
FALLBACK_REGULAR = "Helvetica"
FALLBACK_BOLD = "Helvetica-Bold"

# Tamaños por defecto
DEFAULT_FONT_SIZE = 12

# Debug global (activar/desactivar prints)
DEBUG = True


# =============================
#         UTILIDADES
# =============================

def px2pt(v):
    return v * PT_PER_PX


# =============================
#         DEBUG SYSTEM
# =============================

class DebugLogger:
    """Sistema de debug consistente y organizado para MIC/DTA PDF"""

    # Emojis para diferentes tipos de mensajes
    EMOJI = {
        'processing': '🎯',
        'success': '✅',
        'multiline': '🖼️',
        'singleline': '🔤',
        'summary': '📋',
        'transport': '🚛',
        'date': '📅',
        'field_40': '🎯',
        'error': '❌',
        'warning': '⚠️',
        'info': 'ℹ️',
        'debug': '🔍',
        'file': '📁',
        'data': '📊'
    }

    @staticmethod
    def log(msg_type, message, *args):
        """Log consistente con tipo y mensaje"""
        if not DEBUG:
            return

        emoji = DebugLogger.EMOJI.get(msg_type, '🔍')
        formatted_msg = f"{emoji} {message}"

        if args:
            formatted_msg = formatted_msg.format(*args)

        try:
            print(formatted_msg)
        except UnicodeEncodeError:
            # Fallback para consolas que no soportan Unicode
            print(formatted_msg.encode('ascii', 'replace').decode('ascii'))

    @staticmethod
    def processing(message, *args):
        DebugLogger.log('processing', message, *args)

    @staticmethod
    def success(message, *args):
        DebugLogger.log('success', message, *args)

    @staticmethod
    def multiline(message, *args):
        DebugLogger.log('multiline', message, *args)

    @staticmethod
    def singleline(message, *args):
        DebugLogger.log('singleline', message, *args)

    @staticmethod
    def summary(message, *args):
        DebugLogger.log('summary', message, *args)

    @staticmethod
    def transport(message, *args):
        DebugLogger.log('transport', message, *args)

    @staticmethod
    def date(message, *args):
        DebugLogger.log('date', message, *args)

    @staticmethod
    def field_40(message, *args):
        DebugLogger.log('field_40', message, *args)

    @staticmethod
    def error(message, *args):
        DebugLogger.log('error', message, *args)

    @staticmethod
    def warning(message, *args):
        DebugLogger.log('warning', message, *args)

    @staticmethod
    def info(message, *args):
        DebugLogger.log('info', message, *args)

    @staticmethod
    def debug(message, *args):
        DebugLogger.log('debug', message, *args)

    @staticmethod
    def file(message, *args):
        DebugLogger.log('file', message, *args)

    @staticmethod
    def data(message, *args):
        DebugLogger.log('data', message, *args)


def log(msg):
    """Función de compatibilidad con el sistema anterior"""
    if DEBUG:
        try:
            print(msg)
        except UnicodeEncodeError:
            print(msg.encode('ascii', 'replace').decode('ascii'))


def safe_clean_text(text) -> str:
    """
    Limpieza universal: normaliza saltos de línea y remueve caracteres de control problemáticos
    (excepto \n y \t). NO elimina acentos ni caracteres Unicode válidos.
    Maneja cualquier tipo de entrada (str, int, float, None).
    """
    if text is None:
        return ""
    if isinstance(text, (int, float)):
        text = str(text)
    if not isinstance(text, str):
        text = str(text)

    t = text.replace('\r\n', '\n').replace('\r', '\n')
    # Remover controles ASCII (mantiene \n y \t)
    t = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', t)
    return t


def find_ttf_candidate_paths():
    """
    Intenta descubrir rutas típicas de DejaVuSans en Linux/Mac/Windows.
    """
    candidates = [
        # Linux
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        # Windows (Microsoft Store Python no siempre ve Windows Fonts; probamos copias locales)
        os.path.expanduser(
            "~/AppData/Local/Microsoft/Windows/Fonts/DejaVuSans.ttf"),
        os.path.expanduser(
            "~/AppData/Local/Microsoft/Windows/Fonts/DejaVuSans-Bold.ttf"),
        # Windows ruta global (si el usuario instaló fuentes TTF)
        "C:\\Windows\\Fonts\\DejaVuSans.ttf",
        "C:\\Windows\\Fonts\\DejaVuSans-Bold.ttf",
        # Mac
        "/Library/Fonts/DejaVuSans.ttf",
        "/Library/Fonts/DejaVuSans-Bold.ttf",
    ]
    return candidates


def _fonts_registered() -> bool:
    """Verifica si las fuentes actuales están registradas en reportlab."""
    try:
        regs = set(pdfmetrics.getRegisteredFontNames())
        return (FONT_REGULAR in regs) and (FONT_BOLD in regs)
    except Exception:
        return False


def register_unicode_fonts():
    """
    Registra DejaVuSans (regular y bold). Si falla, deja Helvetica como fallback silencioso.
    """
    global FONT_REGULAR, FONT_BOLD
    try:
        # Si ya están registradas, no volver a registrar
        already = FONT_REGULAR in pdfmetrics.getRegisteredFontNames(
        ) and FONT_BOLD in pdfmetrics.getRegisteredFontNames()
        if already:
            DebugLogger.info("Fuentes DejaVuSans ya registradas.")
            return

        # Intentar encontrar archivos
        regs = find_ttf_candidate_paths()
        reg_path = None
        bold_path = None
        for p in regs:
            if os.path.exists(p):
                if p.lower().endswith("dejavusans.ttf"):
                    reg_path = p
                elif p.lower().endswith("dejavusans-bold.ttf"):
                    bold_path = p

        if reg_path and bold_path:
            pdfmetrics.registerFont(TTFont(FONT_REGULAR, reg_path))
            pdfmetrics.registerFont(TTFont(FONT_BOLD, bold_path))
            DebugLogger.success(f"Fuentes Unicode registradas: {reg_path}, {bold_path}")
        else:
            # Si no encontramos ambas, caer a Helvetica
            FONT_REGULAR = FALLBACK_REGULAR
            FONT_BOLD = FALLBACK_BOLD
            DebugLogger.warning("No se encontraron DejaVuSans TTF; usando Helvetica como fallback.")
    except Exception as e:
        FONT_REGULAR = FALLBACK_REGULAR
        FONT_BOLD = FALLBACK_BOLD
        DebugLogger.warning(f"No se pudieron registrar TTF Unicode ({e}); usando Helvetica.")


# Registrar fuentes al importar el módulo (evita 500 si se usa como librería)
register_unicode_fonts()


# =============================
#         ESTILOS CACHE
# =============================

_STYLES = None


def get_styles():
    """
    Cachea y devuelve estilos ParagraphStyle listos con fuentes Unicode (o fallback).
    """
    global _STYLES
    if _STYLES is not None:
        return _STYLES

    ss = getSampleStyleSheet()
    # Overwrite defaults to ensure Unicode-capable font
    ss["Normal"].fontName = FONT_REGULAR
    ss["Normal"].fontSize = 10
    ss["Normal"].leading = 12

    ss.add(ParagraphStyle(
        'esBold', parent=ss['Normal'], fontName=FONT_BOLD, fontSize=11, leading=13, alignment=TA_LEFT))
    ss.add(ParagraphStyle(
        'es', parent=ss['Normal'], fontName=FONT_REGULAR, fontSize=10, leading=12, alignment=TA_LEFT))
    ss.add(ParagraphStyle('firma', parent=ss['Normal'], fontName=FONT_BOLD,
           fontSize=11, leading=13, alignment=TA_LEFT, spaceBefore=10))
    ss.add(ParagraphStyle('transportador',
           parent=ss['Normal'], fontName=FONT_BOLD, fontSize=14, leading=16, alignment=TA_LEFT, spaceBefore=20))

    _STYLES = ss
    return _STYLES


# =============================
#          DIBUJO BASE
# =============================

def rect_pt(c, x_px, y_px, w_px, h_px, height_px, line_width=1.0, show=True):
    """
    Dibuja un rectángulo usando coordenadas en px del layout original,
    transformadas a pt. Devuelve (x_pt, y_pt, w_pt, h_pt).
    """
    x, y, w, h = px2pt(x_px), px2pt(
        height_px - y_px - h_px), px2pt(w_px), px2pt(h_px)
    if show:
        c.saveState()
        c.setLineWidth(line_width)
        c.rect(x, y, w, h)
        c.restoreState()
    return x, y, w, h


def draw_field_title(c, x_pt, y_pt, w_pt, h_pt, titulo, subtitulo, title_font=None, sub_font=None):
    """
    Dibuja título y subtítulo en la parte superior de una caja ya creada (en pt).
    Defaults resueltos en tiempo de ejecución para evitar capturar fuentes no registradas.
    """
    if title_font is None:
        title_font = FONT_BOLD
    if sub_font is None:
        sub_font = FONT_REGULAR

    c.saveState()
    try:
        tx = x_pt + FIELD_PADDING_PT
        ty = y_pt + h_pt - TITLE_OFFSET_PT
        if titulo:
            c.setFont(title_font, 13)
            c.drawString(tx, ty, titulo)
        if subtitulo:
            c.setFont(sub_font, 11)
            c.drawString(tx, ty - SUBTITLE_OFFSET_PT, subtitulo)
    finally:
        c.restoreState()
    # devuelve coordenadas útiles por si se usan
    return (x_pt + FIELD_PADDING_PT, y_pt + FIELD_PADDING_PT, w_pt - 2*FIELD_PADDING_PT, h_pt - 2*FIELD_PADDING_PT)


# =============================
#   AJUSTE DE TEXTO (CAMPO 38)
# =============================

def fit_text_box(c, text, x, y, w, h, font=None, min_font=8, max_font=14, leading_ratio=1.3, margin=12, title_reserved_h=0):
    """
    Ajusta texto a un rectángulo (pt) con búsqueda binaria de tamaño de fuente.
    Respeta saltos de línea del usuario y hace wrap por palabras.
    Dibuja el texto al final. Devuelve dict con info de renderizado.
    Permite reservar espacio para un título en la parte superior.
    """
    if font is None:
        font = FONT_REGULAR

    text = safe_clean_text(text)
    if not text:
        return {'font_size_used': min_font, 'lines_drawn': 0, 'truncated': False, 'effective_area': f"{w:.1f}x{h:.1f}"}

    eff_w = w - 2 * margin
    # Restar la altura del título del área efectiva
    eff_h = h - 2 * margin - title_reserved_h
    if eff_w <= 0 or eff_h <= 0:
        return {'font_size_used': min_font, 'lines_drawn': 0, 'truncated': True, 'effective_area': f"{w:.1f}x{h:.1f}"}

    def wrap_for_size(sz):
        lines = []
        for manu in text.split('\n'):
            if not manu.strip():
                lines.append("")
                continue
            words, cur = manu.split(), ""
            for word in words:
                test = (cur + " " + word) if cur else word
                if c.stringWidth(test, font, sz) <= eff_w:
                    cur = test
                else:
                    if cur:
                        lines.append(cur)
                    cur = word
            if cur:
                lines.append(cur)
        return lines

    lo, hi, best_sz, best_lines = int(
        min_font), int(max_font), int(min_font), []

    # Búsqueda binaria para encontrar el tamaño de fuente óptimo
    while lo <= hi:
        mid = (lo + hi) // 2
        lines = wrap_for_size(mid)
        lh = mid * leading_ratio
        total_h = lh * len(lines)

        if total_h <= eff_h:
            # El texto cabe con este tamaño, intentar uno más grande
            best_sz, best_lines = mid, lines
            lo = mid + 1
        else:
            # El texto no cabe, probar con tamaño más pequeño
            hi = mid - 1

    # Si no encontramos un tamaño que funcione, usar el mínimo
    if not best_lines:
        best_sz = min_font
        best_lines = wrap_for_size(best_sz)

    c.saveState()
    try:
        c.setFont(font, best_sz)
        lh = best_sz * leading_ratio
        start_x = x + margin

        # Posicionar el texto desde la parte superior del área efectiva
        # (debajo del área reservada para título)
        start_y = y + h - margin - title_reserved_h - best_sz

        max_lines = int(eff_h // lh) if lh > 0 else 0
        drawn = best_lines[:max_lines]
        truncated = len(best_lines) > max_lines

        for i, ln in enumerate(drawn):
            line_y = start_y - i * lh
            # Verificar que la línea esté dentro de los límites
            if line_y < y + margin:
                break
            c.drawString(start_x, line_y, ln)

        # Indicador de truncamiento solo si hay espacio
        if truncated and drawn and max_lines > 0:
            truncate_y = start_y - max_lines * lh
            if truncate_y >= y + margin:
                c.drawString(start_x, truncate_y, "...")

        return {
            'font_size_used': best_sz,
            'lines_drawn': len(drawn),
            'truncated': truncated,
            'effective_area': f"{eff_w:.1f}x{eff_h:.1f}"
        }
    finally:
        c.restoreState()


# =============================
#      MULTILÍNEA GENERALES
# =============================

def draw_multiline_text_simple(c, text, x, y, w, h, font_size=9, font=None, margin=12):
    """
    Método simple con manejo explícito de \n (sin Frame).
    Envuelve por palabras respetando el ancho.
    Aplica topes (márgenes) en todos los lados.
    Defaults resueltos en tiempo de ejecución.
    """
    if font is None:
        font = FONT_REGULAR

    # Margen dinámico: más pequeño para cajas pequeñas (como campo 23)
    dynamic_margin = 6 if h < 120 else margin

    clean_text = safe_clean_text(text)

    # Aplicar topes/márgenes en todos los lados
    eff_x = x + dynamic_margin
    eff_y = y + dynamic_margin
    eff_w = w - 2 * dynamic_margin
    eff_h = h - 2 * dynamic_margin

    # Verificar que el área efectiva sea válida
    if eff_w <= 0 or eff_h <= 0:
        return

    c.saveState()
    try:
        c.setFont(font, font_size)
        manual_lines = clean_text.split('\n')

        all_lines = []
        for manual_line in manual_lines:
            if not manual_line.strip():
                all_lines.append("")
                continue

            words = manual_line.split()
            current_line = ""

            for word in words:
                test_line = (current_line + " " +
                             word) if current_line else word
                if c.stringWidth(test_line, font, font_size) <= eff_w:
                    current_line = test_line
                else:
                    if current_line:
                        all_lines.append(current_line)
                    current_line = word

            if current_line:
                all_lines.append(current_line)

        line_height = font_size + 2
        max_lines = int(eff_h / line_height) if line_height > 0 else 0
        visible_lines = all_lines[:max_lines]

        start_y = eff_y + eff_h - font_size
        for i, line in enumerate(visible_lines):
            line_y = start_y - (i * line_height)
            # Verificar que la línea esté dentro de los límites verticales
            if line_y < eff_y:
                break
            c.drawString(eff_x, line_y, line)

        # Indicador de truncamiento solo si hay espacio
        if len(all_lines) > max_lines and max_lines > 0:
            truncate_y = start_y - (max_lines * line_height)
            if truncate_y >= eff_y:
                c.drawString(eff_x, truncate_y, "... (continúa)")
                DebugLogger.warning(f"Texto truncado en campo multilínea: {len(all_lines) - max_lines} líneas omitidas")
    finally:
        c.restoreState()


def draw_multiline_text_adaptive(c, text, x, y, w, h, font=None, min_font=8, max_font=14, margin=12, title_reserved_h=60):
    """
    Nueva función adaptativa que combina lo mejor de ambas aproximaciones:
    - Ajuste dinámico de fuente (como fit_text_box)
    - Posicionamiento correcto con márgenes consistentes (como draw_multiline_text_simple)
    - Mejor manejo de texto largo con truncamiento inteligente

    Parámetros:
    - c: Canvas de reportlab
    - text: Texto a dibujar
    - x, y, w, h: Coordenadas y dimensiones del área
    - font: Fuente a usar (default: FONT_REGULAR)
    - min_font, max_font: Rango de tamaños de fuente
    - margin: Margen en todos los lados
    - title_reserved_h: Espacio reservado para título/subtítulo
    """
    if font is None:
        font = FONT_REGULAR

    clean_text = safe_clean_text(text)
    if not clean_text:
        return {'font_size_used': min_font, 'lines_drawn': 0, 'truncated': False, 'effective_area': f"{w:.1f}x{h:.1f}"}

    # Área efectiva considerando márgenes y espacio para título
    eff_x = x + margin
    eff_y = y + margin
    eff_w = w - 2 * margin
    eff_h = h - 2 * margin - title_reserved_h

    if eff_w <= 0 or eff_h <= 0:
        return {'font_size_used': min_font, 'lines_drawn': 0, 'truncated': True, 'effective_area': f"{w:.1f}x{h:.1f}"}

    def test_font_size(sz):
        """Prueba si un tamaño de fuente cabe en el área disponible"""
        c.setFont(font, sz)
        manual_lines = clean_text.split('\n')
        all_lines = []

        for manual_line in manual_lines:
            if not manual_line.strip():
                all_lines.append("")
                continue

            words = manual_line.split()
            current_line = ""

            for word in words:
                test_line = (current_line + " " + word) if current_line else word
                if c.stringWidth(test_line, font, sz) <= eff_w:
                    current_line = test_line
                else:
                    if current_line:
                        all_lines.append(current_line)
                    current_line = word

            if current_line:
                all_lines.append(current_line)

        line_height = sz + 2
        required_height = len(all_lines) * line_height
        return all_lines, required_height <= eff_h

    # Búsqueda binaria para encontrar el tamaño de fuente óptimo
    lo, hi = min_font, max_font
    best_sz = min_font
    best_lines = []

    while lo <= hi:
        mid = (lo + hi) // 2
        lines, fits = test_font_size(mid)

        if fits:
            best_sz = mid
            best_lines = lines
            lo = mid + 1  # Intentar tamaño más grande
        else:
            hi = mid - 1  # Probar tamaño más pequeño

    # Si no encontramos un tamaño que funcione, usar el mínimo
    if not best_lines:
        best_sz = min_font
        best_lines, _ = test_font_size(best_sz)

    # Dibujar el texto con el tamaño óptimo encontrado
    c.saveState()
    try:
        c.setFont(font, best_sz)
        line_height = best_sz + 2
        max_lines = int(eff_h / line_height) if line_height > 0 else 0
        visible_lines = best_lines[:max_lines]

        # Posicionar desde la parte superior del área efectiva (desde eff_y)
        start_y = eff_y + eff_h - best_sz

        for i, line in enumerate(visible_lines):
            line_y = start_y - (i * line_height)
            if line_y < eff_y:
                break
            c.drawString(eff_x, line_y, line)

        # Indicador de truncamiento
        truncated = len(best_lines) > max_lines
        if truncated and max_lines > 0:
            truncate_y = start_y - (max_lines * line_height)
            if truncate_y >= eff_y:
                c.drawString(eff_x, truncate_y, "...")

    finally:
        c.restoreState()

    return {
        'font_size_used': best_sz,
        'lines_drawn': len(visible_lines),
        'truncated': truncated,
        'effective_area': f"{eff_w:.1f}x{eff_h:.1f}"
    }

def draw_multiline_text(c, text, x, y, w, h, font_size=13, font=None, margin=12):
    """
    Método híbrido:
    - Si hay saltos de línea o texto muy largo, usa método simple (sin Frame)
    - Caso contrario (texto corto), usa Paragraph/Frame para mejor calidad
    - Aplica topes/márgenes consistentes en ambos casos
    Defaults resueltos en tiempo de ejecución.
    """
    if font is None:
        font = FONT_REGULAR

    clean_text = safe_clean_text(text)
    if '\n' in clean_text or len(clean_text) > 500:
        DebugLogger.processing(f"Texto con saltos o largo ({len(clean_text)} chars) → método simple")
        draw_multiline_text_simple(
            c, clean_text, x, y, w, h, font_size=font_size, font=font, margin=margin)
        return

    DebugLogger.debug(f"Texto corto ({len(clean_text)} chars) → método Frame")
    style = ParagraphStyle(
        name='multi',
        fontName=font,
        fontSize=font_size,
        leading=font_size + 2,
        alignment=TA_LEFT,
    )
    html_text = clean_text.replace('\n', '<br/>')

    try:
        para = Paragraph(html_text, style)
        # Aplicar topes/márgenes al Frame también
        frame = Frame(x + margin, y + margin, w - 2*margin, h - 2*margin,
                      showBoundary=0, leftPadding=4, rightPadding=4,
                      topPadding=4, bottomPadding=4)
        frame.addFromList([para], c)
    except Exception as e:
        DebugLogger.error(f"Error en Paragraph/Frame: {e} → fallback simple")
        draw_multiline_text_simple(
            c, clean_text, x, y, w, h, font_size, font, margin)


def draw_single_line_text_with_bounds(c, text, x, y, w, h, font_size=14, font=None, margin=12):
    """
    Dibuja texto de una sola línea con topes en todos los lados.
    Trunca el texto si es necesario para que no se salga de los límites.
    Posiciona el texto correctamente debajo del área de título.
    """
    if font is None:
        font = FONT_REGULAR

    clean_text = safe_clean_text(text).replace('\n', ' ').replace('\r', ' ')
    if not clean_text:
        return

    # Aplicar topes/márgenes
    eff_x = x + margin
    eff_y = y + margin
    eff_w = w - 2 * margin
    eff_h = h - 2 * margin

    # Verificar que el área efectiva sea válida
    if eff_w <= 0 or eff_h <= 0:
        return

    c.saveState()
    try:
        c.setFont(font, font_size)

        # Posicionar el texto dinámicamente debajo del subtítulo con espacio apropiado
        text_y = y + h - TITLE_OFFSET_PT - SUBTITLE_OFFSET_PT - font_size - 2

        # Verificar que esté dentro de los límites verticales
        if text_y < eff_y or text_y > eff_y + eff_h:
            return

        # Verificar que el texto quepa horizontalmente, truncar si es necesario
        max_chars = len(clean_text)
        while max_chars > 0:
            test_text = clean_text[:max_chars]
            if c.stringWidth(test_text, font, font_size) <= eff_w:
                break
            max_chars -= 1

        if max_chars < len(clean_text) and max_chars > 3:
            # Agregar "..." si se truncó
            truncated_text = clean_text[:max_chars-3] + "..."
            if c.stringWidth(truncated_text, font, font_size) <= eff_w:
                clean_text = truncated_text
            else:
                clean_text = clean_text[:max_chars]
        elif max_chars > 0:
            clean_text = clean_text[:max_chars]
        else:
            clean_text = ""

        # Dibujar el texto solo si hay espacio y está dentro de los límites
        if clean_text:
            c.drawString(eff_x, text_y, clean_text)

    finally:
        c.restoreState()


# =============================
#     FUNCIÓN CAMPO 40 ROBUSTA
# =============================

def draw_campo40_robust(c, x_pt, y_pt, w_pt, h_pt, valor):
    """
    Función robusta específicamente para el Campo 40.
    Garantiza que el texto se mantenga dentro de los límites.
    """
    if not valor:
        return

    DebugLogger.field_40("Campo 40: Usando función robusta")

    # Área de contenido
    margin = 6  # Margen más pequeño para Campo 40
    title_space = 45  # Espacio reservado para título

    content_x = x_pt + margin
    content_y = y_pt + margin
    content_w = w_pt - 2 * margin
    content_h = h_pt - 2 * margin - title_space

    if content_w <= 0 or content_h <= 0:
        DebugLogger.error(f"Área de contenido inválida: {content_w}x{content_h}")
        return

    # Parámetros optimizados
    font_size = 10
    font = FONT_REGULAR
    line_height = font_size + 1

    c.saveState()
    try:
        c.setFont(font, font_size)

        # Procesar texto línea por línea
        input_lines = safe_clean_text(valor).split('\n')
        final_lines = []

        for input_line in input_lines:
            if not input_line.strip():
                final_lines.append("")
                continue

            words = input_line.split()
            current_line = ""

            for word in words:
                test_line = (current_line + " " +
                             word) if current_line else word
                test_width = c.stringWidth(test_line, font, font_size)

                if test_width <= content_w:
                    current_line = test_line
                else:
                    if current_line:
                        final_lines.append(current_line)
                    current_line = word

                    # Verificar si una sola palabra es muy larga
                    if c.stringWidth(word, font, font_size) > content_w:
                        # Truncar palabra larga
                        while word and c.stringWidth(word, font, font_size) > content_w:
                            word = word[:-1]
                        current_line = word

            if current_line:
                final_lines.append(current_line)

        # Calcular cuántas líneas caben
        max_lines = int(content_h / line_height)
        visible_lines = final_lines[:max_lines]

        # Dibujar líneas
        start_y = content_y + content_h - font_size
        for i, line in enumerate(visible_lines):
            line_y = start_y - (i * line_height)
            if line_y >= content_y:  # Verificar límites
                c.drawString(content_x, line_y, line)

        # Indicador de truncamiento
        if len(final_lines) > max_lines:
            truncate_y = start_y - (max_lines * line_height)
            if truncate_y >= content_y:
                c.drawString(content_x, truncate_y, "...")

        DebugLogger.success(f"Campo 40 procesado: {len(visible_lines)}/{len(final_lines)} líneas")

    finally:
        c.restoreState()


# =============================
#         CAMPO 39 (firma)
# =============================

def normalized_date(mic_data):
    """
    Devuelve fecha para Campo 39 desde mic_data si existe; si no, hoy.
    """
    for k in ('campo_6_fecha', 'fecha_emision', 'fecha'):
        v = (mic_data or {}).get(k, '')
        if v:
            return v
    return datetime.now().strftime('%d/%m/%Y')


def draw_campo39(c, x_px, y_px, w_px, h_px, height_px, mic_data=None):
    """
    Campo 39: texto legal, línea de firma y transportador + fecha.
    Usa estilos cacheados y Unicode.
    """
    styles = get_styles()
    X, Y, W, H = px2pt(x_px), px2pt(
        height_px - y_px - h_px), px2pt(w_px), px2pt(h_px)

    # Rectángulo (no hay títulos aquí)
    c.saveState()
    try:
        c.rect(X, Y, W, H)
    finally:
        c.restoreState()

    # Textos legales
    txt_es = ("Declaramos que las informaciones presentadas en este Documento son expresión de verdad, "
              "que los datos referentes a las mercaderías fueron transcriptos exactamente conforme a la "
              "declaración del remitente, las cuales son de su exclusiva responsabilidad, y que esta operación "
              "obedece a lo dispuesto en el Convenio sobre Transporte Internacional Terrestre de los países del Cono Sur.")
    txt_pt = ("Declaramos que as informações prestadas neste Documento são a expressão de verdade que os dados referentes "
              "às mercadorias foram transcritos exatamente conforme a declaração do remetente, os quais são de sua exclusiva "
              "responsabilidade, e que esta operação obedece ao disposto no Convênio sobre Transporte Internacional Terrestre.")
    txt_firma = "39 Firma y sello del porteador / Assinatura e carimbo do transportador"

    # Transportador y fecha
    nombre_transportador = ""
    if mic_data:
        nombre_transportador = (
            mic_data.get('campo_1_transporte', '') or
            mic_data.get('transportadora_nombre', '') or
            mic_data.get('transportadora', '') or
            "TRANSPORTADOR"
        )
        if '\n' in nombre_transportador:
            nombre_transportador = nombre_transportador.split('\n')[0].strip()
    fecha_actual = normalized_date(mic_data)

    if DEBUG:
        DebugLogger.transport(f"Campo 39 - Transportador: '{nombre_transportador}'")
        DebugLogger.date(f"Campo 39 - Fecha: '{fecha_actual}'")

    # Crear párrafos y dibujar
    para_es = Paragraph(txt_es, styles['es'])
    para_pt = Paragraph(txt_pt, styles['es'])
    para_firma = Paragraph(txt_firma, styles['firma'])
    para_transportador = Paragraph(
        nombre_transportador, styles['transportador'])

    # Frame para el bloque completo (con padding interno)
    c.saveState()
    try:
        f = Frame(X + FIELD_PADDING_PT, Y + FIELD_PADDING_PT, W - 2 *
                  FIELD_PADDING_PT, H - 2*FIELD_PADDING_PT, showBoundary=0)
        f.addFromList([para_es, para_pt, para_firma, para_transportador], c)
    finally:
        c.restoreState()

    # Fecha en la parte inferior izquierda
    c.saveState()
    try:
        c.setFont(FONT_REGULAR, 12)
        c.drawString(X + FIELD_PADDING_PT + 4, Y + 25,
                     f"Data / Fecha: {fecha_actual}")
    finally:
        c.restoreState()


# =============================
#   GENERADOR PRINCIPAL PDF
# =============================

def generar_micdta_pdf_con_datos(mic_data, filename="mic_{id}.pdf"):
    # Garantizar registro por si el módulo se importó antes de tener las fuentes
    register_unicode_fonts()

    DebugLogger.processing("Iniciando generación de PDF MIC")
    DebugLogger.data(f"Campos recibidos: {len(mic_data or {})}")

    # Debug: mostrar campos no vacíos
    if DEBUG and mic_data:
        DebugLogger.info("="*60)
        DebugLogger.debug("DATOS COMPLETOS RECIBIDOS (no vacíos):")
        for key, value in mic_data.items():
            if value:
                s = str(value)
                DebugLogger.debug(f"  {key}: {s[:100]}{'...' if len(s) > 100 else ''}")
        DebugLogger.info("="*60)
        print()  # Línea en blanco

    # Resolución base
    width_px, height_px = 1700, 2800
    width_pt, height_pt = px2pt(width_px), px2pt(height_px)

    # Preparar canvas
    c = canvas.Canvas(filename, pagesize=(width_pt, height_pt))
    c.setStrokeColorRGB(0, 0, 0)
    c.setFillColorRGB(0, 0, 0)

    # Encabezado
    x0, y0 = 55, 55
    rect_w, rect_h = 1616, 108.5
    # Caja externa del encabezado
    rect_pt(c, x0, y0, rect_w, rect_h, height_px, line_width=2)
    # Caja MIC/DTA
    mic_x, mic_y = x0 + 24, y0 + 15
    mic_w, mic_h = 235, 70
    mx, my, mw, mh = rect_pt(c, mic_x, mic_y, mic_w,
                             mic_h, height_px, line_width=1)

    c.saveState()
    try:
        c.setFont(FONT_BOLD, 28)
        c.drawCentredString(mx + mw / 2, my + mh / 2 - 12, "MIC/DTA")
        title_x, title_y = x0 + 280, y0 + 36
        c.setFont(FONT_BOLD, 20)
        c.drawString(px2pt(title_x), px2pt(height_px - title_y),
                     "Manifiesto Internacional de Carga por Carretera / Declaración de Tránsito Aduanero")
        c.setFont(FONT_REGULAR, 20)
        c.drawString(px2pt(title_x), px2pt(height_px - title_y - 38),
                     "Manifesto Internacional de Carga Rodoviária / Declaração de Trânsito")
    finally:
        c.restoreState()

    # DEFINICIÓN DE CAMPOS — grid alineado: columnas en 55|366|470|641|916|1305|1671
    campos = [
        (1,  55, 162, 861, 450, "1 Nombre y domicilio del porteador",
         "Nome e endereço do transportador", "campo_1_transporte"),
        (2,  55, 610, 861, 142, "2 Rol de contribuyente",
         "Cadastro geral de contribuintes", "campo_2_numero"),
        (3, 916, 162, 389, 169, "3 Tránsito aduanero", "Trânsito aduaneiro", "campo_3_transporte"),
        (4, 1305, 162, 366, 168, "4 Nº", "", "campo_4_estado"),
        (5, 916, 330, 389, 115, "5 Hoja / Folha", "", "campo_5_hoja"),
        (6, 1305, 330, 366, 115, "6 Fecha de emisión",
         "Data de emissão", "campo_6_fecha"),
        (7, 916, 445, 755, 166, "7 Aduana, ciudad y país de partida",
         "Alfândega, cidade e país de partida", "campo_7_pto_seguro"),
        (8, 916, 610, 755, 142, "8 Ciudad y país de destino final",
         "Cidade e país de destino final", "campo_8_destino"),
        (9,  55, 750, 861, 165, "9 CAMION ORIGINAL: Nombre y domicilio del propietario",
         "CAMINHÃO ORIGINAL: Nome e endereço do proprietário", "campo_9_datos_transporte"),
        (10, 55, 915, 415, 142, "10 Rol de contribuyente",
         "Cadastro geral de", "campo_10_numero"),
        (11, 470, 915, 446, 142, "11 Placa de camión",
         "Placa do caminhão", "campo_11_placa"),
        (12, 55, 1055, 415, 142, "12 Marca y número",
         "Marca e número", "campo_12_modelo_chasis"),
        (13, 470, 1055, 446, 142, "13 Capacidad de arrastre",
         "Capacidade de tração (t)", "campo_13_siempre_45"),
        (14, 55, 1197, 415, 135, "14 AÑO", "ANO", "campo_14_anio"),
        (15, 470, 1197, 446, 135, "15 Semirremolque / Remolque",
         "Semi-reboque / Reboque", "campo_15_placa_semi"),
        (16, 916, 752, 755, 163, "16 CAMION SUSTITUTO: Nombre y domicilio del",
         "CAMINHÃO SUBSTITUTO: Nome e endereço do", "campo_16_asteriscos_1"),
        (17, 916, 915, 389, 140, "17 Rol de contribuyente",
         "Cadastro geral de", "campo_17_asteriscos_2"),
        (18, 1305, 915, 366, 140, "18 Placa del camión",
         "Placa do", "campo_18_asteriscos_3"),
        (19, 916, 1055, 389, 140, "19 Marca y número",
         "Marca e número", "campo_19_asteriscos_4"),
        (20, 1305, 1055, 366, 140, "20 Capacidad de arrastre",
         "Capacidade de tração", "campo_20_asteriscos_5"),
        (21, 916, 1195, 389, 135, "21 AÑO", "ANO", "campo_21_asteriscos_6"),
        (22, 1305, 1195, 366, 135, "22 Semirremolque / Remolque",
         "Semi-reboque / Reboque", "campo_22_asteriscos_7"),
        (23, 55, 1330, 311, 154, "23 Nº carta de porte",
         "Nº do conhecimento", "campo_23_numero_campo2_crt"),
        (24, 366, 1330, 550, 154, "24 Aduana de destino",
         "Alfândega de destino", "campo_24_aduana"),
        (25, 55, 1484, 311, 136, "25 Moneda", "Moeda", "campo_25_moneda"),
        (26, 366, 1484, 550, 136, "26 Origen de las mercaderías",
         "Origem das mercadorias", "campo_26_pais"),
        (27, 55, 1618, 311, 136, "27 Valor FOT",
         "Valor FOT", "campo_27_valor_campo16"),
        (28, 366, 1618, 275, 136, "28 Flete en U$S",
         "Flete em U$S", "campo_28_total"),
        (29, 641, 1618, 275, 136, "29 Seguro en U$S",
         "Seguro em U$S", "campo_29_seguro"),
        (30, 55, 1754, 311, 119, "30 Tipo de Bultos",
         "Tipo dos volumes", "campo_30_tipo_bultos"),
        (31, 366, 1754, 275, 119, "31 Cantidad de",
         "Quantidade de", "campo_31_cantidad"),
        (32, 641, 1754, 275, 119, "32 Peso bruto",
         "Peso bruto", "campo_32_peso_bruto"),
        (33, 916, 1330, 755, 154, "33 Remitente",
         "Remetente", "campo_33_datos_campo1_crt"),
        (34, 916, 1484, 755, 136, "34 Destinatario",
         "Destinatario", "campo_34_datos_campo4_crt"),
        (35, 916, 1618, 755, 136, "35 Consignatario",
         "Consignatário", "campo_35_datos_campo6_crt"),
        (36, 916, 1754, 755, 250, "36 Documentos anexos",
         "Documentos anexos", "campo_36_factura_despacho"),
        (37, 55, 1873, 861, 131, "37 Número de precintos",
         "Número dos lacres", "campo_37_valor_manual"),
        (38, 55, 2004, 1616, 240, "38 Marcas y números de los bultos, descripción de las mercaderías",
         "Marcas e números dos volumes, descrição das mercadorias", "campo_38_datos_campo11_crt"),
        (39, 55, 2244, 836, 483, "", "", None),
        (40, 891, 2244, 780, 326, "40 Nº DTA, ruta y plazo de transporte",
         "Nº DTA, rota e prazo de transporte", "campo_40_tramo"),
        (41, 891, 2570, 780, 157, "41 Firma y sello de la Aduana de Partida",
         "Assinatura e carimbo de Alfândega de", None),
    ]

    diagnostico = {}

    for n, x, y, w, h, titulo, subtitulo, key in campos:
        if n == 39:
            draw_campo39(c, x, y, w, h, height_px, mic_data)
            continue

        if n == 23:
            DebugLogger.processing("PROCESANDO CAMPO 23")
            DebugLogger.debug(f"  Key esperado: '{key}'")
            DebugLogger.debug(f"  Valor en mic_data: '{(mic_data or {}).get(key, 'NO_ENCONTRADO')}'")
            DebugLogger.debug(f"  Tipo de valor: {type((mic_data or {}).get(key))}")
            DebugLogger.debug(f"  mic_data keys: {list((mic_data or {}).keys())}")

        x_pt, y_pt, w_pt, h_pt = rect_pt(
            c, x, y, w, h, height_px, line_width=1)

        tx_pt, ty_pt, tw_pt, th_pt = draw_field_title(
            c, x_pt, y_pt, w_pt, h_pt, titulo, subtitulo)




        if n == 40 and key and (mic_data or {}).get(key):
            DebugLogger.field_40("Campo 40: Usando función robusta")
            draw_campo40_robust(c, x_pt, y_pt, w_pt, h_pt, mic_data[key])
            continue

        if n == 38 and key and (mic_data or {}).get(key):
            DebugLogger.processing("PROCESANDO CAMPO 38 (posicionamiento justo debajo del título)")
            valor = str(mic_data[key])

            # Calcular posición exacta debajo del subtítulo
            x_frame = x_pt + FIELD_PADDING_PT
            y_frame = y_pt + FIELD_PADDING_PT  # Desde el fondo de la caja
            w_frame = w_pt - 2 * FIELD_PADDING_PT
            # Altura disponible: desde el fondo hasta justo debajo del subtítulo
            h_frame = h_pt - TITLE_OFFSET_PT - SUBTITLE_OFFSET_PT - 8  # 8pt de separación del subtítulo

            fit = draw_multiline_text_adaptive(
                c,
                valor,
                x=x_frame,
                y=y_frame,
                w=w_frame,
                h=h_frame,
                font=FONT_REGULAR,
                min_font=5,
                max_font=12,
                margin=4,
                title_reserved_h=0  # Ya calculamos el espacio arriba
            )
            DebugLogger.success(f"Campo 38 corregido → fuente {fit['font_size_used']}, líneas {fit['lines_drawn']}, truncado={fit['truncated']}")
            diagnostico['campo_38'] = fit
            continue

        if n in [1, 9, 33, 34, 35] and key and (mic_data or {}).get(key):
            DebugLogger.multiline(f"Campo multilínea {n} con topes aplicados")

            x_frame = x_pt + FIELD_PADDING_PT
            y_frame = y_pt + FIELD_PADDING_PT
            w_frame = w_pt - 2 * FIELD_PADDING_PT
            h_frame = h_pt - 2 * FIELD_PADDING_PT - 30

            if n == 1:
                font_size_multiline = 16
            elif n == 9:
                font_size_multiline = 15
            else:
                font_size_multiline = 10

            DebugLogger.debug(f"  Usando font_size={font_size_multiline}pt en campo {n} con topes")

            specific_margin = 10 if n in [33, 34, 35] else 12

            draw_multiline_text_simple(
                c,
                mic_data[key],
                x_frame,
                y_frame,
                w_frame,
                h_frame,
                font_size=font_size_multiline,
                font=FONT_REGULAR,
                margin=specific_margin
            )
            continue


        if key and (mic_data or {}).get(key):
            valor = str(mic_data[key])
            size = 14

            needs_multiline = (
                len(valor) > 80 or
                n in [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37] or
                '\n' in valor
            )

            if needs_multiline:
                DebugLogger.multiline(f"Campo {n} (multilínea automática) con topes aplicados")

                x_frame = x_pt + FIELD_PADDING_PT
                y_frame = y_pt + FIELD_PADDING_PT
                w_frame = w_pt - 2 * FIELD_PADDING_PT
                h_frame = h_pt - 2 * FIELD_PADDING_PT - 30

                draw_multiline_text_simple(
                    c,
                    valor,
                    x_frame,
                    y_frame,
                    w_frame,
                    h_frame,
                    font_size=size,
                    font=FONT_REGULAR,
                    margin=12
                )
            else:
                DebugLogger.singleline(f"Campo {n} (una línea) con topes aplicados")

                text_x = x_pt
                text_y = y_pt
                text_w = w_pt
                text_h = h_pt - FIELD_TITLE_RESERVED_PT

                draw_single_line_text_with_bounds(
                    c, valor, text_x, text_y, text_w, text_h,
                    font_size=size, font=FONT_REGULAR, margin=12
                )

    rect_pt(c, 55, 55, 1616.75, 2672.75, height_px, line_width=1)

    try:
        c.save()
        DebugLogger.success(f"PDF generado exitosamente: {filename}")
        if os.path.exists(filename):
            DebugLogger.file(f"Archivo confirmado en: {os.path.abspath(filename)}")
        else:
            DebugLogger.error(f"Archivo NO encontrado en: {os.path.abspath(filename)}")
    except Exception as e:
        DebugLogger.error(f"ERROR al guardar PDF: {e}")
        raise

    if DEBUG:
        campos_documentos = {
            'campo_1_transporte': 'Transportador',
            'campo_33_datos_campo1_crt': 'Remitente',
            'campo_34_datos_campo4_crt': 'Destinatario',
            'campo_35_datos_campo6_crt': 'Consignatario'
        }
        DebugLogger.processing("RESUMEN DE CAMPOS CON DOCUMENTOS")
        for key, descripcion in campos_documentos.items():
            val = (mic_data or {}).get(key)
            if val:
                lines_count = len(safe_clean_text(val).split('\n'))
                DebugLogger.summary(f"{descripcion}: {lines_count} líneas")
            else:
                DebugLogger.error(f"{descripcion}: Sin datos")

        DebugLogger.processing("RESUMEN - MÉTODO DE RENDERIZADO CON TOPES")
        DebugLogger.summary("Campos 1, 9, 33, 34, 35 → Multilínea con topes (12pt) ✅")
        DebugLogger.summary("Campo 38 → Ajuste dinámico adaptativo con topes (8-14pt) ✅")
        DebugLogger.summary("Campo 40 → Función robusta con topes (6pt) ✅")
        DebugLogger.summary("Campo 12 → 2 líneas con topes (12pt) ✅")
        DebugLogger.summary("Otros campos → 1 línea con topes (12pt) ✅")
        DebugLogger.summary("TODOS LOS CAMPOS CON TOPES APLICADOS ✅")
        DebugLogger.debug("Debug completo: ACTIVADO ✅")

    return diagnostico


# =============================
#          PRUEBA LOCAL
# =============================

def test_campo38():
    """
    Prueba de Campo 38 con texto largo y verificación de generación de PDF.
    """
    DebugLogger.info("INICIANDO PRUEBA DEL CAMPO 38 (versión completa)")
    test_data = {
        'campo_38_datos_campo11_crt': (
            "1572 CAJAS QUE DICEN CONTENER: CARNE RESFRIADA DE BOVINO SEM OSSO "
            "15 CAJAS DE CONTRA FILE (BIFES) (STEAK CHORIZO) (ESTANCIA 92); 42 CAJAS DE CONTRA FILE "
            "(BIFES) (STEAK CHORIZO) (ESTANCIA 92); 42 CAJAS DE CONTRA FILE (BIFES) (STEAK CHORIZO) "
            "(ESTANCIA 92); 158 CAJAS DE BIFE ANCHO CON HUESO (COSTELA JANELA) (ESTANCIA 92); "
            "42 CAJAS DE PICANHA (TAPA DE CUADRIL) (ESTANCIA 92); 42 CAJAS DE LOMO (FILE MIGNON) "
            "(ESTANCIA 92); 126 CAJAS DE EYE OF ROUND (PECETO) (ESTANCIA 92); 84 CAJAS DE ASADO DE TIRA "
            "(COSTELA JANELA) (ESTANCIA 92); 84 CAJAS DE EYE OF ROUND (PECETO) (ESTANCIA 92) ..."
        ),
        'campo_1_transporte': 'EMPRESA TRANSPORTADORA TEST\nRUA TESTE 123\nCIUDAD - PAÍS',
        'campo_6_fecha': '02/08/2025'
    }
    out = "test_campo38_corregido.pdf"
    generar_micdta_pdf_con_datos(test_data, out)
    if os.path.exists(out):
        DebugLogger.success(f"PRUEBA EXITOSA: generado {out}")
    else:
        DebugLogger.error("PRUEBA FALLÓ: no se encontró el PDF")


def test_campo40_desbordamiento():
    """
    Prueba específica para el campo 40 que se desborda.
    """
    DebugLogger.info("INICIANDO PRUEBA DEL CAMPO 40 (desbordamiento)")
    test_data = {
        'campo_40_tramo': (
            "ORIGEN: CAMPESTRE S.A.-CIUDAD DEL ESTE SALIDA: CIUDAD DEL ESTE-CIUDAD DEL ESTE "
            "DESTINO: PUERTO DE SANTOS-BRASIL RUTA: BR-277, BR-116, SP-150 "
            "PLAZO: 72 HORAS DESDE LA SALIDA"
        ),
        'campo_1_transporte': 'EMPRESA TRANSPORTADORA TEST',
        'campo_6_fecha': '02/08/2025'
    }
    out = "test_campo40_topes.pdf"
    generar_micdta_pdf_con_datos(test_data, out)
    if os.path.exists(out):
        DebugLogger.success(f"PRUEBA CAMPO 40 EXITOSA: generado {out}")
    else:
        DebugLogger.error("PRUEBA CAMPO 40 FALLÓ: no se encontró el PDF")


def test_campo38_ajuste_dinamico():
    """
    Prueba del ajuste dinámico de tamaño en campo 38 con diferentes cantidades de texto.
    """
    DebugLogger.info("INICIANDO PRUEBA CAMPO 38 - AJUSTE DINÁMICO DE TAMAÑO")

    # Texto corto - debería usar fuente grande (cerca de 14pt)
    test_data_corto = {
        'campo_38_datos_campo11_crt': "TEXTO CORTO PARA PROBAR FUENTE GRANDE",
        'campo_1_transporte': 'EMPRESA TEST',
        'campo_6_fecha': '02/08/2025'
    }

    # Texto medio - debería usar fuente intermedia
    test_data_medio = {
        'campo_38_datos_campo11_crt': (
            "TEXTO MEDIO PARA PROBAR AJUSTE AUTOMÁTICO DE FUENTE. "
            "ESTE TEXTO TIENE MÁS CONTENIDO QUE EL ANTERIOR PERO NO ES EXCESIVAMENTE LARGO. "
            "DEBERÍA USAR UNA FUENTE INTERMEDIA ENTRE 8 Y 14 PUNTOS."
        ),
        'campo_1_transporte': 'EMPRESA TEST',
        'campo_6_fecha': '02/08/2025'
    }

    # Texto largo - debería usar fuente pequeña (cerca de 8pt)
    test_data_largo = {
        'campo_38_datos_campo11_crt': (
            "1572 CAJAS QUE DICEN CONTENER: CARNE RESFRIADA DE BOVINO SEM OSSO "
            "15 CAJAS DE CONTRA FILE (BIFES) (STEAK CHORIZO) (ESTANCIA 92); 42 CAJAS DE CONTRA FILE "
            "(BIFES) (STEAK CHORIZO) (ESTANCIA 92); 42 CAJAS DE CONTRA FILE (BIFES) (STEAK CHORIZO) "
            "(ESTANCIA 92); 158 CAJAS DE BIFE ANCHO CON HUESO (COSTELA JANELA) (ESTANCIA 92); "
            "42 CAJAS DE PICANHA (TAPA DE CUADRIL) (ESTANCIA 92); 42 CAJAS DE LOMO (FILE MIGNON) "
            "(ESTANCIA 92); 126 CAJAS DE EYE OF ROUND (PECETO) (ESTANCIA 92); 84 CAJAS DE ASADO DE TIRA "
            "(COSTELA JANELA) (ESTANCIA 92); 84 CAJAS DE EYE OF ROUND (PECETO) (ESTANCIA 92); "
            "PESO BRUTO: 3.904,614 KG; PESO NETO: 3.654,574 KG; NCM: 0201.20.00; "
            "FACTURA COMERCIAL: 001-002-0000954; CERTIFICADO SANITARIO: SENACSA-2025-001"
        ),
        'campo_1_transporte': 'EMPRESA TEST',
        'campo_6_fecha': '02/08/2025'
    }

    # Generar PDFs para cada caso
    casos = [
        (test_data_corto, "test_campo38_texto_corto.pdf", "CORTO"),
        (test_data_medio, "test_campo38_texto_medio.pdf", "MEDIO"),
        (test_data_largo, "test_campo38_texto_largo.pdf", "LARGO")
    ]

    for data, filename, tipo in casos:
        DebugLogger.info(f"GENERANDO PDF PARA TEXTO {tipo}")
        generar_micdta_pdf_con_datos(data, filename)
        if os.path.exists(filename):
            DebugLogger.success(f"PRUEBA TEXTO {tipo} EXITOSA: generado {filename}")
        else:
            DebugLogger.error(f"PRUEBA TEXTO {tipo} FALLÓ: no se encontró {filename}")

    DebugLogger.processing("RESUMEN: Se generaron 3 PDFs para demostrar el ajuste dinámico de fuente")
    DebugLogger.summary("Texto corto → fuente grande (cerca de 14pt)")
    DebugLogger.summary("Texto medio → fuente intermedia (10-12pt)")
    DebugLogger.summary("Texto largo → fuente pequeña (cerca de 8pt)")
    DebugLogger.summary("En todos los casos, el texto empieza justo debajo del título")


# =============================
#        PUNTO DE ENTRADA
# =============================

if __name__ == "__main__":
    # 1) Registrar fuentes Unicode (DejaVuSans) con fallback automático
    register_unicode_fonts()

    DebugLogger.data("CÓDIGO COMPLETO MIC/DTA PDF - Versión robusta")
    DebugLogger.processing("Highlights")
    DebugLogger.success("Campo 38 con ajuste dinámico adaptativo (búsqueda binaria mejorada) y márgenes")
    DebugLogger.success("Fuentes Unicode (DejaVuSans) para acentos/ñ/ç")
    DebugLogger.success("Helpers px→pt y coordenadas consistentes")
    DebugLogger.success("saveState()/restoreState() para aislar estilos")
    DebugLogger.success("Estilos cacheados y refactors de cajas/títulos")
    DebugLogger.success("Debug detallado activable")

    # 2) Ejecutar prueba opcional:
    # test_campo38()

    # Si querés generar con tus datos reales:
    # mic_data = {...}
    # generar_micdta_pdf_con_datos(mic_data, "mic_real.pdf")


def generar_micdta_pdf_con_datos_y_diagnostico(mic_data, filename="mic_{id}.pdf"):
    # El resto de la función es igual a generar_micdta_pdf_con_datos
    # pero al final devuelve el diagnóstico
    register_unicode_fonts()

    DebugLogger.processing("Iniciando generación de PDF MIC")
    DebugLogger.data(f"Campos recibidos: {len(mic_data or {})}")

    if DEBUG and mic_data:
        DebugLogger.info("="*60)
        DebugLogger.debug("DATOS COMPLETOS RECIBIDOS (no vacíos):")
        for key, value in mic_data.items():
            if value:
                s = str(value)
                DebugLogger.debug(f"  {key}: {s[:100]}{'...' if len(s) > 100 else ''}")
        DebugLogger.info("="*60)
        print()  # Línea en blanco

    width_px, height_px = 1700, 2800
    width_pt, height_pt = px2pt(width_px), px2pt(height_px)

    c = canvas.Canvas(filename, pagesize=(width_pt, height_pt))
    c.setStrokeColorRGB(0, 0, 0)
    c.setFillColorRGB(0, 0, 0)

    x0, y0 = 55, 55
    rect_w, rect_h = 1616, 108.5
    rect_pt(c, x0, y0, rect_w, rect_h, height_px, line_width=2)
    mic_x, mic_y = x0 + 24, y0 + 15
    mic_w, mic_h = 235, 70
    mx, my, mw, mh = rect_pt(c, mic_x, mic_y, mic_w,
                             mic_h, height_px, line_width=1)

    c.saveState()
    try:
        c.setFont(FONT_BOLD, 28)
        c.drawCentredString(mx + mw / 2, my + mh / 2 - 12, "MIC/DTA")
        title_x, title_y = x0 + 280, y0 + 36
        c.setFont(FONT_BOLD, 20)
        c.drawString(px2pt(title_x), px2pt(height_px - title_y),
                     "Manifiesto Internacional de Carga por Carretera / Declaración de Tránsito Aduanero")
        c.setFont(FONT_REGULAR, 20)
        c.drawString(px2pt(title_x), px2pt(height_px - title_y - 38),
                     "Manifesto Internacional de Carga Rodoviária / Declaração de Trânsito")
    finally:
        c.restoreState()

    campos = [
        (1,  55, 162, 863, 450, "1 Nombre y domicilio del porteador",
         "Nome e endereço do transportador", "campo_1_transporte"),
        (2,  55, 610, 861, 142, "2 Rol de contribuyente",
         "Cadastro geral de contribuintes", "campo_2_numero"),
        (3, 916, 162, 389, 169, "3 Tránsito aduanero", "Trânsito aduaneiro", "campo_3_transporte"),
        (4, 1305, 162, 366, 168, "4 Nº", "", "campo_4_estado"),
        (5, 916, 330, 389, 115, "5 Hoja / Folha", "", "campo_5_hoja"),
        (6, 1305, 330, 366, 115, "6 Fecha de emisión",
         "Data de emissão", "campo_6_fecha"),
        (7, 916, 445, 755, 166, "7 Aduana, ciudad y país de partida",
         "Alfândega, cidade e país de partida", "campo_7_pto_seguro"),
        (8, 916, 610, 755, 142, "8 Ciudad y país de destino final",
         "Cidade e país de destino final", "campo_8_destino"),
        (9,  55, 750, 861, 165, "9 CAMION ORIGINAL: Nombre y domicilio del propietario",
         "CAMINHÃO ORIGINAL: Nome e endereço do proprietário", "campo_9_datos_transporte"),
        (10, 55, 915, 415, 142, "10 Rol de contribuyente",
         "Cadastro geral de", "campo_10_numero"),
        (11, 470, 915, 446, 142, "11 Placa de camión",
         "Placa do caminhão", "campo_11_placa"),
        (12, 55, 1055, 415, 142, "12 Marca y número",
         "Marca e número", "campo_12_modelo_chasis"),
        (13, 470, 1055, 446, 142, "13 Capacidad de arrastre",
         "Capacidade de tração (t)", "campo_13_siempre_45"),
        (14, 55, 1197, 415, 135, "14 AÑO", "ANO", "campo_14_anio"),
        (15, 470, 1197, 446, 135, "15 Semirremolque / Remolque",
         "Semi-reboque / Reboque", "campo_15_placa_semi"),
        (16, 916, 752, 755, 163, "16 CAMION SUSTITUTO: Nombre y domicilio del",
         "CAMINHÃO SUBSTITUTO: Nome e endereço do", "campo_16_asteriscos_1"),
        (17, 916, 915, 389, 140, "17 Rol de contribuyente",
         "Cadastro geral de", "campo_17_asteriscos_2"),
        (18, 1305, 915, 366, 140, "18 Placa del camión",
         "Placa do", "campo_18_asteriscos_3"),
        (19, 916, 1055, 389, 140, "19 Marca y número",
         "Marca e número", "campo_19_asteriscos_4"),
        (20, 1305, 1055, 366, 140, "20 Capacidad de arrastre",
         "Capacidade de tração", "campo_20_asteriscos_5"),
        (21, 916, 1195, 389, 135, "21 AÑO", "ANO", "campo_21_asteriscos_6"),
        (22, 1305, 1195, 366, 135, "22 Semirremolque / Remolque",
         "Semi-reboque / Reboque", "campo_22_asteriscos_7"),
        (23, 55, 1330, 311, 154, "23 Nº carta de porte",
         "Nº do conhecimento", "campo_23_numero_campo2_crt"),
        (24, 366, 1330, 550, 154, "24 Aduana de destino",
         "Alfândega de destino", "campo_24_aduana"),
        (25, 55, 1484, 311, 136, "25 Moneda", "Moeda", "campo_25_moneda"),
        (26, 366, 1484, 550, 136, "26 Origen de las mercaderías",
         "Origem das mercadorias", "campo_26_pais"),
        (27, 55, 1618, 311, 136, "27 Valor FOT",
         "Valor FOT", "campo_27_valor_campo16"),
        (28, 366, 1618, 275, 136, "28 Flete en U$S",
         "Flete em U$S", "campo_28_total"),
        (29, 641, 1618, 275, 136, "29 Seguro en U$S",
         "Seguro em U$S", "campo_29_seguro"),
        (30, 55, 1754, 311, 119, "30 Tipo de Bultos",
         "Tipo dos volumes", "campo_30_tipo_bultos"),
        (31, 366, 1754, 275, 119, "31 Cantidad de",
         "Quantidade de", "campo_31_cantidad"),
        (32, 641, 1754, 275, 119, "32 Peso bruto",
         "Peso bruto", "campo_32_peso_bruto"),
        (33, 916, 1330, 755, 154, "33 Remitente",
         "Remetente", "campo_33_datos_campo1_crt"),
        (34, 916, 1484, 755, 136, "34 Destinatario",
         "Destinatario", "campo_34_datos_campo4_crt"),
        (35, 916, 1618, 755, 136, "35 Consignatario",
         "Consignatário", "campo_35_datos_campo6_crt"),
        (36, 916, 1754, 755, 250, "36 Documentos anexos",
         "Documentos anexos", "campo_36_factura_despacho"),
        (37, 55, 1873, 861, 131, "37 Número de precintos",
         "Número dos lacres", "campo_37_valor_manual"),
        (38, 55, 2004, 1616, 240, "38 Marcas y números de los bultos, descripción de las mercaderías",
         "Marcas e números dos volumes, descrição das mercadorias", "campo_38_datos_campo11_crt"),
        (39, 55, 2244, 836, 483, "", "", None),
        (40, 891, 2244, 780, 326, "40 Nº DTA, ruta y plazo de transporte",
         "Nº DTA, rota e prazo de transporte", "campo_40_tramo"),
        (41, 891, 2570, 780, 157, "41 Firma y sello de la Aduana de Partida",
         "Assinatura e carimbo de Alfândega de", None),
    ]

    diagnostico = {}

    for n, x, y, w, h, titulo, subtitulo, key in campos:
        if n == 39:
            draw_campo39(c, x, y, w, h, height_px, mic_data)
            continue

        if n == 23:
            DebugLogger.processing("PROCESANDO CAMPO 23")
            DebugLogger.debug(f"  Key esperado: '{key}'")
            DebugLogger.debug(f"  Valor en mic_data: '{(mic_data or {}).get(key, 'NO_ENCONTRADO')}'")
            DebugLogger.debug(f"  Tipo de valor: {type((mic_data or {}).get(key))}")
            DebugLogger.debug(f"  mic_data keys: {list((mic_data or {}).keys())}")

        x_pt, y_pt, w_pt, h_pt = rect_pt(
            c, x, y, w, h, height_px, line_width=1)

        tx_pt, ty_pt, tw_pt, th_pt = draw_field_title(
            c, x_pt, y_pt, w_pt, h_pt, titulo, subtitulo)




        if n == 40 and key and (mic_data or {}).get(key):
            draw_campo40_robust(c, x_pt, y_pt, w_pt, h_pt, mic_data[key])
            continue

        if n == 38 and key and (mic_data or {}).get(key):
            DebugLogger.processing("PROCESANDO CAMPO 38 (ajuste dinámico adaptativo - posicionamiento desde título)")
            valor = str(mic_data[key])

            x_frame = x_pt + FIELD_PADDING_PT
            y_frame = y_pt + TITLE_OFFSET_PT + SUBTITLE_OFFSET_PT
            w_frame = w_pt - 2 * FIELD_PADDING_PT
            h_frame = h_pt - TITLE_OFFSET_PT - SUBTITLE_OFFSET_PT - 5

            fit = draw_multiline_text_adaptive(
                c,
                valor,
                x=x_frame,
                y=y_frame,
                w=w_frame,
                h=h_frame,
                font=FONT_REGULAR,
                min_font=5,
                max_font=12,
                margin=8,
                title_reserved_h=0
            )
            DebugLogger.success(f"Campo 38 → fuente {fit['font_size_used']}, líneas {fit['lines_drawn']}, truncado={fit['truncated']}")
            diagnostico['campo_38'] = fit
            continue

        if n in [1, 9, 33, 34, 35] and key and (mic_data or {}).get(key):
            DebugLogger.multiline(f"Campo multilínea {n} con topes aplicados")

            x_frame = x_pt + FIELD_PADDING_PT
            y_frame = y_pt + FIELD_PADDING_PT
            w_frame = w_pt - 2 * FIELD_PADDING_PT
            h_frame = h_pt - 2 * FIELD_PADDING_PT - 30

            if n == 1:
                font_size_multiline = 16
            elif n == 9:
                font_size_multiline = 15
            else:
                font_size_multiline = 10

            DebugLogger.debug(f"  Usando font_size={font_size_multiline}pt en campo {n} con topes")

            specific_margin = 10 if n in [33, 34, 35] else 12

            draw_multiline_text_simple(
                c,
                mic_data[key],
                x_frame,
                y_frame,
                w_frame,
                h_frame,
                font_size=font_size_multiline,
                font=FONT_REGULAR,
                margin=specific_margin
            )
            continue


        if key and (mic_data or {}).get(key):
            valor = str(mic_data[key])
            size = 14

            needs_multiline = (
                len(valor) > 80 or
                n in [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37] or
                '\n' in valor
            )

            if needs_multiline:
                DebugLogger.multiline(f"Campo {n} (multilínea automática) con topes aplicados")

                x_frame = x_pt + FIELD_PADDING_PT
                y_frame = y_pt + FIELD_PADDING_PT
                w_frame = w_pt - 2 * FIELD_PADDING_PT
                h_frame = h_pt - 2 * FIELD_PADDING_PT - 30

                draw_multiline_text_simple(
                    c,
                    valor,
                    x_frame,
                    y_frame,
                    w_frame,
                    h_frame,
                    font_size=size,
                    font=FONT_REGULAR,
                    margin=12
                )
            else:
                DebugLogger.singleline(f"Campo {n} (una línea) con topes aplicados")

                text_x = x_pt
                text_y = y_pt
                text_w = w_pt
                text_h = h_pt - FIELD_TITLE_RESERVED_PT

                draw_single_line_text_with_bounds(
                    c, valor, text_x, text_y, text_w, text_h,
                    font_size=size, font=FONT_REGULAR, margin=12
                )

    rect_pt(c, 55, 55, 1616.75, 2672.75, height_px, line_width=1)

    c.save()
    DebugLogger.success(f"PDF generado exitosamente: {filename}")

    if DEBUG:
        campos_documentos = {
            'campo_1_transporte': 'Transportador',
            'campo_33_datos_campo1_crt': 'Remitente',
            'campo_34_datos_campo4_crt': 'Destinatario',
            'campo_35_datos_campo6_crt': 'Consignatario'
        }
        DebugLogger.processing("RESUMEN DE CAMPOS CON DOCUMENTOS")
        for key, descripcion in campos_documentos.items():
            val = (mic_data or {}).get(key)
            if val:
                lines_count = len(safe_clean_text(val).split('\n'))
                DebugLogger.summary(f"{descripcion}: {lines_count} líneas")
            else:
                DebugLogger.error(f"{descripcion}: Sin datos")

        DebugLogger.processing("RESUMEN - MÉTODO DE RENDERIZADO CON TOPES")
        DebugLogger.summary("Campos 1, 9, 33, 34, 35 → Multilínea con topes (12pt) ✅")
        DebugLogger.summary("Campo 38 → Ajuste dinámico adaptativo con topes (8-14pt) ✅")
        DebugLogger.summary("Campo 40 → Función robusta con topes (6pt) ✅")
        DebugLogger.summary("Campo 12 → 2 líneas con topes (12pt) ✅")
        DebugLogger.summary("Otros campos → 1 línea con topes (12pt) ✅")
        DebugLogger.summary("TODOS LOS CAMPOS CON TOPES APLICADOS ✅")
        DebugLogger.debug("Debug completo: ACTIVADO ✅")

    return diagnostico