package main

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

// Estructura básica de CRT (ajusta campos según lo que devuelvas)
type CRT struct {
	NumeroCRT          string `json:"numero_crt"`
	Estado             string `json:"estado"`
	Transportadora     string `json:"transportadora"`
	Remitente          string `json:"remitente"`
	Destinatario       string `json:"destinatario"`
	FacturaExportacion string `json:"factura_exportacion"`
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

	// Endpoints
	r.HandleFunc("/api/crts/simple", listarSimple).Methods("GET", "OPTIONS")
	r.HandleFunc("/api/crts/{numero}", obtenerCRT).Methods("GET", "OPTIONS")

	log.Println("🚀 Servidor HTTP corriendo en :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}

// GET /api/crts/simple
func listarSimple(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT 
			c.numero_crt, c.estado,
			COALESCE(t.nombre, ''),
			COALESCE(rm.nombre, ''),
			COALESCE(d.nombre, ''),
			COALESCE(c.factura_exportacion, '')
		FROM crts c
		LEFT JOIN transportadoras t ON t.id = c.transportadora_id
		LEFT JOIN remitentes rm ON rm.id = c.remitente_id
		LEFT JOIN remitentes d ON d.id = c.destinatario_id
		ORDER BY c.id DESC
	`
	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Println("❌ Error ejecutando query:", err)
		return
	}
	defer rows.Close()

	var crts []CRT
	for rows.Next() {
		var c CRT
		if err := rows.Scan(&c.NumeroCRT, &c.Estado, &c.Transportadora, &c.Remitente, &c.Destinatario, &c.FacturaExportacion); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			log.Println("❌ Error en rows.Scan:", err)
			return
		}
		crts = append(crts, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(crts)
	log.Printf("✅ Enviados %d CRTs\n", len(crts))
}

// GET /api/crts/{numero}
func obtenerCRT(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	numero := vars["numero"]

	query := `
		SELECT 
			c.numero_crt, c.estado,
			COALESCE(t.nombre, ''),
			COALESCE(rm.nombre, ''),
			COALESCE(d.nombre, ''),
			COALESCE(c.factura_exportacion, '')
		FROM crts c
		LEFT JOIN transportadoras t ON t.id = c.transportadora_id
		LEFT JOIN remitentes rm ON rm.id = c.remitente_id
		LEFT JOIN remitentes d ON d.id = c.destinatario_id
		WHERE c.numero_crt = $1
	`
	var c CRT
	err := db.QueryRow(query, numero).Scan(&c.NumeroCRT, &c.Estado, &c.Transportadora, &c.Remitente, &c.Destinatario, &c.FacturaExportacion)
	if err != nil {
		http.Error(w, "CRT no encontrado: "+err.Error(), http.StatusNotFound)
		log.Println("❌ Error buscando CRT:", err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(c)
	log.Printf("✅ Enviado CRT: %+v\n", c)
}
