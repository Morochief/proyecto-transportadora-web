# -*- coding: utf-8 -*-
"""
MIC/DTA PDF Generator - Versión completa y robusta
- Fuentes Unicode (DejaVuSans) con fallback automático
- Helpers px→pt y coordenadas consistentes (solo trabajamos en pt dentro de dibujo)
- Ajuste de texto con búsqueda binaria (Campo 38) + márgenes y reservas de título
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
# distancia desde el borde superior de la caja para el título
TITLE_OFFSET_PT = 24
# distancia adicional para subtítulo desde el título
SUBTITLE_OFFSET_PT = 16
FIELD_PADDING_PT = 8               # padding interno general de cajas
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


def log(msg):
    if DEBUG:
        print(msg)


def safe_clean_text(text: str) -> str:
    """
    Limpieza universal: normaliza saltos de línea y remueve caracteres de control problemáticos
    (excepto \n y \t). NO elimina acentos ni caracteres Unicode válidos.
    """
    if text is None:
        return ""
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
            log("ℹ️ Fuentes DejaVuSans ya registradas.")
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
            log(f"✅ Fuentes Unicode registradas: {reg_path}, {bold_path}")
        else:
            # Si no encontramos ambas, caer a Helvetica
            FONT_REGULAR = FALLBACK_REGULAR
            FONT_BOLD = FALLBACK_BOLD
            log("⚠️ No se encontraron DejaVuSans TTF; usando Helvetica como fallback.")
    except Exception as e:
        FONT_REGULAR = FALLBACK_REGULAR
        FONT_BOLD = FALLBACK_BOLD
        log(
            f"⚠️ No se pudieron registrar TTF Unicode ({e}); usando Helvetica.")


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

def fit_text_box(c, text, x, y, w, h, font=None, min_font=8, max_font=14, leading_ratio=1.3, margin=12):
    """
    Ajusta texto a un rectángulo (pt) con búsqueda binaria de tamaño de fuente.
    Respeta saltos de línea del usuario y hace wrap por palabras.
    Dibuja el texto al final. Devuelve dict con info de renderizado.
    """
    if font is None:
        font = FONT_REGULAR

    text = safe_clean_text(text)
    if not text:
        return {'font_size_used': min_font, 'lines_drawn': 0, 'truncated': False, 'effective_area': f"{w:.1f}x{h:.1f}"}

    eff_w = w - 2 * margin
    eff_h = h - 2 * margin
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
    while lo <= hi:
        mid = (lo + hi) // 2
        lines = wrap_for_size(mid)
        lh = mid * leading_ratio
        total_h = lh * len(lines)
        if total_h <= eff_h:
            best_sz, best_lines = mid, lines
            lo = mid + 1
        else:
            hi = mid - 1

    c.saveState()
    try:
        c.setFont(font, best_sz)
        lh = best_sz * leading_ratio
        start_x = x + margin
        start_y = y + h - margin - best_sz

        max_lines = int(eff_h // lh) if lh > 0 else 0
        drawn = best_lines[:max_lines]
        truncated = len(best_lines) > max_lines

        for i, ln in enumerate(drawn):
            line_y = start_y - i * lh
            if line_y < y + margin:
                break
            c.drawString(start_x, line_y, ln)

        if truncated and drawn:
            c.drawString(start_x, start_y - max_lines * lh, "...")

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

def draw_multiline_text_simple(c, text, x, y, w, h, font_size=9, font=None):
    """
    Método simple con manejo explícito de \n (sin Frame).
    Envuelve por palabras respetando el ancho.
    Defaults resueltos en tiempo de ejecución.
    """
    if font is None:
        font = FONT_REGULAR

    clean_text = safe_clean_text(text)

    c.saveState()
    try:
        c.setFont(font, font_size)
        manual_lines = clean_text.split('\n')

        all_lines = []
        max_width = w - 10  # márgenes laterales
        for manual_line in manual_lines:
            if not manual_line.strip():
                all_lines.append("")
                continue

            words = manual_line.split()
            current_line = ""

            for word in words:
                test_line = (current_line + " " +
                             word) if current_line else word
                if c.stringWidth(test_line, font, font_size) <= max_width:
                    current_line = test_line
                else:
                    if current_line:
                        all_lines.append(current_line)
                    current_line = word

            if current_line:
                all_lines.append(current_line)

        line_height = font_size + 2
        max_lines = int((h - 10) / line_height)
        visible_lines = all_lines[:max_lines]

        start_y = y + h - 15
        for i, line in enumerate(visible_lines):
            line_y = start_y - (i * line_height)
            c.drawString(x + 5, line_y, line)

        if len(all_lines) > max_lines:
            c.drawString(x + 5, start_y - (max_lines *
                         line_height), "... (continúa)")
    finally:
        c.restoreState()


def draw_multiline_text(c, text, x, y, w, h, font_size=13, font=None):
    """
    Método híbrido:
    - Si hay saltos de línea o texto muy largo, usa método simple (sin Frame)
    - Caso contrario (texto corto), usa Paragraph/Frame para mejor calidad
    Defaults resueltos en tiempo de ejecución.
    """
    if font is None:
        font = FONT_REGULAR

    clean_text = safe_clean_text(text)
    if '\n' in clean_text or len(clean_text) > 500:
        log(f"🎯 Texto con saltos o largo ({len(clean_text)} chars) → método simple")
        draw_multiline_text_simple(
            c, clean_text, x, y, w, h, font_size=font_size, font=font)
        return

    log(f"🔍 Texto corto ({len(clean_text)} chars) → método Frame")
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
        frame = Frame(x, y, w, h, showBoundary=0, leftPadding=4,
                      rightPadding=4, topPadding=4, bottomPadding=4)
        frame.addFromList([para], c)
    except Exception as e:
        log(f"❌ Error en Paragraph/Frame: {e} → fallback simple")
        draw_multiline_text_simple(c, clean_text, x, y, w, h, font_size, font)


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
        log(f"🚛 Campo 39 - Transportador: '{nombre_transportador}'")
        log(f"📅 Campo 39 - Fecha: '{fecha_actual}'")

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

    log("🔄 Iniciando generación de PDF MIC...")
    log(f"📋 Campos recibidos: {len(mic_data or {})}")

    # Debug: mostrar campos no vacíos
    if DEBUG and mic_data:
        log("\n" + "="*50)
        log("🔍 DATOS COMPLETOS RECIBIDOS (no vacíos):")
        for key, value in mic_data.items():
            if value:
                s = str(value)
                log(f"  {key}: {s[:100]}{'...' if len(s) > 100 else ''}")
        log("="*50 + "\n")

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

    # Definición de campos (layout original)
    campos = [
        (1,  55, 162, 863, 450, "1 Nombre y domicilio del porteador",
         "Nome e endereço do transportador", "campo_1_transporte"),
        (2,  55, 610, 861, 142, "2 Rol de contribuyente",
         "Cadastro geral de contribuintes", "campo_2_numero"),
        (3, 916, 162, 389, 169, "3 Tránsito aduanero", "Trânsito aduaneiro", None),
        (4, 1305, 162, 365, 167, "4 Nº", "", "campo_4_estado"),
        (5, 916, 330, 388, 115, "5 Hoja / Folha", "", "campo_5_hoja"),
        (6, 1305, 330, 365, 115, "6 Fecha de emisión",
         "Data de emissão", "campo_6_fecha"),
        (7, 916, 445, 752, 166, "7 Aduana, ciudad y país de partida",
         "Alfândega, cidade e país de partida", "campo_7_pto_seguro"),
        (8, 916, 610, 752, 142, "8 Ciudad y país de destino final",
         "Cidade e país de destino final", "campo_8_destino"),
        (9,  55, 750, 861, 165, "9 CAMION ORIGINAL: Nombre y domicilio del propietario",
         "CAMINHÃO ORIGINAL: Nome e endereço do proprietário", "campo_9_datos_transporte"),
        (10, 55, 915, 417, 142, "10 Rol de contribuyente",
         "Cadastro geral de", "campo_10_numero"),
        (11, 470, 915, 445, 142, "11 Placa de camión",
         "Placa do caminhão", "campo_11_placa"),
        (12, 55, 1055, 417, 142, "12 Marca y número",
         "Marca e número", "campo_12_modelo_chasis"),
        (13, 470, 1055, 445, 142, "13 Capacidad de arrastre",
         "Capacidade de tração (t)", "campo_13_siempre_45"),
        (14, 55, 1197, 417, 135, "14 AÑO", "ANO", "campo_14_anio"),
        (15, 470, 1197, 445, 135, "15 Semirremolque / Remolque",
         "Semi-reboque / Reboque", "campo_15_placa_semi"),
        (16, 915, 752, 753, 163, "16 CAMION SUSTITUTO: Nombre y domicilio del",
         "CAMINHÃO SUBSTITUTO: Nome e endereço do", "campo_16_asteriscos_1"),
        (17, 915, 915, 395, 140, "17 Rol de contribuyente",
         "Cadastro geral de", "campo_17_asteriscos_2"),
        (18, 1310, 915, 360, 140, "18 Placa del camión",
         "Placa do", "campo_18_asteriscos_3"),
        (19, 915, 1055, 395, 140, "19 Marca y número",
         "Marca e número", "campo_19_asteriscos_4"),
        (20, 1310, 1055, 360, 140, "20 Capacidad de arrastre",
         "Capacidade de tração", "campo_20_asteriscos_5"),
        (21, 915, 1195, 395, 135, "21 AÑO", "ANO", "campo_21_asteriscos_6"),
        (22, 1310, 1195, 360, 135, "22 Semirremolque / Remolque",
         "Semi-reboque / Reboque", "campo_22_asteriscos_7"),
        (23, 55, 1330, 313, 154, "23 Nº carta de porte",
         "Nº do conhecimento", "campo_23_numero_campo2_crt"),
        (24, 366, 1330, 550, 154, "24 Aduana de destino",
         "Alfândega de destino", "campo_24_aduana"),
        (25, 55, 1482, 313, 136, "25 Moneda", "Moeda", "campo_25_moneda"),
        (26, 366, 1482, 550, 136, "26 Origen de las mercaderías",
         "Origem das mercadorias", "campo_26_pais"),
        (27, 55, 1618, 313, 136, "27 Valor FOT",
         "Valor FOT", "campo_27_valor_campo16"),
        (28, 366, 1618, 275, 136, "28 Flete en U$S",
         "Flete em U$S", "campo_28_total"),
        (29, 641, 1618, 275, 136, "29 Seguro en U$S",
         "Seguro em U$S", "campo_29_seguro"),
        (30, 55, 1754, 313, 119, "30 Tipo de Bultos",
         "Tipo dos volumes", "campo_30_tipo_bultos"),
        (31, 366, 1754, 275, 119, "31 Cantidad de",
         "Quantidade de", "campo_31_cantidad"),
        (32, 641, 1754, 275, 119, "32 Peso bruto",
         "Peso bruto", "campo_32_peso_bruto"),
        (33, 915, 1330, 753, 154, "33 Remitente",
         "Remetente", "campo_33_datos_campo1_crt"),
        (34, 915, 1482, 753, 136, "34 Destinatario",
         "Destinatario", "campo_34_datos_campo4_crt"),
        (35, 915, 1618, 753, 136, "35 Consignatario",
         "Consignatário", "campo_35_datos_campo6_crt"),
        (36, 915, 1754, 753, 250, "36 Documentos anexos",
         "Documentos anexos", "campo_36_factura_despacho"),
        (37, 55, 1873, 861, 131, "37 Número de precintos",
         "Número dos lacres", "campo_37_valor_manual"),
        (38, 55, 2004, 1613, 222, "38 Marcas y números de los bultos, descripción de las mercaderías",
         "Marcas e números dos volumes, descrição das mercadorias", "campo_38_datos_campo11_crt"),
        (39, 55, 2226, 838, 498, "", "", None),
        (40, 891, 2226, 780, 326, "40 Nº DTA, ruta y plazo de transporte",
         "Nº DTA, rota e prazo de transporte", "campo_40_tramo"),
        (41, 891, 2552, 780, 175, "41 Firma y sello de la Aduana de Partida",
         "Assinatura e carimbo de Alfândega de", None),
    ]

    # Loop de campos
    for n, x, y, w, h, titulo, subtitulo, key in campos:
        if n == 39:
            # Campo 39 especial
            draw_campo39(c, x, y, w, h, height_px, mic_data)
            continue

        # Caja
        x_pt, y_pt, w_pt, h_pt = rect_pt(
            c, x, y, w, h, height_px, line_width=1)

        # Títulos (si hay)
        tx_pt, ty_pt, tw_pt, th_pt = draw_field_title(
            c, x_pt, y_pt, w_pt, h_pt, titulo, subtitulo)

        # Campo 38: ajuste dinámico de fuente con reserva de título
        if n == 38:
            log(f"🎯 PROCESANDO CAMPO 38 (ajuste dinámico)")
            valor = (mic_data or {}).get(key, "")
            # zona de texto: respetar espacio para título+subtítulo
            fit = fit_text_box(
                c,
                valor,
                x=x_pt,
                y=y_pt + FIELD_TITLE_RESERVED_PT,     # bajar inicio de texto
                w=w_pt,
                h=h_pt - FIELD_TITLE_RESERVED_PT,      # descontar reserva
                font=FONT_REGULAR,
                min_font=8,
                max_font=14,
                leading_ratio=1.3,
                margin=12
            )
            log(f"✅ Campo 38 → fuente {fit['font_size_used']}, líneas {fit['lines_drawn']}, truncado={fit['truncated']}")
            continue

            # Campos multilínea con documentos (1, 9, 33, 34, 35)
        if n in [1, 9, 33, 34, 35] and key and (mic_data or {}).get(key):
            log(f"🖼️ Campo multilínea {n} (FORZADO método simple)")

            # Área interna segura para texto (debajo de título)
            x_frame = x_pt + FIELD_PADDING_PT
            y_frame = y_pt + FIELD_PADDING_PT
            w_frame = w_pt - 2 * FIELD_PADDING_PT
            h_frame = h_pt - 2 * FIELD_PADDING_PT - 30  # margen extra para no pisar títulos

            # 🔤 Tamaños específicos solicitados:
            #  - Campo 1: 16 pt
            #  - Campo 9: 15 pt
            #  - Otros multilínea (33,34,35): 10 pt
            if n == 1:
                font_size_multiline = 16
            elif n == 9:
                font_size_multiline = 15
            else:
                font_size_multiline = 10

            log(f"   ➜ Usando font_size={font_size_multiline}pt en campo {n}")

            # Usamos SIEMPRE el método simple para respetar el tamaño fijo
            draw_multiline_text_simple(
                c,
                mic_data[key],
                x_frame,
                y_frame,
                w_frame,
                h_frame,
                font_size=font_size_multiline,
                font=FONT_REGULAR
            )
            continue

        # Campo 12: lógica de 2 líneas si hay salto
        if n == 12 and key and (mic_data or {}).get(key):
            val = str(mic_data[key])
            lines = val.split('\n')
            c.saveState()
            try:
                if len(lines) >= 1:
                    c.setFont(FONT_REGULAR, 12)
                    c.drawString(tx_pt, y_pt + h_pt - TITLE_OFFSET_PT -
                                 SUBTITLE_OFFSET_PT - 34, lines[0][:80])
                if len(lines) >= 2 and lines[1].strip():
                    c.setFont(FONT_REGULAR, 11)
                    c.drawString(tx_pt, y_pt + h_pt - TITLE_OFFSET_PT -
                                 SUBTITLE_OFFSET_PT - 50, lines[1][:80])
            finally:
                c.restoreState()
            continue

        # Campos normales (una línea)
        if key and (mic_data or {}).get(key):
            valor = str(mic_data[key]).replace('\n', ' ').replace('\r', ' ')
            c.saveState()
            try:
                size = 14
                if n == 12 and len(valor) > 50:
                    size = 11
                c.setFont(FONT_REGULAR, size)
                c.drawString(tx_pt, y_pt + h_pt - TITLE_OFFSET_PT -
                             SUBTITLE_OFFSET_PT - 34, valor[:200])
            finally:
                c.restoreState()

    # Rectángulo grande externo
    rect_pt(c, 55, 55, 1616.75, 2672.75, height_px, line_width=1)

    c.save()
    log(f"✅ PDF generado exitosamente: {filename}")

    # Resumen final (opcional)
    if DEBUG:
        campos_documentos = {
            'campo_1_transporte': 'Transportador',
            'campo_33_datos_campo1_crt': 'Remitente',
            'campo_34_datos_campo4_crt': 'Destinatario',
            'campo_35_datos_campo6_crt': 'Consignatario'
        }
        log("🎯 RESUMEN DE CAMPOS CON DOCUMENTOS:")
        for key, descripcion in campos_documentos.items():
            val = (mic_data or {}).get(key)
            if val:
                lines_count = len(safe_clean_text(val).split('\n'))
                log(f"   📋 {descripcion}: {lines_count} líneas")
            else:
                log(f"   ❌ {descripcion}: Sin datos")

        log("🎯 RESUMEN - MÉTODO DE RENDERIZADO:")
        log("   📋 Campos 1, 9, 33, 34, 35 → Híbrido (Frame/simple) ✅")
        log("   📦 Campo 38 → Ajuste dinámico (búsqueda binaria) ✅")
        log("   📄 Otros campos → 1 línea")
        log("   🔍 Debug completo: ACTIVADO ✅")


# =============================
#          PRUEBA LOCAL
# =============================

def test_campo38():
    """
    Prueba de Campo 38 con texto largo y verificación de generación de PDF.
    """
    log("🧪 INICIANDO PRUEBA DEL CAMPO 38 (versión completa)")
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
        log(f"✅ PRUEBA EXITOSA: generado {out}")
    else:
        log("❌ PRUEBA FALLÓ: no se encontró el PDF")


# =============================
#        PUNTO DE ENTRADA
# =============================

if __name__ == "__main__":
    # 1) Registrar fuentes Unicode (DejaVuSans) con fallback automático
    register_unicode_fonts()

    log("📋 CÓDIGO COMPLETO MIC/DTA PDF - Versión robusta")
    log("🎯 Highlights:")
    log("   ✅ Campo 38 con ajuste dinámico (búsqueda binaria) y márgenes")
    log("   ✅ Fuentes Unicode (DejaVuSans) para acentos/ñ/ç")
    log("   ✅ Helpers px→pt y coordenadas consistentes")
    log("   ✅ saveState()/restoreState() para aislar estilos")
    log("   ✅ Estilos cacheados y refactors de cajas/títulos")
    log("   ✅ Debug detallado activable")

    # 2) Ejecutar prueba opcional:
    # test_campo38()

    # Si querés generar con tus datos reales:
    # mic_data = {...}
    # generar_micdta_pdf_con_datos(mic_data, "mic_real.pdf")
