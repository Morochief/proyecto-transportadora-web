from flask import Blueprint, request, jsonify, make_response
from app.models import db, CRT, CRT_Gasto, Remitente, Transportadora, Ciudad, Pais, Moneda
from sqlalchemy.orm import joinedload
from datetime import datetime
import io
import traceback
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from PyPDF2 import PdfReader, PdfWriter

crt_bp = Blueprint('crt', __name__, url_prefix='/api/crts')

# ========== UTILIDAD PARA FORMATO ==========

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
        "valor_mercaderia": str(val(crt, 'valor_mercaderia', '')),
        "declaracion_mercaderia": str(val(crt, 'declaracion_mercaderia', '')),
        "factura_exportacion": val(crt, 'factura_exportacion', ''),
        "nro_despacho": val(crt, 'nro_despacho', ''),
        "documentos_anexos": val(crt, 'documentos_anexos', ''),
        "formalidades_aduana": val(crt, 'formalidades_aduana', ''),
        "valor_flete_externo": str(val(crt, 'valor_flete_externo', '')),
        "valor_reembolso": str(val(crt, 'valor_reembolso', '')),
        "transporte_sucesivos": val(crt, 'transporte_sucesivos', ''),
        "observaciones": val(crt, 'observaciones', ''),
        "gastos": [to_dict_gasto(g) for g in crt.gastos],
    }

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

# ========== ENDPOINTS CRUD ==========

@crt_bp.route('/', methods=['GET'])
def listar_crts():
    crts = CRT.query.options(
        joinedload(CRT.gastos),
        joinedload(CRT.remitente),
        joinedload(CRT.transportadora),
        joinedload(CRT.destinatario),
        joinedload(CRT.consignatario),
        joinedload(CRT.moneda)
    ).order_by(CRT.id.desc()).all()
    return jsonify([to_dict_crt(c) for c in crts])

@crt_bp.route('/<int:crt_id>', methods=['GET'])
def detalle_crt(crt_id):
    crt = CRT.query.options(
        joinedload(CRT.gastos),
        joinedload(CRT.remitente),
        joinedload(CRT.transportadora),
        joinedload(CRT.destinatario),
        joinedload(CRT.consignatario),
        joinedload(CRT.moneda)
    ).filter_by(id=crt_id).first_or_404()
    return jsonify(to_dict_crt(crt))

