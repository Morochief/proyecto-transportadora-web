import { useState, useEffect } from "react";
import api from "../api/api";

const cache = {
  paises: null,
  ciudades: null,
  monedas: null,
  transportadoras: null,
  entidades: null,
  estados: null,
};

export function useRefData(types = ["paises", "ciudades", "monedas", "transportadoras"]) {
  const [data, setData] = useState({
    paises: cache.paises || [],
    ciudades: cache.ciudades || [],
    monedas: cache.monedas || [],
    transportadoras: cache.transportadoras || [],
    entidades: cache.entidades || [],
    estados: cache.estados || [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNeeded = [];
    const endpoints = {
      paises: "/paises/",
      ciudades: "/ciudades/",
      monedas: "/monedas/",
      transportadoras: "/crts/data/transportadoras",
      entidades: "/crts/data/entidades",
      estados: "/crts/estados",
    };

    types.forEach((type) => {
      if (!cache[type]) {
        fetchNeeded.push(type);
      }
    });

    if (fetchNeeded.length === 0) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const requests = fetchNeeded.map((type) => api.get(endpoints[type]));
        const responses = await Promise.all(requests);
        
        fetchNeeded.forEach((type, index) => {
          const resData = responses[index].data;
          let items = Array.isArray(resData) ? resData : (resData.items || resData.estados || []);
          if (items.length > 0 && items[0].nombre) {
            items = [...items].sort((a, b) => a.nombre.localeCompare(b.nombre));
          }
          cache[type] = items;
        });

        setData({
          paises: cache.paises || [],
          ciudades: cache.ciudades || [],
          monedas: cache.monedas || [],
          transportadoras: cache.transportadoras || [],
          entidades: cache.entidades || [],
          estados: cache.estados || [],
        });
      } catch (err) {
        console.error("Error loading reference data", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [types]);

  return { ...data, loading, error };
}
