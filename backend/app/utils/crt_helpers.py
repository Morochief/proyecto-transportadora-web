"""
Funciones auxiliares para el módulo CRT.
Contiene utilidades de parsing y validación de datos.
"""


def parse_number(val):
    """
    Convierte un valor a número flotante, manejando formatos locales y estándar.
    Si contiene coma, asume formato local (coma decimal, punto opcional de miles).
    Si no contiene coma pero tiene punto, asume formato estándar (punto decimal).
    
    Args:
        val: Valor a convertir (str, int, float o None)
        
    Returns:
        float o None si no se puede convertir
    """
    if val is None or val == "":
        return None
    if isinstance(val, (int, float)):
        return float(val)
    val_str = str(val).strip()
    if ',' in val_str:
        val_str = val_str.replace('.', '').replace(',', '.')
    try:
        return float(val_str)
    except Exception:
        return None


def limpiar_numericos(dic, campos):
    """
    Limpia y parsea campos numéricos en un diccionario.
    
    Args:
        dic: Diccionario con los datos
        campos: Lista de nombres de campos a limpiar
        
    Returns:
        Diccionario modificado con campos parseados
    """
    for campo in campos:
        dic[campo] = parse_number(dic.get(campo))
    return dic


# Campos numéricos estándar en CRT
NUMERIC_FIELDS = [
    "peso_bruto", "peso_neto", "volumen",
    "valor_incoterm", "declaracion_mercaderia",
    "valor_flete_externo", "valor_reembolso"
]
