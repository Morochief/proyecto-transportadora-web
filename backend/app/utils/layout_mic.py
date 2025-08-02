from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph, Frame
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT


def draw_campo39(c, x, y, w, h, height_px, pt_per_px, mic_data=None):
    """
    ✅ ACTUALIZADO: Campo 39 con nombre del transportador y fecha
    """
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

    # ✅ NUEVO: Estilo para el nombre del transportador
    style_transportador = ParagraphStyle('transportador', parent=styles['Normal'],
                                         fontName='Helvetica-Bold', fontSize=14, leading=16, alignment=TA_LEFT, spaceBefore=20)

    txt_es = ("Declaramos que las informaciones presentadas en este Documento son expresión de verdad, "
              "que los datos referentes a las mercaderías fueron transcriptos exactamente conforme a la "
              "declaración del remitente, las cuales son de su exclusiva responsabilidad, y que esta operación "
              "obedece a lo dispuesto en el Convenio sobre Transporte Internacional Terrestre de los países del Cono Sur.")
    txt_pt = ("Declaramos que as informações prestadas neste Documento são a expressão de verdade que os dados referentes "
              "as mercadorias foram transcritos exatamente conforme a declaração do remetente, os quais são de sua exclusiva "
              "responsabilidade, e que esta operação obedece ao disposto no Convênio sobre Transporte Internacional Terrestre dos")
    txt_firma = "39 Firma y sello del porteador / Assinatura e carimbo do transportador"

    # ✅ NUEVO: Obtener nombre del transportador y fecha
    nombre_transportador = ""
    fecha_actual = ""

    if mic_data:
        # Intentar obtener el nombre del transportador desde varios campos posibles
        nombre_transportador = (
            mic_data.get('campo_1_transporte', '') or
            mic_data.get('transportadora_nombre', '') or
            mic_data.get('transportadora', '') or
            "TRANSPORTADOR"
        )

        # Si el campo_1_transporte tiene múltiples líneas, tomar solo la primera (el nombre)
        if '\n' in nombre_transportador:
            nombre_transportador = nombre_transportador.split('\n')[0].strip()

        # Obtener fecha
        fecha_actual = mic_data.get('campo_6_fecha', '')
        if not fecha_actual:
            from datetime import datetime
            fecha_actual = datetime.now().strftime('%d/%m/%Y')

    print(f"🚛 Campo 39 - Transportador: '{nombre_transportador}'")
    print(f"📅 Campo 39 - Fecha: '{fecha_actual}'")

    # Crear párrafos
    para_es = Paragraph(txt_es, style_es)
    para_pt = Paragraph(txt_pt, style_pt)
    para_firma = Paragraph(txt_firma, style_firma)

    # ✅ NUEVO: Párrafo para el transportador
    para_transportador = Paragraph(nombre_transportador, style_transportador)

    # ✅ NUEVO: Texto para la fecha (se dibuja por separado)
    txt_fecha = f"Data / Fecha: {fecha_actual}"

    # Dibujar todos los párrafos en el frame
    f = Frame(X+8, Y+8, W-16, H-16, showBoundary=0)
    f.addFromList([para_es, para_pt, para_firma, para_transportador], c)

    # ✅ NUEVO: Dibujar la fecha en la parte inferior del campo
    c.setFont("Helvetica", 12)
    fecha_x = X + 12
    fecha_y = Y + 25  # Parte inferior del campo
    c.drawString(fecha_x, fecha_y, txt_fecha)


