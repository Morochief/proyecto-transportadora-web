import React from "react";

export default function StatusBadge({ status }) {
  const normStatus = (status || "").toUpperCase().replace("_", " ");
  
  let styles = "bg-slate-100 text-slate-600 border-slate-200";
  
  if (normStatus === "DEFINITIVO" || normStatus === "EMITIDO" || normStatus === "ACTIVO") {
    styles = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (normStatus === "ANULADO" || normStatus === "INACTIVO" || normStatus === "ERROR") {
    styles = "bg-red-50 text-red-700 border-red-200";
  } else if (normStatus === "PROVISORIO" || normStatus === "BORRADOR") {
    styles = "bg-amber-50 text-amber-700 border-amber-200";
  } else if (normStatus === "EN TRANSITO" || normStatus === "PROCESANDO") {
    styles = "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles}`}>
      {normStatus}
    </span>
  );
}
