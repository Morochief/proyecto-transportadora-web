package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

// ✅ Estructura CRT ACTUALIZADA con campos de documento
type CRT struct {
	ID        int    `json:"id"`
	NumeroCRT string `json:"numero_crt"`
	Estado    string `json:"estado"`

	// ✅ TRANSPORTADORA con documentos
	Transportadora              string `json:"transportadora"`
	TransportadoraNombre        string `json:"transportadora_nombre"`
	TransportadoraDireccion     string `json:"transportadora_direccion"`
	TransportadoraDocumento     string `json:"transportadora_documento"`
	TransportadoraTipoDocumento string `json:"transportadora_tipo_documento"`

	// ✅ REMITENTE con documentos
	Remitente              string `json:"remitente"`
	RemitenteDocumento     string `json:"remitente_documento"`
	RemitenteTipoDocumento string `json:"remitente_tipo_documento"`

	// ✅ DESTINATARIO con documentos
	Destinatario              string `json:"destinatario"`
	DestinatarioDocumento     string `json:"destinatario_documento"`
	DestinatarioTipoDocumento string `json:"destinatario_tipo_documento"`

	// Campos normales
	FacturaExportacion    string  `json:"factura_exportacion"`
	DetallesMercaderia    string  `json:"detalles_mercaderia"`
	Aduana                string  `json:"aduana"`
	TipoBultos            string  `json:"tipo_bultos"`
	Tramo                 string  `json:"tramo"`
	DeclaracionMercaderia string  `json:"declaracion_mercaderia"`
	PesoBruto             float64 `json:"peso_bruto"`
}

var db *sql.DB

func printBanner() {
	fmt.Println("\033[1;32m")
	fmt.Println("OIKOOOOO LPM!! 💪 🚀  (Ñandeko)")
	fmt.Println("\033[0m")
}

