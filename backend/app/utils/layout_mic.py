from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Frame
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT


def draw_campo39(c, x, y, w, h, height_px, pt_per_px):
    X = x * pt_per_px
    Y = (height_px - y - h) * pt_per_px
    W = w * pt_per_px
    H = h * pt_per_px

    styles = getSampleStyleSheet()
    style_es = ParagraphStyle('es', parent=styles['Normal'],
                              fontName='Helvetica-Bold', fontSize=11, leading=13, alignment=TA_LEFT)
    style_pt = ParagraphStyle('pt', parent=styles['Normal'],
                              fontName='Helvetica', fontSize=10, leading=12, alignment=TA_LEFT)
    style_firma = ParagraphStyle('firma', parent=styles['Normal'],
                                 fontName='Helvetica-Bold', fontSize=11, leading=13, alignment=TA_LEFT, spaceBefore=10)

    txt_es = ("Declaramos que las informaciones presentadas en este Documento son expresión de verdad, "
              "que los datos referentes a las mercaderías fueron transcriptos exactamente conforme a la "
              "declaración del remitente, las cuales son de su exclusiva responsabilidad, y que esta operación "
              "obedece a lo dispuesto en el Convenio sobre Transporte Internacional Terrestre de los países del Cono Sur.")
    txt_pt = ("Declaramos que as informações prestadas neste Documento são a expressão de verdade que os dados referentes "
              "as mercadorias foram transcritos exatamente conforme a declaração do remetente, os quais são de sua exclusiva "
              "responsabilidade, e que esta operação obedece ao disposto no Convênio sobre Transporte Internacional Terrestre dos")
    txt_firma = "39 Firma y sello del porteador / Assinatura e carimbo do"
    para_es = Paragraph(txt_es, style_es)
    para_pt = Paragraph(txt_pt, style_pt)
    para_firma = Paragraph(txt_firma, style_firma)
    f = Frame(X+8, Y+8, W-16, H-16, showBoundary=0)
    f.addFromList([para_es, para_pt, para_firma], c)


def draw_multiline_text(c, text, x, y, w, h, font_size=13, font="Helvetica"):
    if not text:
        text = ""
    style = ParagraphStyle(
        name='multi',
        fontName=font,
        fontSize=font_size,
        leading=font_size + 2,
        alignment=TA_LEFT,
    )
    # Procesa saltos de línea simples/dobles
    clean_text = text.replace('\r\n', '\n').replace(
        '\r', '\n').replace('\n\n', '<br/><br/>').replace('\n', '<br/>')
    para = Paragraph(clean_text, style)
    frame = Frame(x, y, w, h, showBoundary=0)
    frame.addFromList([para], c)


def generar_micdta_pdf_con_datos(mic_data, filename="mic_{id}.pdf"):
    width_px, height_px = 1700, 2800
    pt_per_px = 0.75
    width_pt, height_pt = width_px * pt_per_px, height_px * pt_per_px

    c = canvas.Canvas(filename, pagesize=(width_pt, height_pt))
    c.setStrokeColorRGB(0, 0, 0)
    c.setFillColorRGB(0, 0, 0)

    # ENCABEZADO
    x0, y0 = 55, 55
    rect_w, rect_h = 1616, 108.5
    c.setLineWidth(2)
    c.rect(x0 * pt_per_px, (height_px - y0 - rect_h) *
           pt_per_px, rect_w * pt_per_px, rect_h * pt_per_px)
    mic_x, mic_y = x0 + 24, y0 + 15
    mic_w, mic_h = 235, 70
    c.rect(mic_x * pt_per_px, (height_px - mic_y - mic_h) *
           pt_per_px, mic_w * pt_per_px, mic_h * pt_per_px)
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString((mic_x + mic_w / 2) * pt_per_px,
                        (height_px - mic_y - mic_h / 2 - 12) * pt_per_px, "MIC/DTA")
    title_x, title_y = x0 + 280, y0 + 36
    c.setFont("Helvetica-Bold", 20)
    c.drawString(title_x * pt_per_px, (height_px - title_y) * pt_per_px,
                 "Manifiesto Internacional de Carga por Carretera / Declaración de Tránsito Aduanero")
    c.setFont("Helvetica", 20)
    c.drawString(title_x * pt_per_px, (height_px - title_y - 38) * pt_per_px,
                 "Manifesto Internacional de Carga Rodoviária / Declaração de Trânsito")

    campos = [
        (1,  55, 162, 863, 450, "1 Nombre y domicilio del porteador",
         "Nome e endereço do transportador", "campo_1_transporte"),
        (2,  55, 610, 861, 142, "2 Rol de contribuyente",
         "Cadastro geral de contribuintes", "campo_2_numero"),
        (3, 916, 162, 389, 169, "3 Tránsito aduanero",
         "Trânsito aduaneiro", None),
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
        (40, 891, 2226, 780, 330, "40 Nº DTA, ruta y plazo de transporte",
         "Nº DTA, rota e prazo de transporte", "campo_40_tramo"),
        (41, 891, 2552, 780, 173, "41 Firma y sello de la Aduana de Partida",
         "Assinatura e carimbo de Alfândega de", None),
    ]

    for n, x, y, w, h, titulo, subtitulo, key in campos:
        if n == 39:
            draw_campo39(c, x, y, w, h, height_px, pt_per_px)
            continue

        # Dibuja el rectángulo
        c.rect(x * pt_per_px, (height_px - y - h) *
               pt_per_px, w * pt_per_px, h * pt_per_px)
        tx = (x + 8) * pt_per_px
        ty = (height_px - y - 24) * pt_per_px

        # Títulos y subtítulos
        c.setFont("Helvetica-Bold", 13)
        c.drawString(tx, ty, titulo)
        if subtitulo:
            c.setFont("Helvetica", 11)
            c.drawString(tx, ty - 16, subtitulo)

        # --- MULTILÍNEA para 1, 9, 33, 34, 35 ---
        if n in [1, 9, 33, 34, 35] and key and mic_data.get(key):
            x_frame = (x + 8) * pt_per_px
            y_frame = (height_px - y - h + 8 - 30) * pt_per_px
            w_frame = (w - 16) * pt_per_px
            h_frame = (h - 32) * pt_per_px
            draw_multiline_text(
                c, mic_data[key], x_frame, y_frame, w_frame, h_frame, font_size=13)
        # --- PARA CAMPOS NORMALES ---
        elif key and mic_data.get(key):
            c.setFont("Helvetica", 14)
            valor = str(mic_data[key])
            c.drawString(tx, ty - 34, valor[:200])

    # Rectángulo grande externo
    c.rect(55 * pt_per_px, (height_px - 55 - 2672.75) *
           pt_per_px, 1616.75 * pt_per_px, 2672.75 * pt_per_px)
    c.save()
