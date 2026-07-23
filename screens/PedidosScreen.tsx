import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Modal, ScrollView, Platform 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE_URL = 'https://app-23c8f020-a783-451d-b1cf-b48a15a79604.cleverapps.io/index.php';

const mostrarAlerta = (mensaje: string) => {
  if (Platform.OS === 'web') window.alert(mensaje);
  else require('react-native').Alert.alert("Aviso", mensaje);
};

export default function PedidosScreen({ navigation }: { navigation: any }) {
  const [autorizado, setAutorizado] = useState(false);
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState<any>(null);
  const [detallesPedido, setDetallesPedido] = useState<any[]>([]);
  const [cargandoDetalles, setCargandoDetalles] = useState(false);

  useEffect(() => {
    verificarSesionYCargar();
  }, []);

  const verificarSesionYCargar = async () => {
    try {
      const rol = await AsyncStorage.getItem('userRol');
      const userId = await AsyncStorage.getItem('userId');

      if (rol !== 'admin' || !userId) {
        navigation.replace('LoginScreen'); 
        return;
      }
      
      setAutorizado(true);
      cargarPedidos(userId);
    } catch (error) {
      navigation.replace('LoginScreen');
    }
  };

  const cargarPedidos = async (userId: string) => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}?accion=obtener_pedidos&user_id=${userId}`);
      if (res.data.status === "success") {
        setPedidos(res.data.data);
      }
    } catch (err) {
      console.error("Error cargando pedidos:", err);
      mostrarAlerta("No se pudieron cargar los pedidos.");
    } finally {
      setLoading(false);
    }
  };

  const abrirDetalles = async (pedido: any) => {
    setPedidoSeleccionado(pedido);
    setModalAbierto(true);
    setCargandoDetalles(true);
    setDetallesPedido([]);

    try {
      const res = await axios.get(`${API_BASE_URL}?accion=obtener_detalles_pedido&pedido_id=${pedido.id}`);
      if (res.data.status === "success") {
        setDetallesPedido(res.data.data);
      }
    } catch (error) {
      mostrarAlerta("Error al cargar los productos del pedido.");
    } finally {
      setCargandoDetalles(false);
    }
  };

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!pedidoSeleccionado) return;

    try {
      const res = await axios.post(`${API_BASE_URL}?accion=actualizar_estado_pedido`, {
        pedido_id: pedidoSeleccionado.id,
        estado: nuevoEstado
      }, {
        headers: { 'Content-Type': 'application/json' }
      });

      const data = res.data;
      if (data.status === "success") {
        if (nuevoEstado === 'Entregado') {
          setPedidos(pedidos.filter((p: any) => p.id !== pedidoSeleccionado.id));
          setModalAbierto(false);
        } else {
          setPedidoSeleccionado({ ...pedidoSeleccionado, estado_pago: nuevoEstado });
          setPedidos(pedidos.map(p => p.id === pedidoSeleccionado.id ? { ...p, estado_pago: nuevoEstado } : p));
        }
      } else {
        mostrarAlerta("Error al cambiar estado: " + data.mensaje);
      }
    } catch (error) {
      mostrarAlerta("Error de conexión al cambiar el estado.");
    }
  };

  const cerrarSesion = async () => {
    await AsyncStorage.clear();
    navigation.replace('LoginScreen');
  };

  const colorEstadoStyle = (estado: string) => {
    switch(estado?.toLowerCase()) {
      case 'pagado': return { bg: '#d1fae5', text: '#065f46', border: '#a7f3d0' };
      case 'procesado': return { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' };
      case 'enviado': return { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' };
      case 'entregado': return { bg: '#1f2937', text: '#ffffff', border: '#111827' };
      default: return { bg: '#f3f4f6', text: '#1f2937', border: '#e5e7eb' };
    }
  };

  if (!autorizado) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#955F71" />
        <Text style={{marginTop: 10}}>Verificando seguridad...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Panel de Control</Text>
        <TouchableOpacity onPress={cerrarSesion} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Gestión de Pedidos Activos</Text>

      <FlatList
        data={pedidos}
        keyExtractor={(item) => item.id.toString()}
        refreshing={loading}
        onRefresh={async () => {
          const id = await AsyncStorage.getItem('userId');
          if (id) cargarPedidos(id);
        }}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay pedidos activos.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = colorEstadoStyle(item.estado_pago);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>#{item.id}</Text>
                <Text style={styles.dateText}>
                  {item.fecha_pedido ? new Date(item.fecha_pedido).toLocaleDateString() : 'Sin fecha'}
                </Text>
              </View>
              
              <Text style={styles.customerName}>
                {item.nombre_entrega} {item.apellidos_entrega}
              </Text>
              
              <View style={styles.cardFooter}>
                <Text style={styles.totalText}>
                  ${Number(item.total_pagar || 0).toLocaleString('es-CO')}
                </Text>
                <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>
                    {(item.estado_pago || 'Pendiente').toUpperCase()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.detailsBtn} onPress={() => abrirDetalles(item)}>
                <Text style={styles.detailsBtnText}>Ver detalles</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* MODAL DE DETALLES */}
      <Modal visible={modalAbierto} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pedido #{pedidoSeleccionado?.id}</Text>
              <TouchableOpacity onPress={() => setModalAbierto(false)}>
                <Text style={styles.closeBtnText}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.infoGrid}>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Nombre de entrega:</Text>
                  <Text style={styles.infoValue}>{pedidoSeleccionado?.nombre_entrega} {pedidoSeleccionado?.apellidos_entrega}</Text>
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Contacto:</Text>
                  <Text style={styles.infoValue}>{pedidoSeleccionado?.telefono_contacto}</Text>
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Dirección:</Text>
                  <Text style={styles.infoValue}>{pedidoSeleccionado?.direccion}, {pedidoSeleccionado?.ciudad}</Text>
                  <Text style={styles.infoSubText}>{pedidoSeleccionado?.detalles_direccion}</Text>
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.infoLabel}>Método:</Text>
                  <Text style={styles.infoValue}>{pedidoSeleccionado?.metodo_entrega?.toUpperCase()}</Text>
                </View>
              </View>

              <Text style={styles.sectionSubtitle}>Productos solicitados</Text>
              
              {cargandoDetalles ? (
                <ActivityIndicator color="#955F71" style={{ marginVertical: 20 }} />
              ) : (
                <View style={styles.productList}>
                  {detallesPedido.map((item, index) => {
                    // Si 'producto' trae texto (ventas nuevas) lo usa, si está vacío (ventas antiguas) muestra el ID
                    const descripcionProducto = item.producto ? item.producto : `Cód: ${item.producto_id}`;
                    
                    return (
                      <View key={index} style={styles.productRow}>
                        <View style={{ flex: 1, paddingRight: 10 }}>
                          {/* Código de barras en una fila superior pequeña si existe la descripción */}
                          {item.producto && (
                            <Text style={styles.productBarcode}>{item.producto_id}</Text>
                          )}
                          {/* Descripción + (Variante) juntos desde la base de datos */}
                          <Text style={styles.productName}>{descripcionProducto}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                          <Text style={styles.productVar}>
                            {item.cantidad}x ${Number(item.precio_unitario).toLocaleString('es-CO')}
                          </Text>
                          <Text style={styles.productPrice}>
                            ${(item.cantidad * item.precio_unitario).toLocaleString('es-CO')}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total a pagar</Text>
                <Text style={styles.totalValue}>${Number(pedidoSeleccionado?.total_pagar || 0).toLocaleString('es-CO')}</Text>
              </View>

              <Text style={styles.sectionSubtitle}>Actualizar Estado</Text>
              
              <View style={styles.actionGrid}>
                <TouchableOpacity style={[styles.btnAction, { backgroundColor: '#f3f4f6' }]} onPress={() => cambiarEstado('Pendiente')}>
                  <Text style={styles.btnActionText}>Pendiente</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnAction, { backgroundColor: '#d1fae5', borderColor: '#a7f3d0', borderWidth: 1 }]} onPress={() => cambiarEstado('Pagado')}>
                  <Text style={[styles.btnActionText, { color: '#065f46' }]}>Pagado</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnAction, { backgroundColor: '#dbeafe', borderColor: '#bfdbfe', borderWidth: 1 }]} onPress={() => cambiarEstado('Procesado')}>
                  <Text style={[styles.btnActionText, { color: '#1e40af' }]}>Procesado</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnAction, { backgroundColor: '#f3e8ff', borderColor: '#e9d5ff', borderWidth: 1 }]} onPress={() => cambiarEstado('Enviado')}>
                  <Text style={[styles.btnActionText, { color: '#6b21a8' }]}>Enviado</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.btnFinalizar} onPress={() => cambiarEstado('Entregado')}>
                <Text style={styles.btnFinalizarText}>Finalizar (Entregado)</Text>
              </TouchableOpacity>
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingTop: 10 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fee2e2', borderRadius: 6 },
  logoutText: { color: '#b91c1c', fontWeight: 'bold', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 15, color: '#374151' },
  
  emptyState: { padding: 30, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 16 },

  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#f3f4f6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  dateText: { fontSize: 12, color: '#6b7280' },
  customerName: { fontSize: 15, fontWeight: '500', color: '#374151', marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  totalText: { fontSize: 16, fontWeight: 'bold', color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1 },
  badgeText: { fontSize: 10, fontWeight: 'bold' },
  detailsBtn: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: '#955F71' },
  detailsBtnText: { color: '#955F71', fontSize: 12, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  closeBtnText: { fontSize: 16, color: '#6b7280', fontWeight: '500' },
  modalBody: { padding: 20 },
  
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  infoBox: { width: '50%', marginBottom: 15, paddingRight: 10 },
  infoLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  infoSubText: { fontSize: 11, color: '#6b7280', marginTop: 2 },

  sectionSubtitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, borderBottomWidth: 1, borderColor: '#e5e7eb', paddingBottom: 5 },
  productList: { marginBottom: 20 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6', backgroundColor: '#f9fafb', paddingHorizontal: 10, borderRadius: 6, marginBottom: 8 },
  
  // Estilo nuevo para el código de barras
  productBarcode: { fontSize: 11, color: '#6b7280', fontWeight: '700', marginBottom: 2 },
  productName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  productVar: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  productPrice: { fontSize: 14, fontWeight: 'bold', color: '#111827', marginTop: 2 },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: '#FAF4F4', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(215,161,164,0.3)', marginBottom: 20 },
  totalLabel: { fontSize: 16, fontWeight: '500', color: '#374151' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#955F71' },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
  btnAction: { width: '48%', paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginBottom: 10 },
  btnActionText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  
  btnFinalizar: { backgroundColor: '#111827', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  btnFinalizarText: { color: '#fff', fontSize: 15, fontWeight: 'bold' }
});