func main() {
	var err error
	connStr := "postgres://postgres:Mjjagkaz012.@localhost/logistica?sslmode=disable"
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("❌ Error opening database:", err)
	}
	if err := db.Ping(); err != nil {
		log.Fatal("❌ Error connecting to PostgreSQL:", err)
	}
	log.Println("✅ Conectado a PostgreSQL correctamente.")

	printBanner()

	r := mux.NewRouter()

	// Middleware CORS
	r.Use(mux.CORSMethodMiddleware(r))
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	})

	r.HandleFunc("/api/crts/simple", listarSimple).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/crts/{id:[0-9]+}", obtenerCRTPorID).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/crts/{numero}", obtenerCRTPorNumero).Methods("GET", "OPTIONS")

	log.Println("🚀 Servidor HTTP corriendo en :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}

// ✅ ACTUALIZADO: GET /api/crts/simple con documentos
func listarSimple(w http.ResponseWriter, r *http.Request) {
	log.Println("📋 GET /api/crts/simple")

	query := `
        SELECT
            c.id,
            c.numero_crt,
            c.estado,
            COALESCE(t.nombre, '') as transportadora,
            COALESCE(t.documento, '') as transportadora_documento,
            COALESCE(t.tipo_documento, '') as transportadora_tipo_documento,
            COALESCE(rm.nombre, '') as remitente,
            COALESCE(rm.documento, '') as remitente_documento,
            COALESCE(rm.tipo_documento, '') as remitente_tipo_documento,
            COALESCE(d.nombre, '') as destinatario,
            COALESCE(d.documento, '') as destinatario_documento,
            COALESCE(d.tipo_documento, '') as destinatario_tipo_documento,
            COALESCE(c.factura_exportacion, '') as factura,
            COALESCE(c.detalles_mercaderia, '') as detalles,
            COALESCE(c.declaracion_mercaderia, '') as declaracion_mercaderia,
            COALESCE(c.peso_bruto, 0) as peso_bruto
        FROM crts c
        LEFT JOIN transportadoras t ON t.id = c.transportadora_id
        LEFT JOIN remitentes rm ON rm.id = c.remitente_id
        LEFT JOIN remitentes d ON d.id = c.destinatario_id
        ORDER BY c.id DESC
        LIMIT 20
    `

	rows, err := db.Query(query)
	if err != nil {
		log.Println("❌ Error ejecutando query:", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var crts []CRT
	for rows.Next() {
		var c CRT
		if err := rows.Scan(
			&c.ID,
			&c.NumeroCRT,
			&c.Estado,
			&c.Transportadora,
			&c.TransportadoraDocumento,
			&c.TransportadoraTipoDocumento,
			&c.Remitente,
			&c.RemitenteDocumento,
			&c.RemitenteTipoDocumento,
			&c.Destinatario,
			&c.DestinatarioDocumento,
			&c.DestinatarioTipoDocumento,
			&c.FacturaExportacion,
			&c.DetallesMercaderia,
			&c.DeclaracionMercaderia,
			&c.PesoBruto); err != nil {
			log.Println("❌ Error en rows.Scan:", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		c.TransportadoraNombre = c.Transportadora
		crts = append(crts, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(crts)
	log.Printf("✅ Enviados %d CRTs con documentos\n", len(crts))
}

// ✅ ACTUALIZADO: GET /api/crts/{id} con documentos
func obtenerCRTPorID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	log.Printf("🔍 GET /api/crts/%s (por ID) - CON DOCUMENTOS\n", id)

	query := `
        SELECT
            c.id,
            c.numero_crt,
            c.estado,
            COALESCE(t.nombre, '') as transportadora,
            COALESCE(t.direccion, '') as transportadora_direccion,
            COALESCE(t.documento, '') as transportadora_documento,
            COALESCE(t.tipo_documento, '') as transportadora_tipo_documento,
            COALESCE(rm.nombre, '') as remitente,
            COALESCE(rm.documento, '') as remitente_documento,
            COALESCE(rm.tipo_documento, '') as remitente_tipo_documento,
            COALESCE(d.nombre, '') as destinatario,
            COALESCE(d.documento, '') as destinatario_documento,
            COALESCE(d.tipo_documento, '') as destinatario_tipo_documento,
            COALESCE(c.factura_exportacion, '') as factura,
            COALESCE(c.detalles_mercaderia, '') as detalles,
            COALESCE(c.declaracion_mercaderia, '') as declaracion_mercaderia,
            COALESCE(c.peso_bruto, 0) as peso_bruto
        FROM crts c
        LEFT JOIN transportadoras t ON t.id = c.transportadora_id
        LEFT JOIN remitentes rm ON rm.id = c.remitente_id
        LEFT JOIN remitentes d ON d.id = c.destinatario_id
        WHERE c.id = $1
    `

	var c CRT
	err := db.QueryRow(query, id).Scan(
		&c.ID,
		&c.NumeroCRT,
		&c.Estado,
		&c.Transportadora,
		&c.TransportadoraDireccion,
		&c.TransportadoraDocumento,
		&c.TransportadoraTipoDocumento,
		&c.Remitente,
		&c.RemitenteDocumento,
		&c.RemitenteTipoDocumento,
		&c.Destinatario,
		&c.DestinatarioDocumento,
		&c.DestinatarioTipoDocumento,
		&c.FacturaExportacion,
		&c.DetallesMercaderia,
		&c.DeclaracionMercaderia,
		&c.PesoBruto,
	)

	if err != nil {
		log.Printf("❌ Error buscando CRT por ID %s: %v\n", id, err)
		http.Error(w, "CRT no encontrado: "+err.Error(), http.StatusNotFound)
		return
	}

	c.TransportadoraNombre = c.Transportadora
	c.Aduana = ""
	c.TipoBultos = ""
	c.Tramo = ""

	// ✅ DEBUG: Mostrar documentos obtenidos
	log.Printf("🏢 Transportadora: %s | Doc: %s %s", c.Transportadora, c.TransportadoraTipoDocumento, c.TransportadoraDocumento)
	log.Printf("📤 Remitente: %s | Doc: %s %s", c.Remitente, c.RemitenteTipoDocumento, c.RemitenteDocumento)
	log.Printf("📥 Destinatario: %s | Doc: %s %s", c.Destinatario, c.DestinatarioTipoDocumento, c.DestinatarioDocumento)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
	log.Printf("✅ Enviado CRT por ID %s con documentos completos\n", id)
}

// ✅ ACTUALIZADO: GET /api/crts/{numero} con documentos
func obtenerCRTPorNumero(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	numero := vars["numero"]

	log.Printf("🔍 GET /api/crts/%s (por número) - CON DOCUMENTOS\n", numero)

	query := `
        SELECT
            c.id,
            c.numero_crt,
            c.estado,
            COALESCE(t.nombre, '') as transportadora,
            COALESCE(t.direccion, '') as transportadora_direccion,
            COALESCE(t.documento, '') as transportadora_documento,
            COALESCE(t.tipo_documento, '') as transportadora_tipo_documento,
            COALESCE(rm.nombre, '') as remitente,
            COALESCE(rm.documento, '') as remitente_documento,
            COALESCE(rm.tipo_documento, '') as remitente_tipo_documento,
            COALESCE(d.nombre, '') as destinatario,
            COALESCE(d.documento, '') as destinatario_documento,
            COALESCE(d.tipo_documento, '') as destinatario_tipo_documento,
            COALESCE(c.factura_exportacion, '') as factura,
            COALESCE(c.detalles_mercaderia, '') as detalles,
            COALESCE(c.declaracion_mercaderia, '') as declaracion_mercaderia,
            COALESCE(c.peso_bruto, 0) as peso_bruto
        FROM crts c
        LEFT JOIN transportadoras t ON t.id = c.transportadora_id
        LEFT JOIN remitentes rm ON rm.id = c.remitente_id
        LEFT JOIN remitentes d ON d.id = c.destinatario_id
        WHERE c.numero_crt = $1
    `

	var c CRT
	err := db.QueryRow(query, numero).Scan(
		&c.ID,
		&c.NumeroCRT,
		&c.Estado,
		&c.Transportadora,
		&c.TransportadoraDireccion,
		&c.TransportadoraDocumento,
		&c.TransportadoraTipoDocumento,
		&c.Remitente,
		&c.RemitenteDocumento,
		&c.RemitenteTipoDocumento,
		&c.Destinatario,
		&c.DestinatarioDocumento,
		&c.DestinatarioTipoDocumento,
		&c.FacturaExportacion,
		&c.DetallesMercaderia,
		&c.DeclaracionMercaderia,
		&c.PesoBruto,
	)

	if err != nil {
		log.Printf("❌ Error buscando CRT por número %s: %v\n", numero, err)
		http.Error(w, "CRT no encontrado: "+err.Error(), http.StatusNotFound)
		return
	}

	c.TransportadoraNombre = c.Transportadora
	c.Aduana = ""
	c.TipoBultos = ""
	c.Tramo = ""

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
	log.Printf("✅ Enviado CRT por número %s con documentos completos\n", numero)
}