def draw_multiline_text_simple(c, text, x, y, w, h, font_size=9, font="Helvetica"):
    """
    ✅ MEJORADO: Método simple con mejor manejo de saltos de línea
    """
    if not text:
        text = ""

    print(f"🔍 MÉTODO SIMPLE - Dibujando texto: {len(text)} caracteres")
    print(f"📍 Coordenadas: x={x}, y={y}, w={w}, h={h}")
    # Ver caracteres especiales
    print(f"📝 Texto original: {repr(text[:100])}...")

    # ✅ LIMPIEZA: Normalizar saltos de línea
    # Reemplazar diferentes tipos de saltos de línea por \n estándar
    clean_text = text.replace('\r\n', '\n').replace('\r', '\n')

    # ✅ NUEVO: Eliminar caracteres de control que causan cuadros negros
    import re
    # Eliminar caracteres de control excepto \n y \t
    clean_text = re.sub(
        r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', clean_text)

    print(f"📝 Texto limpio: {repr(clean_text[:100])}...")

    # Configurar fuente
    c.setFont(font, font_size)

    # ✅ MEJORADO: Procesar líneas manualmente (respetando \n del usuario)
    manual_lines = clean_text.split('\n')

    all_lines = []
    max_width = w - 10  # Margen de 5px a cada lado

    # Procesar cada línea manual del usuario
    for manual_line in manual_lines:
        if not manual_line.strip():  # Línea vacía
            all_lines.append("")
            continue

        # Dividir la línea si es muy larga
        words = manual_line.split()
        current_line = ""

        for word in words:
            test_line = current_line + " " + word if current_line else word
            text_width = c.stringWidth(test_line, font, font_size)

            if text_width <= max_width:
                current_line = test_line
            else:
                if current_line:
                    all_lines.append(current_line)
                current_line = word

        if current_line:
            all_lines.append(current_line)

    # Calcular cuántas líneas caben en el alto disponible
    line_height = font_size + 2
    # -10 para margen superior/inferior
    max_lines = int((h - 10) / line_height)

    # Tomar solo las líneas que caben
    visible_lines = all_lines[:max_lines]

    print(
        f"📝 Texto dividido en {len(all_lines)} líneas, mostrando {len(visible_lines)}")

    # Dibujar las líneas
    start_y = y + h - 15  # Empezar desde arriba del rectángulo

    for i, line in enumerate(visible_lines):
        line_y = start_y - (i * line_height)
        # ✅ SEGURIDAD: Asegurar que no hay caracteres extraños antes de dibujar
        safe_line = str(line).encode('utf-8', errors='ignore').decode('utf-8')
        c.drawString(x + 5, line_y, safe_line)
        print(f"📏 Línea {i+1}: '{safe_line}' en y={line_y}")

    # Si hay más texto del que cabe, indicarlo
    if len(all_lines) > max_lines:
        c.drawString(x + 5, start_y - (max_lines *
                     line_height), "... (continúa)")
        print(
            f"⚠️ Texto truncado: {len(all_lines) - max_lines} líneas no mostradas")

    print(f"✅ Texto simple dibujado exitosamente: {len(visible_lines)} líneas")


def draw_multiline_text(c, text, x, y, w, h, font_size=13, font="Helvetica"):
    """
    ✅ MÉTODO HÍBRIDO MEJORADO: Limpia caracteres de control antes de procesar
    """
    if not text:
        text = ""

    # ✅ LIMPIEZA UNIVERSAL: Aplicar a todos los textos
    import re
    # Normalizar saltos de línea
    clean_text = text.replace('\r\n', '\n').replace('\r', '\n')
    # Eliminar caracteres de control que causan cuadros negros
    clean_text = re.sub(
        r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]', '', clean_text)

    # Para campo 12 y otros textos con saltos de línea manual, usar método simple
    if '\n' in clean_text or len(clean_text) > 500:
        print(
            f"🎯 Texto con saltos de línea o muy largo ({len(clean_text)} chars) - usando método simple")
        draw_multiline_text_simple(
            c, clean_text, x, y, w, h, font_size=font_size, font=font)
        return

    # Para textos cortos sin saltos de línea, usar el método original con Frame
    print(
        f"🔍 Texto corto sin saltos de línea ({len(clean_text)} chars) - usando método Frame")

    style = ParagraphStyle(
        name='multi',
        fontName=font,
        fontSize=font_size,
        leading=font_size + 2,
        alignment=TA_LEFT,
    )

    # Procesa saltos de línea para HTML
    html_text = clean_text.replace('\n', '<br/>')

    try:
        para = Paragraph(html_text, style)
        frame = Frame(x, y, w, h, showBoundary=0, leftPadding=4,
                      rightPadding=4, topPadding=4, bottomPadding=4)
        frame.addFromList([para], c)
        print(f"✅ Texto Frame dibujado exitosamente")

    except Exception as e:
        print(f"❌ Error dibujando con Frame: {e} - usando método simple")
        draw_multiline_text_simple(c, clean_text, x, y, w, h, font_size, font)


def generar_micdta_pdf_con_datos(mic_data, filename="mic_{id}.pdf"):
    """
    ✅ MEJORADA: Función principal con debug completo de todos los datos
    Y SOPORTE PARA DOCUMENTOS EN CAMPOS 1, 33, 34, 35
    """
    print("🔄 Iniciando generación de PDF MIC...")
    print(f"📋 Datos recibidos: {len(mic_data)} campos")

    # ✅ DEBUG COMPLETO: Mostrar TODOS los datos recibidos
    print("\n" + "="*50)
    print("🔍 DATOS COMPLETOS RECIBIDOS:")
    for key, value in mic_data.items():
        if value:  # Solo mostrar campos que tienen datos
            print(
                f"  {key}: {str(value)[:100]}{'...' if len(str(value)) > 100 else ''}")
    print("="*50 + "\n")

    # Debug específico para campo 38
    campo_38_key = "campo_38_datos_campo11_crt"
    if campo_38_key in mic_data and mic_data[campo_38_key]:
        print(
            f"✅ Campo 38 encontrado: {len(mic_data[campo_38_key])} caracteres")
        print(
            f"📝 Campo 38 (primeros 150 chars): {mic_data[campo_38_key][:150]}...")
    else:
        print("⚠️ Campo 38 no encontrado o vacío")
        print(f"🔍 Claves disponibles: {list(mic_data.keys())}")

    # ✅ DEBUG ESPECÍFICO: Para datos del transportador (Campo 39)
    transportador_keys = ['campo_1_transporte', 'transportadora_nombre',
                          'transportadora', 'campo_9_datos_transporte']
    print("\n🚛 DATOS DEL TRANSPORTADOR PARA CAMPO 39:")
    for key in transportador_keys:
        if key in mic_data:
            value = mic_data[key]
            print(f"  {key}: '{value}'")
        else:
            print(f"  {key}: NO ENCONTRADO")

    fecha_keys = ['campo_6_fecha', 'fecha_emision', 'fecha']
    print("\n📅 DATOS DE FECHA PARA CAMPO 39:")
    for key in fecha_keys:
        if key in mic_data:
            value = mic_data[key]
            print(f"  {key}: '{value}'")
        else:
            print(f"  {key}: NO ENCONTRADO")
    print("\n")

    # ✅ NUEVO: DEBUG ESPECÍFICO PARA CAMPOS CON DOCUMENTOS
    campos_documentos = {
        'campo_1_transporte': 'Transportador',
        'campo_33_datos_campo1_crt': 'Remitente',
        'campo_34_datos_campo4_crt': 'Destinatario',
        'campo_35_datos_campo6_crt': 'Consignatario'
    }

    print("📄 CAMPOS CON DOCUMENTOS:")
    for key, descripcion in campos_documentos.items():
        if key in mic_data and mic_data[key]:
            value = mic_data[key]
            lines = value.split('\n')
            print(f"  📋 {descripcion} ({key}): {len(lines)} líneas")
            for i, line in enumerate(lines[:3], 1):  # Mostrar máximo 3 líneas
                print(
                    f"    Línea {i}: '{line[:50]}{'...' if len(line) > 50 else ''}'")
            if len(lines) > 3:
                print(f"    ... y {len(lines) - 3} líneas más")
        else:
            print(f"  ❌ {descripcion} ({key}): NO ENCONTRADO")
    print()

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
        (40, 891, 2226, 780, 326, "40 Nº DTA, ruta y plazo de transporte",
         "Nº DTA, rota e prazo de transporte", "campo_40_tramo"),
        (41, 891, 2552, 780, 175, "41 Firma y sello de la Aduana de Partida",
         "Assinatura e carimbo de Alfândega de", None),
    ]

    for n, x, y, w, h, titulo, subtitulo, key in campos:
        if n == 39:
            # ✅ ACTUALIZADO: Pasar mic_data al campo 39
            draw_campo39(c, x, y, w, h, height_px, pt_per_px, mic_data)
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

        # ✅ ESPECIAL: Debug para campo 38
        if n == 38:
            print(f"🎯 Procesando Campo 38 (n={n})")
            print(f"📍 Coordenadas: x={x}, y={y}, w={w}, h={h}")
            print(f"🔑 Key: {key}")
            if key and mic_data.get(key):
                valor = mic_data[key]
                print(f"✅ Campo 38 tiene datos: {len(valor)} caracteres")
                print(f"📝 Primeros 100 chars: {valor[:100]}...")
            else:
                print(
                    f"❌ Campo 38 sin datos. Valor: {mic_data.get(key, 'KEY_NOT_FOUND')}")

        # ✅ ESPECIAL: Debug para campos con documentos
        if n in [1, 33, 34, 35]:
            campo_nombre = {1: 'Transportador', 33: 'Remitente',
                            34: 'Destinatario', 35: 'Consignatario'}[n]
            print(f"🎯 Procesando Campo {n} ({campo_nombre}) con documentos")
            if key and mic_data.get(key):
                valor = mic_data[key]
                lines = valor.split('\n')
                print(f"✅ Campo {n} tiene {len(lines)} líneas de datos")
                for i, line in enumerate(lines[:2], 1):
                    print(
                        f"   Línea {i}: '{line[:50]}{'...' if len(line) > 50 else ''}'")

        # ✅ CORREGIDO: MULTILÍNEA solo para 1, 9, 33, 34, 35, 38 - USAR MÉTODO ORIGINAL PARA MÁS LÍNEAS
        if n in [1, 9, 33, 34, 35, 38] and key and mic_data.get(key):
            x_frame = (x + 8) * pt_per_px
            y_frame = (height_px - y - h + 8 - 30) * pt_per_px
            w_frame = (w - 16) * pt_per_px
            h_frame = (h - 32) * pt_per_px

            print(
                f"🖼️ Dibujando campo multilínea {n} con frame: x={x_frame}, y={y_frame}, w={w_frame}, h={h_frame}")

            # ✅ ESPECIAL: Para campo 38 usar método simple directo
            if n == 38:
                print(f"🎯 CAMPO 38 - Usando método simple directo")
                draw_multiline_text_simple(
                    c, mic_data[key], x_frame, y_frame, w_frame, h_frame, font_size=8, font="Helvetica")
            else:
                # ✅ RESTAURADO: Para campos 1, 9, 33, 34, 35 usar método ORIGINAL (MÁS LÍNEAS)
                print(
                    f"🎯 CAMPO {n} - Usando método ORIGINAL Frame/Paragraph para MÁS LÍNEAS")
                draw_multiline_text(
                    c, mic_data[key], x_frame, y_frame, w_frame, h_frame, font_size=10)

        # --- PARA CAMPOS NORMALES (incluyendo ahora el 12 con lógica especial) ---
        elif key and mic_data.get(key):
            # ✅ ESPECIAL: Para campo 12, dibujar dos líneas si contiene \n
            if n == 12 and '\n' in str(mic_data[key]):
                lines = str(mic_data[key]).split('\n')[:2]  # Máximo 2 líneas
                c.setFont("Helvetica", 12)
                print(
                    f"🔧 Campo 12 (dos líneas): Línea 1: '{lines[0]}', Línea 2: '{lines[1] if len(lines) > 1 else ''}'")

                # Dibujar primera línea (marca/modelo)
                c.drawString(tx, ty - 34, lines[0][:80])

                # Dibujar segunda línea (chasis) si existe
                if len(lines) > 1 and lines[1].strip():
                    # Fuente ligeramente más pequeña para chasis
                    c.setFont("Helvetica", 11)
                    c.drawString(tx, ty - 50, lines[1][:80])
            else:
                # Campos normales (una sola línea)
                c.setFont("Helvetica", 14)
                valor = str(mic_data[key]).replace(
                    '\n', ' ').replace('\r', ' ')

                # Para campo 12 simple, usar fuente más pequeña si es muy largo
                if n == 12:
                    if len(valor) > 50:
                        c.setFont("Helvetica", 11)
                    print(
                        f"🔧 Campo 12 (simple): '{valor[:50]}{'...' if len(valor) > 50 else ''}'")

                c.drawString(tx, ty - 34, valor[:200])

    # Rectángulo grande externo
    c.rect(55 * pt_per_px, (height_px - 55 - 2672.75) *
           pt_per_px, 1616.75 * pt_per_px, 2672.75 * pt_per_px)

    c.save()
    print(f"✅ PDF generado exitosamente: {filename}")

    # ✅ RESUMEN FINAL CON TODOS TUS PRINTS ORIGINALES
    print("🎯 RESUMEN DE CAMPOS CON DOCUMENTOS:")
    for key, descripcion in campos_documentos.items():
        if key in mic_data and mic_data[key]:
            lines_count = len(mic_data[key].split('\n'))
            print(f"   📋 {descripcion}: {lines_count} líneas")
        else:
            print(f"   ❌ {descripcion}: Sin datos")

    print("🎯 RESUMEN - MÉTODO DE RENDERIZADO:")
    print("   📋 Campos 1,9,33,34,35: Frame/Paragraph (MÁS LÍNEAS) ✅")
    print("   📦 Campo 38: Método simple (para compatibilidad)")
    print("   📄 Otros campos: Una línea normal")
    print("   🔍 Debug completo: ACTIVADO ✅")
