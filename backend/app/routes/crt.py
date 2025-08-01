# ========== IMPORTS COMPLETOS Y ORDENADOS ==========
from flask import Blueprint, request, jsonify, send_file
from sqlalchemy.orm import joinedload
from sqlalchemy import text
from datetime import datetime
from io import BytesIO
import traceback

from app.models import db, CRT, CRT_Gasto, Remitente, Transportadora, Ciudad, Pais, Moneda

from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase.pdfmetrics import stringWidth

from PyPDF2 import PdfReader, PdfWriter
from app.utils.layout_crt import dibujar_lineas_dinamicas, lineas

crt_bp = Blueprint('crt', __name__, url_prefix='/api/crts')

# ========== FUNCIONES AUXILIARES UNIVERSALES ==========


def parse_number(val):
    if val is None or val == "":
        return None
    if isinstance(val, (int, float)):
        return float(val)
    val = str(val).replace('.', '').replace(',', '.')
    try:
        return float(val)
    except Exception:
        return None


def limpiar_numericos(dic, campos):
    for campo in campos:
        dic[campo] = parse_number(dic.get(campo))
    return dic

# ========== SERIALIZADORES ==========


def to_dict_gasto(g):
    return {
        "id": g.id,
        "crt_id": g.crt_id,
        "tramo": g.tramo or "",
        "valor_remitente": str(g.valor_remitente or ""),
        "moneda_remitente_id": g.moneda_remitente_id,
        "moneda_remitente": g.moneda_remitente.nombre if g.moneda_remitente else "",
        "valor_destinatario": str(g.valor_destinatario or ""),
        "moneda_destinatario_id": g.moneda_destinatario_id,
        "moneda_destinatario": g.moneda_destinatario.nombre if g.moneda_destinatario else ""
    }


def to_dict_crt(crt):
    def val(obj, attr, default=""):
        v = getattr(obj, attr, default)
        return v if v is not None else default

    return {
        "id": crt.id,
        "numero_crt": val(crt, 'numero_crt', ''),
        "fecha_emision": crt.fecha_emision.strftime('%Y-%m-%d') if crt.fecha_emision else "",
        "estado": val(crt, 'estado', ''),
        "remitente_id": crt.remitente_id,
        "remitente": crt.remitente.nombre if crt.remitente else "",
        "transportadora_id": crt.transportadora_id,
        "transportadora": crt.transportadora.nombre if crt.transportadora else "",
        "destinatario_id": crt.destinatario_id,
        "destinatario": crt.destinatario.nombre if crt.destinatario else "",
        "consignatario_id": crt.consignatario_id,
        "consignatario": crt.consignatario.nombre if crt.consignatario else "",
        "notificar_a_id": crt.notificar_a_id,
        "notificar_a": crt.notificar_a.nombre if hasattr(crt, "notificar_a") and crt.notificar_a else "",
        "ciudad_emision_id": crt.ciudad_emision_id,
        "pais_emision_id": crt.pais_emision_id,
        "lugar_entrega": val(crt, 'lugar_entrega', ''),
        "detalles_mercaderia": val(crt, 'detalles_mercaderia', ''),
        "peso_bruto": str(val(crt, 'peso_bruto', '')),
        "peso_neto": str(val(crt, 'peso_neto', '')),
        "volumen": str(val(crt, 'volumen', '')),
        "incoterm": val(crt, 'incoterm', ''),
        "moneda_id": crt.moneda_id,
        "moneda": crt.moneda.nombre if crt.moneda else "",
        "valor_incoterm": str(val(crt, 'valor_incoterm', '')),
        "valor_mercaderia": str(val(crt, 'valor_mercaderia', '')),
        "declaracion_mercaderia": str(val(crt, 'declaracion_mercaderia', '')),
        "factura_exportacion": val(crt, 'factura_exportacion', ''),
        "nro_despacho": val(crt, 'nro_despacho', ''),
        "formalidades_aduana": val(crt, 'formalidades_aduana', ''),
        "valor_flete_externo": str(val(crt, 'valor_flete_externo', '')),
        "valor_reembolso": str(val(crt, 'valor_reembolso', '')),
        "transporte_sucesivos": val(crt, 'transporte_sucesivos', ''),
        "observaciones": val(crt, 'observaciones', ''),
        "fecha_firma": crt.fecha_firma.strftime('%Y-%m-%d') if crt.fecha_firma else "",
        "gastos": [to_dict_gasto(g) for g in crt.gastos],
    }

