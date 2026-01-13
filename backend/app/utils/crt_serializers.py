"""
Serializadores para el módulo CRT.
Contiene funciones para convertir objetos del modelo a diccionarios JSON.
"""


def to_dict_gasto(g):
    """
    Serializa un objeto CRT_Gasto a diccionario.
    
    Args:
        g: Objeto CRT_Gasto
        
    Returns:
        Diccionario con los datos del gasto
    """
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
    """
    Serializa un objeto CRT a diccionario completo.
    
    Args:
        crt: Objeto CRT con relaciones cargadas
        
    Returns:
        Diccionario con todos los datos del CRT
    """
    def val(obj, attr, default=""):
        """Helper para obtener valores de atributos con fallback."""
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
        "transportadora_rol_contribuyente": crt.transportadora.rol_contribuyente if crt.transportadora else "",
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
