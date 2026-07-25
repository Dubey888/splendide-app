import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Modal, ScrollView, Platform, Image 
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
      case 'pendiente': return { bg: '#FFEA8A', text: '#8A6116' }; 
      case 'pagado': return { bg: '#AEE9D1', text: '#0B572D' };    
      case 'procesado': return { bg: '#E4E5E7', text: '#202223' }; 
      case 'enviado': return { bg: '#B4E1FA', text: '#005F96' };   
      case 'entregado': return { bg: '#202223', text: '#FFFFFF' }; 
      default: return { bg: '#E4E5E7', text: '#202223' };
    }
  };

  if (!autorizado) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={{marginTop: 10, color: '#6D7175'}}>Verificando seguridad...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pedidos</Text>
        <TouchableOpacity onPress={cerrarSesion} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

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
            <TouchableOpacity style={styles.card} onPress={() => abrirDetalles(item)} activeOpacity={0.7}>
              <View style={styles.cardTopRow}>
                <Text style={styles.orderId}>#{item.id}</Text>
                <Text style={styles.dateText}>
                  {item.fecha_pedido ? new Date(item.fecha_pedido).toLocaleDateString() : 'Sin fecha'}
                </Text>
              </View>
              
              <Text style={styles.customerName}>
                {item.nombre_entrega} {item.apellidos_entrega}
              </Text>
              
              <View style={styles.cardBottomRow}>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>
                    {(item.estado_pago || 'Pendiente').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.totalText}>
                  ${Number(item.total_pagar || 0).toLocaleString('es-CO')}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={modalAbierto} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.modalTitle}>#{pedidoSeleccionado?.id}</Text>
                <View style={[styles.badge, { backgroundColor: colorEstadoStyle(pedidoSeleccionado?.estado_pago).bg, marginLeft: 10 }]}>
                  <Text style={[styles.badgeText, { color: colorEstadoStyle(pedidoSeleccionado?.estado_pago).text }]}>
                    {(pedidoSeleccionado?.estado_pago || 'Pendiente').toUpperCase()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setModalAbierto(false)} style={styles.closeButton}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Cliente</Text>
                <Text style={styles.customerDetailName}>{pedidoSeleccionado?.nombre_entrega} {pedidoSeleccionado?.apellidos_entrega}</Text>
                <Text style={styles.contactText}>{pedidoSeleccionado?.telefono_contacto}</Text>
                
                <View style={styles.divider} />
                
                <Text style={styles.sectionTitle}>Dirección de envío</Text>
                <Text style={styles.addressText}>{pedidoSeleccionado?.direccion}</Text>
                <Text style={styles.addressText}>{pedidoSeleccionado?.detalles_direccion}</Text>
                <Text style={styles.addressText}>{pedidoSeleccionado?.ciudad}</Text>
                
                <View style={styles.divider} />

                <Text style={styles.sectionTitle}>Método</Text>
                <Text style={styles.addressText}>{pedidoSeleccionado?.metodo_entrega?.toUpperCase()}</Text>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Artículos ({detallesPedido.length})</Text>
                
                {cargandoDetalles ? (
                  <ActivityIndicator color="#202223" style={{ marginVertical: 20 }} />
                ) : (
                  <View style={styles.productList}>
                    {detallesPedido.map((item, index) => {
                      
                      // CORRECCIÓN 1: Leer "nombre_producto" en lugar de "producto"
                      const descripcionProducto = item.nombre_producto ? item.nombre_producto : `Producto ID: ${item.producto_id}`;
                      
                     // CORRECCIÓN 2: Forzar 'https' y codificar espacios (ej. "productos shopify" -> "productos%20shopify")
let imagenUrl = item.url_imagen ? String(item.url_imagen).trim() : 'https://via.placeholder.com/150?text=Sin+Imagen';

if (imagenUrl.startsWith('http://')) {
    imagenUrl = imagenUrl.replace('http://', 'https://');
}

// NUEVO: encodeURI convierte los espacios problemáticos en %20 para que Cloudinary no arroje error 400
imagenUrl = encodeURI(imagenUrl);
                      
                      return (
                        <View key={index} style={styles.productRow}>
                          <View style={styles.productImageContainer}>
                            <Image 
                              source={{ uri: imagenUrl }} 
                              style={styles.productImage}
                              resizeMode="cover"
                            />
                            <View style={styles.productQtyBadge}>
                              <Text style={styles.productQtyText}>{item.cantidad}</Text>
                            </View>
                          </View>
                          
                          <View style={styles.productInfo}>
                            <Text style={styles.productName}>{descripcionProducto}</Text>
                            
                            {/* Mostrar SKU si existe */}
                            {item.producto_id && (
                              <Text style={styles.productSku}>SKU: {item.producto_id}</Text>
                            )}
                            
                            {/* Novedad: Mostrar variante si no es nula o "Único" */}
                            {item.variante && item.variante !== '[NULL]' && item.variante !== 'Único' && (
                              <Text style={styles.productSku}>Var: {item.variante}</Text>
                            )}
                            
                            <Text style={styles.productPriceUnit}>
                              ${Number(item.precio_unitario).toLocaleString('es-CO')} c/u
                            </Text>
                          </View>
                          
                          <View style={styles.productTotalInfo}>
                            <Text style={styles.productPrice}>
                              ${(item.cantidad * item.precio_unitario).toLocaleString('es-CO')}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Pago</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal</Text>
                  <Text style={styles.summaryValue}>${Number(pedidoSeleccionado?.total_pagar || 0).toLocaleString('es-CO')}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Envío</Text>
                  <Text style={styles.summaryValue}>Calculado al enviar</Text>
                </View>
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>${Number(pedidoSeleccionado?.total_pagar || 0).toLocaleString('es-CO')}</Text>
                </View>
              </View>

              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Actualizar Estado</Text>
                <View style={styles.actionGrid}>
                  <TouchableOpacity style={styles.btnOutline} onPress={() => cambiarEstado('Pendiente')}>
                    <Text style={styles.btnOutlineText}>Pendiente</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnOutline} onPress={() => cambiarEstado('Pagado')}>
                    <Text style={styles.btnOutlineText}>Pagado</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnOutline} onPress={() => cambiarEstado('Procesado')}>
                    <Text style={styles.btnOutlineText}>Procesado</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnOutline} onPress={() => cambiarEstado('Enviado')}>
                    <Text style={styles.btnOutlineText}>Enviado</Text>
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity style={styles.btnPrimary} onPress={() => cambiarEstado('Entregado')}>
                  <Text style={styles.btnPrimaryText}>Marcar como Entregado</Text>
                </TouchableOpacity>
              </View>
              
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F2F4' }, 
  container: { flex: 1, backgroundColor: '#F1F2F4', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#202223' },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  logoutText: { color: '#D82C0D', fontWeight: '600', fontSize: 15 },
  
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6D7175', fontSize: 16 },

  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 8, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1, borderWidth: 1, borderColor: '#E1E3E5' },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  orderId: { fontSize: 16, fontWeight: '700', color: '#202223' },
  dateText: { fontSize: 13, color: '#6D7175' },
  customerName: { fontSize: 15, fontWeight: '400', color: '#202223', marginBottom: 16 },
  cardBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalText: { fontSize: 16, fontWeight: '600', color: '#202223' },
  
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(18, 18, 18, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#F1F2F4', borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#FFFFFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, borderBottomWidth: 1, borderColor: '#E1E3E5' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#202223' },
  closeButton: { padding: 5, backgroundColor: '#F1F2F4', borderRadius: 20, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 16, color: '#6D7175', fontWeight: 'bold' },
  modalBody: { padding: 16 },
  
  sectionCard: { backgroundColor: '#FFFFFF', borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E1E3E5', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#202223', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#E1E3E5', marginVertical: 16 },

  customerDetailName: { fontSize: 15, color: '#005BD3', fontWeight: '500', marginBottom: 4 }, 
  contactText: { fontSize: 14, color: '#6D7175' },
  addressText: { fontSize: 14, color: '#202223', lineHeight: 20 },

  productList: { marginTop: 5 },
  productRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#F1F2F4' },
  productImageContainer: { position: 'relative', marginRight: 12 },
  productImage: { width: 50, height: 50, borderRadius: 6, borderWidth: 1, borderColor: '#E1E3E5', backgroundColor: '#F9FAFB' },
  productQtyBadge: { position: 'absolute', top: -6, right: -6, backgroundColor: 'rgba(113, 113, 113, 0.9)', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  productQtyText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  productInfo: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 14, fontWeight: '600', color: '#202223', marginBottom: 2 },
  productSku: { fontSize: 12, color: '#6D7175', marginBottom: 2 },
  productPriceUnit: { fontSize: 12, color: '#6D7175' },
  productTotalInfo: { justifyContent: 'center', alignItems: 'flex-end', paddingLeft: 10 },
  productPrice: { fontSize: 14, fontWeight: '600', color: '#202223' },
  
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: '#6D7175' },
  summaryValue: { fontSize: 14, color: '#202223' },
  totalRow: { marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderColor: '#E1E3E5', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#202223' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#202223' },

  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15 },
  btnOutline: { width: '48%', paddingVertical: 10, borderRadius: 6, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#C9CCCF', backgroundColor: '#FFFFFF' },
  btnOutlineText: { fontSize: 13, fontWeight: '600', color: '#202223' },
  
  btnPrimary: { backgroundColor: '#008060', paddingVertical: 14, borderRadius: 6, alignItems: 'center', marginTop: 5 }, 
  btnPrimaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' }
});