# ========== SIGUIENTE NÚMERO CRT ==========


@crt_bp.route('/next_number', methods=['GET'])
def get_next_crt_number():
    transportadora_id = request.args.get('transportadora_id')
    codigo = request.args.get('codigo')
    if not transportadora_id or not codigo or len(codigo) != 11 or not codigo.startswith("PY") or not codigo[2:].isdigit():
        return jsonify({'error': 'Código inválido'}), 400

    ultimo_crt = (
        CRT.query
        .filter(
            CRT.transportadora_id == transportadora_id,
            CRT.numero_crt.startswith("PY"),
            db.func.length(CRT.numero_crt) == 11
        )
        .order_by(CRT.numero_crt.desc())
        .first()
    )

    if ultimo_crt and ultimo_crt.numero_crt:
        try:
            ultimo_num = int(ultimo_crt.numero_crt[2:])
            siguiente = ultimo_num + 1
        except Exception:
            siguiente = int(codigo[2:])
    else:
        siguiente = int(codigo[2:])

    numero_crt = f"PY{siguiente:09d}"
    return jsonify({'next_number': numero_crt})

# ========== LISTAR CRTs ==========


@crt_bp.route('/', methods=['GET'])
def listar_crts():
    page = request.args.get('page', type=int, default=None)
    page_size = request.args.get('page_size', type=int, default=None)

    q = CRT.query.options(
        joinedload(CRT.gastos),
        joinedload(CRT.remitente),
        joinedload(CRT.transportadora),
        joinedload(CRT.destinatario),
        joinedload(CRT.consignatario),
        joinedload(CRT.moneda),
        joinedload(CRT.notificar_a)
    ).order_by(CRT.id.desc())

    if page and page_size:
        items = q.paginate(page=page, per_page=page_size, error_out=False)
        crts = [to_dict_crt(c) for c in items.items]
        return jsonify({
            "total": items.total,
            "page": items.page,
            "pages": items.pages,
            "crts": crts
        })
    else:
        crts = q.all()
        return jsonify([to_dict_crt(c) for c in crts])

# ========== DETALLE CRT ==========


@crt_bp.route('/<int:crt_id>', methods=['GET'])
def detalle_crt(crt_id):
    crt = CRT.query.options(
        joinedload(CRT.gastos),
        joinedload(CRT.remitente),
        joinedload(CRT.transportadora),
        joinedload(CRT.destinatario),
        joinedload(CRT.consignatario),
        joinedload(CRT.moneda),
        joinedload(CRT.notificar_a)
    ).filter_by(id=crt_id).first_or_404()
    return jsonify(to_dict_crt(crt))

# ========== DETALLE POR NÚMERO CRT ==========


@crt_bp.route('/by_numero/<string:numero_crt>', methods=['GET'])
def obtener_crt_por_numero(numero_crt):
    crt = CRT.query.options(
        joinedload(CRT.gastos),
        joinedload(CRT.remitente),
        joinedload(CRT.transportadora),
        joinedload(CRT.destinatario),
        joinedload(CRT.consignatario),
        joinedload(CRT.moneda),
        joinedload(CRT.notificar_a)
    ).filter_by(numero_crt=numero_crt).first()
    if not crt:
        return jsonify({"error": "CRT no encontrado"}), 404
    return jsonify(to_dict_crt(crt)), 200


# ========== CREAR CRT ==========