@crt_bp.route('/', methods=['POST'])
def crear_crt():
    try:
        data = request.json
        crt = CRT(
            numero_crt=data.get("numero_crt"),
            fecha_emision=datetime.strptime(data.get("fecha_emision"), "%Y-%m-%d") if data.get("fecha_emision") else datetime.utcnow(),
            estado=data.get("estado", "EMITIDO"),
            remitente_id=data["remitente_id"],
            destinatario_id=data["destinatario_id"],
            consignatario_id=data.get("consignatario_id"),
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
            valor_mercaderia=data.get("valor_mercaderia"),
            declaracion_mercaderia=data.get("declaracion_mercaderia"),
            factura_exportacion=data.get("factura_exportacion"),
            nro_despacho=data.get("nro_despacho"),
            documentos_anexos=data.get("documentos_anexos"),
            formalidades_aduana=data.get("formalidades_aduana"),
            valor_flete_externo=data.get("valor_flete_externo"),
            valor_reembolso=data.get("valor_reembolso"),
            transporte_sucesivos=data.get("transporte_sucesivos"),
            observaciones=data.get("observaciones"),
        )
        db.session.add(crt)
        db.session.flush()  # Para obtener ID antes de gastos

        # Gastos
        for gasto in data.get("gastos", []):
            g = CRT_Gasto(
                crt_id=crt.id,
                tramo=gasto.get("tramo"),
                valor_remitente=gasto.get("valor_remitente"),
                moneda_remitente_id=gasto.get("moneda_remitente_id"),
                valor_destinatario=gasto.get("valor_destinatario"),
                moneda_destinatario_id=gasto.get("moneda_destinatario_id")
            )
            db.session.add(g)
        db.session.commit()
        return jsonify({"message": "CRT creado", "id": crt.id}), 201
    except Exception as e:
        print("\nERROR EN CREAR CRT".center(80, "-"))
        print(traceback.format_exc())
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@crt_bp.route('/<int:crt_id>', methods=['PUT'])
def editar_crt(crt_id):
    try:
        crt = CRT.query.options(joinedload(CRT.gastos)).filter_by(id=crt_id).first_or_404()
        data = request.json

        crt.numero_crt = data.get("numero_crt", crt.numero_crt)
        crt.estado = data.get("estado", crt.estado)
        crt.fecha_emision = datetime.strptime(data.get("fecha_emision"), "%Y-%m-%d") if data.get("fecha_emision") else crt.fecha_emision
        crt.remitente_id = data.get("remitente_id", crt.remitente_id)
        crt.destinatario_id = data.get("destinatario_id", crt.destinatario_id)
        crt.consignatario_id = data.get("consignatario_id", crt.consignatario_id)
        crt.transportadora_id = data.get("transportadora_id", crt.transportadora_id)
        crt.ciudad_emision_id = data.get("ciudad_emision_id", crt.ciudad_emision_id)
        crt.pais_emision_id = data.get("pais_emision_id", crt.pais_emision_id)
        crt.lugar_entrega = data.get("lugar_entrega", crt.lugar_entrega)
        crt.detalles_mercaderia = data.get("detalles_mercaderia", crt.detalles_mercaderia)
        crt.peso_bruto = data.get("peso_bruto", crt.peso_bruto)
        crt.peso_neto = data.get("peso_neto", crt.peso_neto)
        crt.volumen = data.get("volumen", crt.volumen)
        crt.incoterm = data.get("incoterm", crt.incoterm)
        crt.moneda_id = data.get("moneda_id", crt.moneda_id)
        crt.valor_mercaderia = data.get("valor_mercaderia", crt.valor_mercaderia)
        crt.declaracion_mercaderia = data.get("declaracion_mercaderia", crt.declaracion_mercaderia)
        crt.factura_exportacion = data.get("factura_exportacion", crt.factura_exportacion)
        crt.nro_despacho = data.get("nro_despacho", crt.nro_despacho)
        crt.documentos_anexos = data.get("documentos_anexos", crt.documentos_anexos)
        crt.formalidades_aduana = data.get("formalidades_aduana", crt.formalidades_aduana)
        crt.valor_flete_externo = data.get("valor_flete_externo", crt.valor_flete_externo)
        crt.valor_reembolso = data.get("valor_reembolso", crt.valor_reembolso)
        crt.transporte_sucesivos = data.get("transporte_sucesivos", crt.transporte_sucesivos)
        crt.observaciones = data.get("observaciones", crt.observaciones)

        # Gastos: eliminar y volver a agregar (simplificado)
        for g in crt.gastos:
            db.session.delete(g)
        db.session.flush()
        for gasto in data.get("gastos", []):
            g = CRT_Gasto(
                crt_id=crt.id,
                tramo=gasto.get("tramo"),
                valor_remitente=gasto.get("valor_remitente"),
                moneda_remitente_id=gasto.get("moneda_remitente_id"),
                valor_destinatario=gasto.get("valor_destinatario"),
                moneda_destinatario_id=gasto.get("moneda_destinatario_id")
            )
            db.session.add(g)
        db.session.commit()
        return jsonify({"message": "CRT actualizado", "id": crt.id})
    except Exception as e:
        print("\nERROR EN EDITAR CRT".center(80, "-"))
        print(traceback.format_exc())
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

