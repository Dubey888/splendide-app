import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  SafeAreaView, Platform, StatusBar 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

// Asegúrate de que esta URL apunte correctamente a tu index.php
const API_BASE_URL = 'https://150.136.39.43/index.php';

export default function DashboardScreen({ navigation }: any) {
  const [periodo, setPeriodo] = useState('Últimos 30 días');
  const [guiaCompletada, setGuiaCompletada] = useState(1);
  
  // Estado para almacenar los datos que llegan de la base de datos
  const [metricas, setMetricas] = useState({
    ventas_totales: 0,
    pedidos: 0,
    tasa_conversion: 0,
    sesiones: 0
  });

  useEffect(() => {
    cargarMetricas();
  }, []);

  const cargarMetricas = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}?accion=obtener_metricas_dashboard`);
      
      if (response.data.status === 'success') {
        setMetricas(response.data.data);
      }
    } catch (error) {
      console.error("Error al cargar las métricas:", error);
    }
  };

  // Función para dar formato de moneda a las ventas totales
  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* CABECERA OSCURA */}
      <View style={styles.darkHeader}>
        <View style={styles.storeInfoRow}>
          <View style={styles.storeAvatar}>
            <Text style={styles.storeAvatarText}>SC</Text>
          </View>
          <Text style={styles.storeName}>Splendide CO</Text>
          
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="notifications-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.userAvatarMini}>
              <Text style={styles.userAvatarText}>SC</Text>
            </View>
          </View>
        </View>

        {/* FILTROS DE TIEMPO */}
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.periodButton}>
            <Text style={styles.periodButtonText}>{periodo}</Text>
            <Ionicons name="chevron-down" size={16} color="#202223" style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.realtimeButton}>
            <View style={styles.liveDot} />
            <Text style={styles.realtimeButtonText}>Vista en tiempo real</Text>
          </TouchableOpacity>
        </View>

        {/* TARJETAS DE MÉTRICAS CON DATOS REALES */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.metricsScrollContainer}
        >
          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Ventas totales</Text>
            <Text style={styles.metricValue}>{formatearMoneda(metricas.ventas_totales)}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Pedidos</Text>
            <Text style={styles.metricValue}>{metricas.pedidos}</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Tasa de conversión</Text>
            <Text style={styles.metricValue}>{metricas.tasa_conversion} %</Text>
          </View>

          <View style={styles.metricCard}>
            <Text style={styles.metricTitle}>Sesiones</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.metricValue}>{metricas.sesiones}</Text>
              <Text style={styles.metricSubUp}> ↗ --</Text>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* CONTENEDOR BLANCO INFERIOR */}
      <ScrollView style={styles.whiteContainer} showsVerticalScrollIndicator={false}>
        
        {/* SECCIÓN PREPÁRATE PARA VENDER */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Prepárate para vender</Text>
              <Text style={styles.sectionSubtitle}>Sigue esta guía para poner la tienda en marcha</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="chevron-up" size={20} color="#6d7175" style={{ marginRight: 12 }} />
              <Ionicons name="ellipsis-horizontal" size={20} color="#6d7175" />
            </View>
          </View>

          <View style={styles.badgeProgressContainer}>
            <Text style={styles.badgeProgressText}>{guiaCompletada} / 5 completadas</Text>
          </View>

          {/* LISTA DE TAREAS */}
          <TouchableOpacity 
            style={styles.taskItem} 
            onPress={() => navigation.navigate('Productos', { screen: 'ProductosScreen' })}
          >
            <View style={styles.taskIconDone}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
            <Text style={styles.taskTextDone}>Agrega tu primer producto</Text>
            <Ionicons name="chevron-forward" size={18} color="#c4cdd5" />
          </TouchableOpacity>

          <View style={styles.taskItem}>
            <View style={styles.taskIconPending} />
            <Text style={styles.taskTextPending}>Diseña tu tienda</Text>
            <Ionicons name="chevron-forward" size={18} color="#c4cdd5" />
          </View>

          <View style={styles.taskItem}>
            <View style={styles.taskIconPending} />
            <Text style={styles.taskTextPending}>Configurar un proveedor de pagos</Text>
            <Ionicons name="chevron-forward" size={18} color="#c4cdd5" />
          </View>

          <View style={styles.taskItem}>
            <View style={styles.taskIconPending} />
            <Text style={styles.taskTextPending}>Descarga la aplicación Point of Sale</Text>
            <Ionicons name="chevron-forward" size={18} color="#c4cdd5" />
          </View>

          <View style={[styles.taskItem, { borderBottomWidth: 0 }]}>
            <View style={styles.taskIconPending} />
            <Text style={styles.taskTextPending}>Completa la configuración de Point of Sale</Text>
            <Ionicons name="chevron-forward" size={18} color="#c4cdd5" />
          </View>
        </View>

        {/* BANNER PROMOCIONAL SECUNDARIO */}
        <View style={[styles.cardSection, { marginBottom: 120 }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.sectionTitle, { flex: 1, paddingRight: 10 }]}>
              Aumenta la conversión con una página de inicio personalizada
            </Text>
            <Ionicons name="ellipsis-horizontal" size={20} color="#6d7175" />
          </View>
          
          <Text style={styles.promoDescription}>
            Usa aplicaciones para diseñar una página de inicio que capte la atención, despierte el interés de los visitantes y genere más ventas, a la vez que destaca a tu negocio.
          </Text>

          <TouchableOpacity style={styles.promoButton}>
            <Text style={styles.promoButtonText}>Ver guía de aplicaciones</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  darkHeader: {
    backgroundColor: '#000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    paddingBottom: 15,
  },
  storeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  storeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#008060',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  storeAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  storeName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginRight: 16,
  },
  userAvatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#955F71',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f6f8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#202223',
  },
  realtimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#2ecc71',
    marginRight: 6,
  },
  realtimeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  metricsScrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 5,
  },
  metricCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 14,
    marginRight: 10,
    minWidth: 135,
    borderWidth: 1,
    borderColor: '#333',
  },
  metricTitle: {
    color: '#8c9196',
    fontSize: 12,
    marginBottom: 6,
  },
  metricValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  metricSubUp: {
    color: '#2ecc71',
    fontSize: 12,
    fontWeight: 'bold',
  },
  whiteContainer: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
  },
  cardSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#202223',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6d7175',
  },
  badgeProgressContainer: {
    alignSelf: 'flex-start',
    backgroundColor: '#f4f6f8',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 12,
  },
  badgeProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6d7175',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f6f8',
  },
  taskIconDone: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#202223',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskIconPending: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#c4cdd5',
    marginRight: 12,
  },
  taskTextDone: {
    flex: 1,
    fontSize: 14,
    color: '#6d7175',
    textDecorationLine: 'line-through',
  },
  taskTextPending: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#202223',
  },
  promoDescription: {
    fontSize: 13,
    color: '#6d7175',
    lineHeight: 18,
    marginBottom: 16,
  },
  promoButton: {
    borderWidth: 1,
    borderColor: '#d2d5d8',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  promoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#202223',
  },
});