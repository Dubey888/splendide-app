import axios from 'axios';

// Cambia esto por la URL real de tu API en Clever Cloud
const API_BASE_URL = 'https://app-23c8f020-a783-451d-b1cf-b48a15a79604.cleverapps.io/index.php';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const ProductoService = {
  // 1. Obtener producto (Acción GET)
  obtener: (tipo, valor, tienda) => 
    api.get(`?accion=obtener_producto_rapido&tipo=${tipo}&valor=${valor}&tienda=${tienda}`),

  // 2. Guardar producto nuevo (Acción POST)
  guardar: (data) => api.post('?accion=guardar_producto_completo', data),

  // 3. Sincronizar/Editar existente (Acción POST)
  sincronizar: (data) => api.post('?accion=sincronizar_producto_completo', data),

  // 4. Editar variante rápida (Acción POST)
  editarVariante: (data) => api.post('?accion=editar_variante_rapido', data),

  // 5. Eliminar (Acción POST)
  eliminar: (codigo, tienda) => api.post('?accion=eliminar_producto_completo', { codigo, tienda }),
};