@crt_bp.route('/<int:crt_id>', methods=['DELETE'])
def eliminar_crt(crt_id):
    try:
        crt = CRT.query.options(joinedload(CRT.gastos)).filter_by(id=crt_id).first_or_404()
        for g in crt.gastos:
            db.session.delete(g)
        db.session.delete(crt)
        db.session.commit()
        return jsonify({"message": "CRT eliminado"})
    except Exception as e:
        print("\nERROR EN ELIMINAR CRT".center(80, "-"))
        print(traceback.format_exc())
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# ========== GENERACIÓN PDF ==========

@crt_bp.route('/<int:crt_id>/pdf', methods=['POST'])
def generar_pdf_crt(crt_id):
    try:
        crt = CRT.query.options(
            joinedload(CRT.gastos),
            joinedload(CRT.remitente),
            joinedload(CRT.transportadora),
            joinedload(CRT.destinatario),
            joinedload(CRT.consignatario),
            joinedload(CRT.moneda)
        ).filter_by(id=crt_id).first_or_404()

        datos = {
            "remitente": crt.remitente.nombre if crt.remitente else "",
            "numero_crt": crt.numero_crt or "",
            "transportadora": crt.transportadora.nombre if crt.transportadora else "",
            "destinatario": crt.destinatario.nombre if crt.destinatario else "",
            "consignatario": crt.consignatario.nombre if crt.consignatario else "",
            "notificar_a": crt.destinatario.nombre if crt.destinatario else "",
            "lugar_emision": crt.lugar_entrega or "",
            "lugar_pais_fecha_transportador": f"{crt.lugar_entrega or ''} - {crt.fecha_emision.strftime('%d/%m/%Y') if crt.fecha_emision else ''}",
            "lugar_pais_plazo_entrega": crt.lugar_entrega or "",
            "transporte_sucesivos": crt.transporte_sucesivos or "",
            "detalles_mercaderia": crt.detalles_mercaderia or "",
            "peso_bruto": str(crt.peso_bruto or ""),
            "peso_neto": str(crt.peso_neto or ""),
            "volumen": str(crt.volumen or ""),
            "valor": str(crt.valor_mercaderia or ""),
            "moneda": crt.moneda.nombre if crt.moneda else "",
            "incoterm": crt.incoterm or "",
            "declaracion_valor_mercaderia": str(crt.declaracion_mercaderia or ""),
            "factura_exportacion": crt.factura_exportacion or "",
            "nro_despacho": crt.nro_despacho or "",
            "documentos_anexos": crt.documentos_anexos or "",
            "instrucciones_aduana": crt.formalidades_aduana or "",
            "valor_flete_externo": str(crt.valor_flete_externo or ""),
            "valor_reembolso": str(crt.valor_reembolso or ""),
            "firma_remitente": crt.remitente.nombre if crt.remitente else "",
            "fecha_firma_remitente": crt.fecha_emision.strftime('%d/%m/%Y') if crt.fecha_emision else "",
            "firma_transportador": crt.transportadora.nombre if crt.transportadora else "",
            "fecha_firma_transportador": crt.fecha_emision.strftime('%d/%m/%Y') if crt.fecha_emision else "",
            "firma_destinatario": crt.destinatario.nombre if crt.destinatario else "",
            "fecha_firma_destinatario": crt.fecha_emision.strftime('%d/%m/%Y') if crt.fecha_emision else "",
            "observaciones": crt.observaciones or "",
        }

        gastos = []
        for g in crt.gastos:
            gastos.append({
                "tramo": g.tramo or "",
                "valor_remitente": str(g.valor_remitente or ""),
                "moneda_remitente": g.moneda_remitente.nombre if g.moneda_remitente else "",
                "valor_destinatario": str(g.valor_destinatario or ""),
                "moneda_destinatario": g.moneda_destinatario.nombre if g.moneda_destinatario else "",
            })

        plantilla_path = "ruta/Plantilla_CRT_Vacio.pdf"  # Cambia a tu ruta real
        pdf_reader = PdfReader(open(plantilla_path, "rb"))
        packet = io.BytesIO()
        can = canvas.Canvas(packet, pagesize=A4)
        can.setFont("Helvetica", 9)

        # MAPEO DE CAMPOS (adapta a tus posiciones)
        y = 770
        for linea in str(datos['remitente']).split('\n'):
            can.drawString(55, y, linea)
            y -= 13
        can.drawString(430, 770, datos['numero_crt'])
        y_t = 740
        for linea in str(datos['transportadora']).split('\n'):
            can.drawString(55, y_t, linea)
            y_t -= 13
        y_d = 715
        for linea in str(datos['destinatario']).split('\n'):
            can.drawString(55, y_d, linea)
            y_d -= 13
        y_c = 690
        for linea in str(datos['consignatario']).split('\n'):
            can.drawString(55, y_c, linea)
            y_c -= 13
        y_n = 665
        for linea in str(datos['notificar_a']).split('\n'):
            can.drawString(55, y_n, linea)
            y_n -= 13
        can.drawString(55, 640, datos['lugar_emision'])
        can.drawString(320, 640, datos['lugar_pais_fecha_transportador'])
        can.drawString(55, 620, datos['lugar_pais_plazo_entrega'])
        can.drawString(55, 605, datos['transporte_sucesivos'])
        y_m = 590
        for linea in str(datos['detalles_mercaderia']).split('\n'):
            can.drawString(55, y_m, linea)
            y_m -= 13
        can.drawString(55, 520, datos['peso_bruto'])
        can.drawString(170, 520, datos['peso_neto'])
        can.drawString(290, 520, datos['volumen'])
        can.drawString(375, 520, datos['valor'])
        can.drawString(470, 520, datos['moneda'])
        can.drawString(525, 520, datos['incoterm'])
        y_g = 500
        for g in gastos:
            can.drawString(55, y_g, g["tramo"])
            can.drawString(180, y_g, g["valor_remitente"])
            can.drawString(240, y_g, g["moneda_remitente"])
            can.drawString(320, y_g, g["valor_destinatario"])
            can.drawString(380, y_g, g["moneda_destinatario"])
            y_g -= 15
        can.drawString(55, 435, datos['declaracion_valor_mercaderia'])
        can.drawString(250, 435, datos['factura_exportacion'])
        can.drawString(425, 435, datos['nro_despacho'])
        y_x = 415
        for linea in str(datos['documentos_anexos']).split('\n'):
            can.drawString(55, y_x, linea)
            y_x -= 13
        can.drawString(55, 400, datos['instrucciones_aduana'])
        can.drawString(55, 385, datos['valor_flete_externo'])
        can.drawString(250, 385, datos['valor_reembolso'])
        can.drawString(55, 360, datos['firma_remitente'])
        can.drawString(250, 360, datos['fecha_firma_remitente'])
        can.drawString(360, 360, datos['firma_transportador'])
        can.drawString(520, 360, datos['fecha_firma_transportador'])
        can.drawString(55, 340, datos['firma_destinatario'])
        can.drawString(250, 340, datos['fecha_firma_destinatario'])
        y_o = 320
        for linea in str(datos['observaciones']).split('\n'):
            can.drawString(55, y_o, linea)
            y_o -= 13

        can.save()
        packet.seek(0)
        new_pdf = PdfReader(packet)
        output = PdfWriter()
        page = pdf_reader.pages[0]
        page.merge_page(new_pdf.pages[0])
        output.add_page(page)
        output_stream = io.BytesIO()
        output.write(output_stream)
        output_stream.seek(0)
        response = make_response(output_stream.read())
        response.headers['Content-Type'] = 'application/pdf'
        response.headers['Content-Disposition'] = f'inline; filename=CRT_{crt_id}.pdf'
        return response
    except Exception as e:
        print("\nERROR EN GENERAR PDF CRT".center(80, "-"))
        print(traceback.format_exc())
        return jsonify({"error": str(e), "trace": traceback.format_exc()}), 500

# Recuerda registrar tu blueprint en __init__.py:
# from app.routes.crt import crt_bp
# app.register_blueprint(crt_bp)
