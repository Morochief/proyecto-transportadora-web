import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/api";
import {
  Users, Globe, Building2, UserCheck, Truck, FileText,
  ArrowLeftRight, Coins, DollarSign,
  TrendingUp, Activity, BarChart3, History
} from "lucide-react";

// Configuración de módulos con un diseño más sobrio
const modules = [
  {
    name: "Usuarios",
    icon: Users,
    path: "/usuarios",
    description: "Gestión de acceso y roles",
    statsKey: "usuarios"
  },
  {
    name: "Países",
    icon: Globe,
    path: "/paises",
    description: "Configuración regional",
    statsKey: "paises"
  },
  {
    name: "Ciudades",
    icon: Building2,
    path: "/ciudades",
    description: "Localidades operativas",
    statsKey: "ciudades"
  },
  {
    name: "Remitentes",
    icon: UserCheck,
    path: "/remitentes",
    description: "Base de datos de clientes",
    statsKey: "remitentes"
  },
  {
    name: "Transportadoras",
    icon: Truck,
    path: "/transportadoras",
    description: "Flota y empresas de transporte",
    statsKey: "transportadoras"
  },
  {
    name: "CRT",
    icon: FileText,
    path: "/crt",
    description: "Cartas de Porte Internacional",
    statsKey: "crt"
  },
  {
    name: "Historial CRT",
    icon: History,
    path: "/listar-crt",
    description: "Ver historial y editar CRTs",
    statsKey: "crt"
  },
  {
    name: "MIC",
    icon: ArrowLeftRight,
    path: "/mic",
    description: "Manifiestos de Carga",
    statsKey: "mic"
  },
  {
    name: "Aduanas",
    icon: Building2,
    path: "/aduanas",
    description: "Gestión de Aduanas",
    statsKey: "aduanas"
  },
  {
    name: "Monedas",
    icon: Coins,
    path: "/monedas",
    description: "Tipos de cambio y divisas",
    statsKey: "monedas"
  },
  {
    name: "Honorarios",
    icon: DollarSign,
    path: "/honorarios",
    description: "Control financiero",
    statsKey: "honorarios"
  },
];

const StatsCard = ({ title, value, icon: Icon, trend }) => (
  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      </div>
      <div className="p-2 bg-indigo-50 rounded-lg">
        <Icon className="w-5 h-5 text-indigo-600" />
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center text-sm">
        <span className="text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full">
          <TrendingUp className="w-3 h-3" /> {trend}
        </span>
        <span className="text-slate-400 ml-2">vs mes anterior</span>
      </div>
    )}
  </div>
);

const ModuleCard = ({ module, stats }) => {
  const Icon = module.icon;
  const moduleStats = stats[module.statsKey] || 0;

  return (
    <Link
      to={module.path}
      className="group bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 flex flex-col h-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors duration-300">
          <Icon className="w-6 h-6 text-slate-600 group-hover:text-indigo-600 transition-colors duration-300" />
        </div>
        <span className="bg-slate-100 text-slate-600 text-xs font-semibold px-2.5 py-1 rounded-full group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
          {moduleStats}
        </span>
      </div>

      <div className="mt-auto">
        <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors mb-1">
          {module.name}
        </h3>
        <p className="text-sm text-slate-500 line-clamp-2">
          {module.description}
        </p>
      </div>
    </Link>
  );
};

function Dashboard() {
  const [stats, setStats] = useState({
    usuarios: 0, paises: 0, ciudades: 0, remitentes: 0,
    transportadoras: 0, crt: 0, mic: 0, monedas: 0, aduanas: 0,
    honorarios: 0, totalHonorarios: 0, usuariosConectados: 1
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    setIsLoading(true);
    try {
      const [
        paisesRes, ciudadesRes, remitentesRes,
        transportadorasRes, monedasRes, honorariosRes, crtsRes, aduanasRes
      ] = await Promise.all([
        api.get('/paises/').catch(() => ({ data: [] })),
        api.get('/ciudades/').catch(() => ({ data: [] })),
        api.get('/remitentes/').catch(() => ({ data: { items: [] } })),
        api.get('/transportadoras/').catch(() => ({ data: { items: [] } })),
        api.get('/monedas/').catch(() => ({ data: [] })),
        api.get('/honorarios/').catch(() => ({ data: [] })),
        api.get('/crts/').catch(() => ({ data: [] })),
        api.get('/aduanas/').catch(() => ({ data: [] }))
      ]);

      const honorariosData = Array.isArray(honorariosRes.data) ? honorariosRes.data : [];
      const totalHonorarios = honorariosData.reduce((acc, h) => acc + (parseFloat(h.monto) || 0), 0);

      const aduanasCount = aduanasRes?.data?.length || 0;

      setStats({
        paises: paisesRes.data.length || 0,
        ciudades: ciudadesRes.data.length || 0,
        remitentes: (Array.isArray(remitentesRes.data.items) ? remitentesRes.data.items : []).length,
        transportadoras: (Array.isArray(transportadorasRes.data.items) ? transportadorasRes.data.items : transportadorasRes.data || []).length,
        monedas: monedasRes.data.length || 0,
        honorarios: honorariosData.length,
        crt: (Array.isArray(crtsRes.data) ? crtsRes.data : []).length,
        usuarios: 0,
        mic: 0,
        aduanas: aduanasCount,
        totalHonorarios: totalHonorarios,
        usuariosConectados: 1
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
            Panel de Control
          </h1>
          <p className="text-slate-500 mt-1">
            Resumen general de operaciones y métricas clave.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Documentos (CRT+MIC)"
          value={isLoading ? "-" : (stats.crt + stats.mic).toLocaleString()}
          icon={FileText}
        />
        <StatsCard
          title="Transportadoras"
          value={isLoading ? "-" : stats.transportadoras}
          icon={Truck}
        />
        <StatsCard
          title="Facturación Total"
          value={isLoading ? "-" : `$${stats.totalHonorarios.toLocaleString()}`}
          icon={Activity}
        />
        <StatsCard
          title="Usuarios Activos"
          value={isLoading ? "-" : stats.usuariosConectados}
          icon={UserCheck}
        />
      </div>

      {/* Modules Grid */}
      <div>
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-indigo-600" />
          <h2 className="text-xl font-bold text-slate-800">
            Accesos Directos
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {modules.map((module) => (
            <ModuleCard
              key={module.name}
              module={module}
              stats={stats}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;