@crt_bp.route('/', methods=['POST'])
def crear_crt():
    try:
        data = request.json
        NUMERIC_FIELDS = [
            "peso_bruto", "peso_neto", "volumen",
            "valor_incoterm", "valor_mercaderia", "declaracion_mercaderia",
            "valor_flete_externo", "valor_reembolso"
        ]
        data = limpiar_numericos(data, NUMERIC_FIELDS)
        existe = CRT.query.filter_by(numero_crt=data.get("numero_crt")).first()
        if existe:
            return jsonify({"error": "Número de CRT ya existe, recargue la página."}), 400

        crt = CRT(
            numero_crt=data.get("numero_crt"),
            fecha_emision=datetime.strptime(data.get(
                "fecha_emision"), "%Y-%m-%d") if data.get("fecha_emision") else datetime.utcnow(),
            estado=data.get("estado", "EMITIDO"),
            remitente_id=data["remitente_id"],
            destinatario_id=data["destinatario_id"],
            consignatario_id=data.get("consignatario_id"),
            notificar_a_id=data.get("notificar_a_id"),
            transportadora_id=data["transportadora_id"],
            ciudad_emision_id=data["ciudad_emision_id"],
            pais_emision_id=data["pais_emision_id"],
            lugar_entrega=data.get("lugar_entrega"),
            detalles_mercaderia=data.get("detalles_mercaderia"),
            peso_bruto=data.get("peso_bruto"),
            peso_neto=data.get("peso_neto"),
            volumen=data.get("volumen"),
            incoterm=data.get("incoterm"),
            moneda_id=data["moneda_id"],
            valor_incoterm=data.get("valor_incoterm"),
            valor_mercaderia=data.get("valor_mercaderia"),
            declaracion_mercaderia=data.get("declaracion_mercaderia"),
            factura_exportacion=data.get("factura_exportacion"),
            nro_despacho=data.get("nro_despacho"),
            formalidades_aduana=data.get("formalidades_aduana"),
            valor_flete_externo=data.get("valor_flete_externo"),
            valor_reembolso=data.get("valor_reembolso"),
            transporte_sucesivos=data.get("transporte_sucesivos"),
            observaciones=data.get("observaciones"),
            fecha_firma=datetime.strptime(
                data.get("fecha_firma"), "%Y-%m-%d") if data.get("fecha_firma") else None
        )
        db.session.add(crt)
        db.session.flush()

        for gasto in data.get("gastos", []):
            g = CRT_Gasto(
                crt_id=crt.id,
                tramo=gasto.get("tramo"),
                valor_remitente=parse_number(gasto.get("valor_remitente")),
                moneda_remitente_id=gasto.get("moneda_remitente_id"),
                valor_destinatario=parse_number(
                    gasto.get("valor_destinatario")),
                moneda_destinatario_id=gasto.get("moneda_destinatario_id")
            )
            db.session.add(g)
        db.session.commit()
        return jsonify({"message": "CRT creado", "id": crt.id}), 201
    except Exception as e:
        print("\nERROR EN CREAR CRT".center(80, "-"))
        print(traceback.format_exc())
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# ========== EDITAR CRT ==========


@crt_bp.route('/<int:crt_id>', methods=['PUT'])
def editar_crt(crt_id):
    try:
        crt = CRT.query.options(joinedload(CRT.gastos)).filter_by(
            id=crt_id).first_or_404()
        data = request.json
        NUMERIC_FIELDS = [
            "peso_bruto", "peso_neto", "volumen",
            "valor_incoterm", "valor_mercaderia", "declaracion_mercaderia",
            "valor_flete_externo", "valor_reembolso"
        ]
        data = limpiar_numericos(data, NUMERIC_FIELDS)

        crt.numero_crt = data.get("numero_crt", crt.numero_crt)
        crt.estado = data.get("estado", crt.estado)
        crt.fecha_emision = datetime.strptime(data.get(
            "fecha_emision"), "%Y-%m-%d") if data.get("fecha_emision") else crt.fecha_emision
        crt.remitente_id = data.get("remitente_id", crt.remitente_id)
        crt.destinatario_id = data.get("destinatario_id", crt.destinatario_id)
        crt.consignatario_id = data.get(
            "consignatario_id", crt.consignatario_id)
        crt.notificar_a_id = data.get("notificar_a_id", crt.notificar_a_id)
        crt.transportadora_id = data.get(
            "transportadora_id", crt.transportadora_id)
        crt.ciudad_emision_id = data.get(
            "ciudad_emision_id", crt.ciudad_emision_id)
        crt.pais_emision_id = data.get("pais_emision_id", crt.pais_emision_id)
        crt.lugar_entrega = data.get("lugar_entrega", crt.lugar_entrega)
        crt.detalles_mercaderia = data.get(
            "detalles_mercaderia", crt.detalles_mercaderia)
        crt.peso_bruto = data.get("peso_bruto", crt.peso_bruto)
        crt.peso_neto = data.get("peso_neto", crt.peso_neto)
        crt.volumen = data.get("volumen", crt.volumen)
        crt.incoterm = data.get("incoterm", crt.incoterm)
        crt.moneda_id = data.get("moneda_id", crt.moneda_id)
        crt.valor_incoterm = data.get("valor_incoterm", crt.valor_incoterm)
        crt.valor_mercaderia = data.get(
            "valor_mercaderia", crt.valor_mercaderia)
        crt.declaracion_mercaderia = data.get(
            "declaracion_mercaderia", crt.declaracion_mercaderia)
        crt.factura_exportacion = data.get(
            "factura_exportacion", crt.factura_exportacion)
        crt.nro_despacho = data.get("nro_despacho", crt.nro_despacho)
        crt.formalidades_aduana = data.get(
            "formalidades_aduana", crt.formalidades_aduana)
        crt.valor_flete_externo = data.get(
            "valor_flete_externo", crt.valor_flete_externo)
        crt.valor_reembolso = data.get("valor_reembolso", crt.valor_reembolso)
        crt.transporte_sucesivos = data.get(
            "transporte_sucesivos", crt.transporte_sucesivos)
        crt.observaciones = data.get("observaciones", crt.observaciones)
        crt.fecha_firma = datetime.strptime(data.get(
            "fecha_firma"), "%Y-%m-%d") if data.get("fecha_firma") else crt.fecha_firma

        for g in crt.gastos:
            db.session.delete(g)
        db.session.flush()
        for gasto in data.get("gastos", []):
            g = CRT_Gasto(
                crt_id=crt.id,
                tramo=gasto.get("tramo"),
                valor_remitente=parse_number(gasto.get("valor_remitente")),
                moneda_remitente_id=gasto.get("moneda_remitente_id"),
                valor_destinatario=parse_number(
                    gasto.get("valor_destinatario")),
                moneda_destinatario_id=gasto.get("moneda_destinatario_id")
            )
            db.session.add(g)
        db.session.commit()
        return jsonify({"message": "CRT actualizado", "id": crt.id})
    except Exception as e:
        print("\nERROR EN EDITAR CRT".center(80, "-"))
        print(traceback.format_exc())
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# ========== ELIMINAR CRT ==========


