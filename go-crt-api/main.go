package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

// ✅ ACTUALIZADO: Estructura CRT con todos los campos necesarios
type CRT struct {
	ID                      int    `json:"id"` // ✅ NUEVO: ID numérico
	NumeroCRT               string `json:"numero_crt"`
	Estado                  string `json:"estado"`
	Transportadora          string `json:"transportadora"`
	TransportadoraNombre    string `json:"transportadora_nombre"`
	TransportadoraDireccion string `json:"transportadora_direccion"`
	Remitente               string `json:"remitente"`
	Destinatario            string `json:"destinatario"`
	FacturaExportacion      string `json:"factura_exportacion"`
	DetallesMercaderia      string `json:"detalles_mercaderia"`
	Aduana                  string `json:"aduana"`
	TipoBultos              string `json:"tipo_bultos"`
	Tramo                   string `json:"tramo"`
}

var db *sql.DB

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

	// ✅ IMPORTANTE: Endpoints en el orden correcto (más específico primero)
	r.HandleFunc("/api/crts/simple", listarSimple).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/crts/{id:[0-9]+}", obtenerCRTPorID).Methods("GET", "OPTIONS")  // ID numérico
	r.HandleFunc("/api/crts/{numero}", obtenerCRTPorNumero).Methods("GET", "OPTIONS") // Número de CRT

	log.Println("🚀 Servidor HTTP corriendo en :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}

// GET /api/crts/simple
func listarSimple(w http.ResponseWriter, r *http.Request) {
	log.Println("📋 GET /api/crts/simple")

	query := `
        SELECT
            c.id,
            c.numero_crt, 
            c.estado,
            COALESCE(t.nombre, '') as transportadora,
            COALESCE(rm.nombre, '') as remitente,
            COALESCE(d.nombre, '') as destinatario,
            COALESCE(c.factura_exportacion, '') as factura,
            COALESCE(c.detalles_mercaderia, '') as detalles
        FROM crts c
        LEFT JOIN transportadoras t ON t.id = c.transportadora_id
        LEFT JOIN remitentes rm ON rm.id = c.remitente_id
        LEFT JOIN remitentes d ON d.id = c.destinatario_id
        ORDER BY c.id DESC
        LIMIT 20
    `

	log.Println("🔍 Ejecutando query:", query)

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
		if err := rows.Scan(&c.ID, &c.NumeroCRT, &c.Estado, &c.Transportadora, &c.Remitente, &c.Destinatario, &c.FacturaExportacion, &c.DetallesMercaderia); err != nil {
			log.Println("❌ Error en rows.Scan:", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		c.TransportadoraNombre = c.Transportadora // Para compatibilidad
		crts = append(crts, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(crts)
	log.Printf("✅ Enviados %d CRTs\n", len(crts))
}

// GET /api/crts/{id} - Por ID numérico (NUEVO)
func obtenerCRTPorID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	log.Printf("🔍 GET /api/crts/%s (por ID)\n", id)

	query := `
        SELECT
            c.id,
            c.numero_crt, 
            c.estado,
            COALESCE(t.nombre, '') as transportadora,
            COALESCE(t.direccion, '') as transportadora_direccion,
            COALESCE(rm.nombre, '') as remitente,
            COALESCE(d.nombre, '') as destinatario,
            COALESCE(c.factura_exportacion, '') as factura,
            COALESCE(c.detalles_mercaderia, '') as detalles
        FROM crts c
        LEFT JOIN transportadoras t ON t.id = c.transportadora_id
        LEFT JOIN remitentes rm ON rm.id = c.remitente_id
        LEFT JOIN remitentes d ON d.id = c.destinatario_id
        WHERE c.id = $1
    `

	log.Printf("🔍 Query: %s con ID=%s\n", query, id)

	var c CRT
	err := db.QueryRow(query, id).Scan(
		&c.ID,
		&c.NumeroCRT,
		&c.Estado,
		&c.Transportadora,
		&c.TransportadoraDireccion,
		&c.Remitente,
		&c.Destinatario,
		&c.FacturaExportacion,
		&c.DetallesMercaderia,
	)

	if err != nil {
		log.Printf("❌ Error buscando CRT por ID %s: %v\n", id, err)
		http.Error(w, "CRT no encontrado: "+err.Error(), http.StatusNotFound)
		return
	}

	// Para compatibilidad con el frontend
	c.TransportadoraNombre = c.Transportadora
	c.Aduana = "" // Valores por defecto
	c.TipoBultos = ""
	c.Tramo = ""

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
	log.Printf("✅ Enviado CRT por ID %s: numero_crt=%s, detalles_mercaderia='%s'\n", id, c.NumeroCRT, c.DetallesMercaderia)
}

// GET /api/crts/{numero} - Por número de CRT
func obtenerCRTPorNumero(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	numero := vars["numero"]

	log.Printf("🔍 GET /api/crts/%s (por número)\n", numero)

	query := `
        SELECT
            c.id,
            c.numero_crt, 
            c.estado,
            COALESCE(t.nombre, '') as transportadora,
            COALESCE(t.direccion, '') as transportadora_direccion,
            COALESCE(rm.nombre, '') as remitente,
            COALESCE(d.nombre, '') as destinatario,
            COALESCE(c.factura_exportacion, '') as factura,
            COALESCE(c.detalles_mercaderia, '') as detalles
        FROM crts c
        LEFT JOIN transportadoras t ON t.id = c.transportadora_id
        LEFT JOIN remitentes rm ON rm.id = c.remitente_id
        LEFT JOIN remitentes d ON d.id = c.destinatario_id
        WHERE c.numero_crt = $1
    `

	log.Printf("🔍 Query: %s con numero=%s\n", query, numero)

	var c CRT
	err := db.QueryRow(query, numero).Scan(
		&c.ID,
		&c.NumeroCRT,
		&c.Estado,
		&c.Transportadora,
		&c.TransportadoraDireccion,
		&c.Remitente,
		&c.Destinatario,
		&c.FacturaExportacion,
		&c.DetallesMercaderia,
	)

	if err != nil {
		log.Printf("❌ Error buscando CRT por número %s: %v\n", numero, err)
		http.Error(w, "CRT no encontrado: "+err.Error(), http.StatusNotFound)
		return
	}

	// Para compatibilidad con el frontend
	c.TransportadoraNombre = c.Transportadora
	c.Aduana = "" // Valores por defecto
	c.TipoBultos = ""
	c.Tramo = ""

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
	log.Printf("✅ Enviado CRT por número %s: id=%d, detalles_mercaderia='%s'\n", numero, c.ID, c.DetallesMercaderia)
}