@crt_bp.route('/<int:crt_id>', methods=['DELETE'])
def eliminar_crt(crt_id):
    try:
        crt = CRT.query.options(joinedload(CRT.gastos)).filter_by(
            id=crt_id).first_or_404()
        for g in crt.gastos:
            db.session.delete(g)
        db.session.delete(crt)
        db.session.commit()
        return jsonify({"message": "CRT eliminado"})
    except Exception as e:
        print("\nERROR EN ELIMINAR CRT".center(80, "-"))
        print(traceback.format_exc())
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# ========== PDF CRT ==========


@crt_bp.route('/<int:crt_id>/pdf', methods=['POST'])
def generar_pdf_crt(crt_id):
    try:
        crt = CRT.query.get_or_404(crt_id)
        remitente = crt.remitente
        transportadora = crt.transportadora
        destinatario = crt.destinatario
        consignatario = crt.consignatario
        notificar_a = crt.notificar_a

        output = BytesIO()
        c = canvas.Canvas(output, pagesize=A4)
        dibujar_lineas_dinamicas(c, lineas)

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

        max_width = 250
        max_width_trans = 250
        x_trans = 300

        # =============== CAMPO 1: REMITENTE ===============
        x_rem = 35
        y_rem = 842 - 87 - 12

        c.setFont("Helvetica-Bold", 7.98)
        c.drawString(x_rem, y_rem, remitente.nombre or "")

        direccion_lines = wrap_text_multiline(
            remitente.direccion or "", "Helvetica", 6, max_width)
        c.setFont("Helvetica", 6)
        for linea_dir in direccion_lines:
            y_rem -= 9
            c.drawString(x_rem, y_rem, linea_dir)

        y_rem -= 9
        ciudad = remitente.ciudad.nombre if remitente and remitente.ciudad else ""
        pais = remitente.ciudad.pais.nombre if remitente and remitente.ciudad and remitente.ciudad.pais else ""
        c.drawString(x_rem, y_rem, f"{ciudad} - {pais}")

        y_rem -= 9
        tipo_doc = remitente.tipo_documento or "RUC"
        num_doc = remitente.numero_documento or ""
        c.drawString(x_rem, y_rem, f"{tipo_doc}: {num_doc}")

        # =============== CAMPO 3: TRANSPORTADORA ===============
        y_trans = 842 - 105 - 12
        c.setFont("Helvetica-Bold", 9)
        nombre = (transportadora.nombre or "").strip()
        w_nombre = stringWidth(nombre, "Helvetica-Bold", 9)
        c.drawString(x_trans + (max_width_trans -
                     w_nombre) / 2, y_trans, nombre)
        c.setFont("Helvetica", 7)

        # Dirección (solo si existe y no es vacío o espacios)
        direccion = (transportadora.direccion or "").strip()
        if direccion:
            y_trans -= 10
            w_dir = stringWidth(direccion, "Helvetica", 7)
            c.drawString(x_trans + (max_width_trans - w_dir) /
                         2, y_trans, direccion)

        # Tipo y número de documento (solo si ambos existen y no son espacios)
        tipo_doc_trans = (transportadora.tipo_documento or "").strip()
        num_doc_trans = (transportadora.numero_documento or "").strip()
        if tipo_doc_trans and num_doc_trans:
            y_trans -= 10
            doc_line = f"{tipo_doc_trans}: {num_doc_trans}"
            w_doc = stringWidth(doc_line, "Helvetica", 7)
            c.drawString(x_trans + (max_width_trans - w_doc) /
                         2, y_trans, doc_line)

        # Teléfono (solo si existe, no es vacío, ni solo espacios)
        telefono = getattr(transportadora, "telefono", None)
        telefono = (telefono or "").strip()
        if telefono:
            y_trans -= 10
            tel = f"Tel: {telefono}"
            w_tel = stringWidth(tel, "Helvetica", 7)
            c.drawString(x_trans + (max_width_trans - w_tel) / 2, y_trans, tel)

        # Ciudad y país (solo si al menos uno existe, no espacios)
        ciudad_trans = (
            transportadora.ciudad.nombre if transportadora and transportadora.ciudad else "").strip()
        pais_trans = (
            transportadora.ciudad.pais.nombre if transportadora and transportadora.ciudad and transportadora.ciudad.pais else "").strip()
        if ciudad_trans or pais_trans:
            loc = f"{ciudad_trans} - {pais_trans}".strip(" -")
            y_trans -= 10
            w_loc = stringWidth(loc, "Helvetica", 7)
            c.drawString(x_trans + (max_width_trans - w_loc) / 2, y_trans, loc)

        # =============== CAMPO 4: DESTINATARIO ===============
        x_dest = 35
        y_dest = 842 - 147 - 12

        c.setFont("Helvetica-Bold", 7.98)
        c.drawString(x_dest, y_dest,
                     destinatario.nombre if destinatario else "")

        direccion_dest_lines = wrap_text_multiline(
            destinatario.direccion if destinatario else "", "Helvetica", 6, max_width)
        c.setFont("Helvetica", 6)
        for linea_dir in direccion_dest_lines:
            y_dest -= 9
            c.drawString(x_dest, y_dest, linea_dir)

        y_dest -= 9
        ciudad_dest = destinatario.ciudad.nombre if destinatario and destinatario.ciudad else ""
        pais_dest = destinatario.ciudad.pais.nombre if destinatario and destinatario.ciudad and destinatario.ciudad.pais else ""
        c.drawString(x_dest, y_dest, f"{ciudad_dest} - {pais_dest}")

        y_dest -= 9
        tipo_doc_dest = destinatario.tipo_documento if destinatario else "RUC"
        num_doc_dest = destinatario.numero_documento if destinatario else ""
        c.drawString(x_dest, y_dest, f"{tipo_doc_dest}: {num_doc_dest}")

        # =============== CAMPO 6: CONSIGNATARIO ===============
        x_cons = 35
        y_cons = 842 - 206 - 12

        c.setFont("Helvetica-Bold", 7.98)
        c.drawString(x_cons, y_cons,
                     consignatario.nombre if consignatario else "")

        direccion_cons_lines = wrap_text_multiline(
            consignatario.direccion if consignatario else "", "Helvetica", 6, max_width)
        c.setFont("Helvetica", 6)
        for linea_dir in direccion_cons_lines:
            y_cons -= 9
            c.drawString(x_cons, y_cons, linea_dir)

        y_cons -= 9
        ciudad_cons = consignatario.ciudad.nombre if consignatario and consignatario.ciudad else ""
        pais_cons = consignatario.ciudad.pais.nombre if consignatario and consignatario.ciudad and consignatario.ciudad.pais else ""
        c.drawString(x_cons, y_cons, f"{ciudad_cons} - {pais_cons}")

        y_cons -= 9
        tipo_doc_cons = consignatario.tipo_documento if consignatario else "RUC"
        num_doc_cons = consignatario.numero_documento if consignatario else ""
        c.drawString(x_cons, y_cons, f"{tipo_doc_cons}: {num_doc_cons}")

        # =============== CAMPO 9: NOTIFICAR A ===============
        x_notif = 35
        y_notif = 842 - 267 - 12

        c.setFont("Helvetica-Bold", 7.98)
        c.drawString(x_notif, y_notif,
                     notificar_a.nombre if notificar_a else "")

        direccion_notif_lines = wrap_text_multiline(
            notificar_a.direccion if notificar_a else "", "Helvetica", 6, max_width)
        c.setFont("Helvetica", 6)
        for linea_dir in direccion_notif_lines:
            y_notif -= 9
            c.drawString(x_notif, y_notif, linea_dir)

        y_notif -= 9
        ciudad_notif = notificar_a.ciudad.nombre if notificar_a and notificar_a.ciudad else ""
        pais_notif = notificar_a.ciudad.pais.nombre if notificar_a and notificar_a.ciudad and notificar_a.ciudad.pais else ""
        c.drawString(x_notif, y_notif, f"{ciudad_notif} - {pais_notif}")

        y_notif -= 9
        tipo_doc_notif = notificar_a.tipo_documento if notificar_a else "RUC"
        num_doc_notif = notificar_a.numero_documento if notificar_a else ""
        c.drawString(x_notif, y_notif, f"{tipo_doc_notif}: {num_doc_notif}")

        # ========== Campo 2: Número CRT ==========
        x_num_crt = 400
        y_num_crt_ill = 92
        y_num_crt_pdf = 842 - y_num_crt_ill
        c.setFont("Helvetica-Bold", 10)
        c.drawString(x_num_crt, y_num_crt_pdf, str(crt.numero_crt))

        # ========== Campo 5 ==========
        x_emision = 300
        y_emision = 842 - 168 - 20
        texto_emision = "ASUNCIÓN - PARAGUAY"
        c.setFont("Helvetica", 8)
        w_emision = stringWidth(texto_emision, "Helvetica", 8)
        c.drawString(x_emision + (max_width_trans - w_emision) /
                     2, y_emision, texto_emision)

        # ========== Campo 7 ==========
        x_campo7 = 300
        y_campo7 = y_emision - 50
        ciudad7 = ciudad
        pais7 = pais
        fecha7 = crt.fecha_emision.strftime(
            '%d-%m-%Y') if crt.fecha_emision else ""
        texto_campo7 = f"{ciudad7.upper()} - {pais7.upper()}-{fecha7}"
        c.setFont("Helvetica", 8)
        w_campo7 = stringWidth(texto_campo7, "Helvetica", 8)
        c.drawString(x_campo7 + (max_width_trans - w_campo7) /
                     2, y_campo7, texto_campo7)

        # ========== Campo 8 ==========
        x_campo8 = 300
        y_campo8 = y_campo7 - 37
        ciudad_dest_8 = destinatario.ciudad.nombre if destinatario and destinatario.ciudad else ""
        pais_dest_8 = destinatario.ciudad.pais.nombre if destinatario and destinatario.ciudad and destinatario.ciudad.pais else ""
        texto_campo8 = f"{ciudad_dest_8} - {pais_dest_8}"
        c.setFont("Helvetica", 8)
        w_campo8 = stringWidth(texto_campo8, "Helvetica", 8)
        c.drawString(x_campo8 + (max_width_trans - w_campo8) /
                     2, y_campo8, texto_campo8)

        # ========== Campo 10 ==========
        x_campo10 = 300
        y_campo10 = y_campo8 - 37
        texto_campo10 = getattr(crt, "transporte_sucesivos", "")
        c.setFont("Helvetica", 7)
        campo10_lines = wrap_text_multiline(
            texto_campo10, "Helvetica", 7, max_width_trans)
        for linea in campo10_lines:
            w_line = stringWidth(linea, "Helvetica", 7)
            c.drawString(x_campo10 + (max_width_trans -
                         w_line) / 2, y_campo10, linea)
            y_campo10 -= 10

        # ========== CAMPO 11: DETALLES DE MERCADERÍA ==========
        x11 = 34
        y11 = 498
        width11 = 375
        height11 = 100
        texto_campo11 = crt.detalles_mercaderia or ""

        draw_text_fit_area(
            c, texto_campo11,
            x=x11, y=y11, width=width11, height=height11,
            fontName="Helvetica", min_font=4.80, max_font=7.50, leading_ratio=1.13
        )

        # ========== CAMPO 15: COSTOS ==========
        y_start = 370
        row_height = 14
        y_min = 250

        x_tramo = 38
        max_tramo_width = 140 - x_tramo - 5
        x_remitente = 180
        x_moneda = 210
        x_destinatario = 280

        moneda_codigo = (
            crt.moneda.codigo if crt.moneda and hasattr(crt.moneda, "codigo")
            else (crt.moneda.nombre if crt.moneda else "")
        )
        gastos = crt.gastos or []
        y_row = y_start
        max_rows = int((y_start - y_min) // row_height)
        gastos_visibles = gastos[:max_rows]

        c.setFont("Helvetica", 8)
        for gasto in gastos_visibles:
            tramo_text = gasto.tramo or ""
            draw_text_fit_area(
                c, tramo_text, x=x_tramo, y=y_row, width=max_tramo_width,
                height=row_height - 1, fontName="Helvetica", min_font=5, max_font=8, leading_ratio=1.13
            )
            valor_remitente = format_number(
                gasto.valor_remitente, 2) if gasto.valor_remitente not in [None, "None", ""] else ""
            valor_destinatario = format_number(
                gasto.valor_destinatario, 2) if gasto.valor_destinatario not in [None, "None", ""] else ""
            c.setFont("Helvetica", 8)
            c.drawRightString(x_remitente, y_row, valor_remitente)
            c.drawString(x_moneda, y_row, moneda_codigo)
            c.drawRightString(x_destinatario, y_row, valor_destinatario)
            y_row -= row_height

        y_total = 308
        total_remitente = sum(float(g.valor_remitente or 0)
                              for g in gastos_visibles if g.valor_remitente not in [None, "None", ""])
        total_destinatario = sum(float(g.valor_destinatario or 0)
                                 for g in gastos_visibles if g.valor_destinatario not in [None, "None", ""])
        c.setFont("Helvetica-Bold", 8)
        if total_remitente:
            c.drawRightString(x_remitente, y_total,
                              format_number(total_remitente, 2))
            c.drawString(x_moneda, y_total, moneda_codigo)
        if total_destinatario:
            c.drawRightString(x_destinatario, y_total,
                              format_number(total_destinatario, 2))
            c.drawString(x_moneda, y_total, moneda_codigo)

        # ========== CAMPO 12: Peso bruto y neto ==========
        x12_valor = 500
        y12_pb = 505
        y12_pn = 490

        c.setFont("Helvetica", 10)
        peso_bruto = format_number(crt.peso_bruto)
        peso_neto = format_number(crt.peso_neto)
        c.drawString(x12_valor, y12_pb, peso_bruto)
        c.drawString(x12_valor, y12_pn, peso_neto)

        # ========== CAMPO 13: Volumen ==========
        x13 = 465
        y13 = 472
        volumen = format_number(crt.volumen, decimals=5)
        c.setFont("Helvetica", 9)
        c.drawString(x13, y13, volumen)

        # ========== CAMPO 14: Incoterm, Moneda y Valor ==========
        x14 = 415
        y14 = 450
        incoterm = crt.incoterm or ""
        valor_incoterm = format_number(crt.valor_incoterm or 0, decimals=2)
        c.setFont("Helvetica", 10)
        c.drawString(x14, y14, incoterm)
        c.drawString(x14 + 30, y14, moneda_codigo)
        c.drawRightString(550, y14, valor_incoterm)

        c.setFont("Helvetica", 9)
        nombre_moneda = crt.moneda.nombre if crt.moneda else ""
        c.drawString(x14, y14 - 25, nombre_moneda.upper())

        # Segundo Incoterm junto a la palabra "INCOTERM"
        x_incoterm = 475
        y_incoterm = y14 - 39
        c.setFont("Helvetica", 10)
        c.drawString(x_incoterm, y_incoterm, incoterm)

        # ========== CAMPO 16: Declaración del valor ==========
        x16 = 450
        y16 = 842 - 442 - 8
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x16, y16, format_number(
            crt.declaracion_mercaderia, decimals=2))

        # ========== CAMPO 17: Documentos Anexos ==========
        x_factura = 465
        y_factura = 371
        x_despacho = 465
        y_despacho = 357
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x_factura, y_factura, crt.factura_exportacion or "")
        c.drawString(x_despacho, y_despacho, crt.nro_despacho or "")

        # ========== CAMPO 18: Formalidades Aduana ==========
        x18 = 305
        y18 = 235
        width18 = 410
        height18 = 54
        texto_campo18 = crt.formalidades_aduana or ""
        draw_text_fit_area(
            c, texto_campo18, x=x18, y=y18 + height18, width=width18,
            height=height18, fontName="Helvetica", min_font=5.0, max_font=8.5, leading_ratio=1.13
        )

        # ========== CAMPO 19 ==========
        x_moneda_19 = 110
        x_valor_19 = 220
        y_19 = 288
        valor_flete_externo = ""
        if gastos:
            primer_gasto = gastos[0]
            if primer_gasto.valor_remitente not in [None, "None", ""]:
                valor_flete_externo = format_number(
                    primer_gasto.valor_remitente, 2)
            elif primer_gasto.valor_destinatario not in [None, "None", ""]:
                valor_flete_externo = format_number(
                    primer_gasto.valor_destinatario, 2)
        codigo_moneda_19 = crt.moneda.codigo if crt.moneda and hasattr(
            crt.moneda, "codigo") else (crt.moneda.nombre if crt.moneda else "")
        c.setFont("Helvetica", 8)
        c.drawString(x_moneda_19, y_19, codigo_moneda_19)
        c.drawRightString(x_valor_19, y_19, valor_flete_externo)

        # ========== CAMPO 20 ==========
        x_moneda_20 = x_moneda_19
        x_valor_20 = x_valor_19
        y_20 = y_19 - 22
        valor_reembolso = ""
        if hasattr(crt, "valor_reembolso") and crt.valor_reembolso not in [None, "None", ""]:
            valor_reembolso = format_number(crt.valor_reembolso, 2)
        c.setFont("Helvetica", 8)
        c.drawString(x_moneda_20, y_20, codigo_moneda_19)
        if valor_reembolso:
            c.drawRightString(x_valor_20, y_20, valor_reembolso)

        # ========== CAMPO 21: REMITENTE ==========
        x21_nombre = 38
        y21_nombre = 230
        x21_fecha = 100
        y21_fecha = 193
        remitente_nombre = remitente.nombre or ""
        fecha_emision = crt.fecha_emision.strftime(
            '%d/%m/%Y') if crt.fecha_emision else ""
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x21_nombre, y21_nombre, remitente_nombre)
        c.setFont("Helvetica", 8)
        c.drawString(x21_fecha, y21_fecha, fecha_emision)

        # ========== CAMPO 23: TRANSPORTADORA ==========
        x23_nombre = 38
        y23_nombre = 130
        x23_fecha = 100
        y23_fecha = 87
        transportadora_nombre = transportadora.nombre or ""
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x23_nombre, y23_nombre, transportadora_nombre)
        c.setFont("Helvetica", 8)
        c.drawString(x23_fecha, y23_fecha, fecha_emision)

        # ========== CAMPO 24: DESTINATARIO ==========
        x24_nombre = 305
        y24_nombre = 152
        x24_fecha = 380
        y24_fecha = 87
        destinatario_nombre = destinatario.nombre if destinatario else ""
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x24_nombre, y24_nombre, destinatario_nombre)
        c.setFont("Helvetica", 8)
        c.drawString(x24_fecha, y24_fecha, fecha_emision)

        # ========== CAMPO 22: Declaraciones y observaciones ==========
        x22 = 305
        y22 = 243
        width22 = 260
        height22 = 60
        texto_campo22 = crt.observaciones or ""
        draw_text_fit_area(
            c, texto_campo22, x=x22, y=y22, width=width22, height=height22,
            fontName="Helvetica", min_font=5.0, max_font=8.0, leading_ratio=1.13
        )

        # Guarda y responde
        c.save()
        output.seek(0)
        return send_file(
            output,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"CRT_{crt.numero_crt}.pdf"
        )
    except Exception as e:
        print("\nERROR EN GENERAR PDF CRT".center(80, "-"))
        print(traceback.format_exc())
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# --- LISTAR CRTs SIMPLE ---


@crt_bp.route('/simple', methods=['GET'])
def listar_crts_simple():
    try:
        sql = text("SELECT c.numero_crt FROM crts c ORDER BY c.id DESC")
        result = db.session.execute(sql).mappings().all()
        crts = [{"numero_crt": row["numero_crt"]} for row in result]
        print("✅ Listado simple CRTs:", crts[:5])
        return jsonify(crts)
    except Exception as e:
        print("\nERROR EN LISTAR NÚMEROS CRT".center(80, "-"))
        print(traceback.format_exc())
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# Recuerda registrar el blueprint en tu app principal:
# from app.routes.crt import crt_bp
# app.register_blueprint(crt_bp)
