import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, StyleSheet, Image, ActivityIndicator, 
  TouchableOpacity, TextInput, Alert, ScrollView, Platform, KeyboardAvoidingView
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons'; 
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://app-23c8f020-a783-451d-b1cf-b48a15a79604.cleverapps.io/index.php';

export default function InventarioScreen({ navigation }: any) {
  const [inventario, setInventario] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  
  // Por defecto iniciamos en una sede específica para poder editar de inmediato
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState('santuario'); 
  
  const sedesDisponibles = ['santuario', 'sanfelipe', 'ambas'];
  const tabsFiltro = ['All', 'Incoming', 'Not Fulfillable'];

  useEffect(() => {
    loadInventario();
  }, [tiendaSeleccionada]);

  const loadInventario = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}?accion=obtener_catalogo_web&tienda=${tiendaSeleccionada}`);
      if (res.data.status === 'success') {
        // A diferencia de ProductosScreen, aquí NO agrupamos por Handle.
        // Necesitamos ver cada variante individualmente con su propio código (SKU) y stock.
        setInventario(res.data.data);
      }
    } catch (e) { 
      Alert.alert("Error", "No se pudo cargar el inventario."); 
    } finally { 
      setLoading(false); 
    }
  };

  const guardarAjusteInventario = async (item: any, nuevoStockString: string) => {
    const nuevoStockFisico = parseFloat(nuevoStockString);
    const stockActual = parseFloat(item.Stock) || 0;

    // Si no hay cambios reales o el input está vacío, no hacemos nada
    if (isNaN(nuevoStockFisico) || nuevoStockFisico === stockActual) return;

    // Validación crucial: No se puede ajustar stock si estamos viendo "ambas" tiendas
    if (tiendaSeleccionada === 'ambas') {
      Alert.alert(
        "Selecciona una Sede", 
        "Para ajustar el inventario debes seleccionar una tienda específica (Santuario o Sanfelipe) en la parte superior."
      );
      // Recargamos para revertir el número visualmente
      loadInventario(); 
      return;
    }

    try {
      const cajero = await AsyncStorage.getItem('userId') || 'Admin_App';

      const payload = {
        accion: 'AJUSTAR_STOCK',
        codigo: item.Codigo,
        producto: item.Producto,
        stock_actual: stockActual,
        stock_fisico: nuevoStockFisico,
        diferencia: nuevoStockFisico - stockActual,
        motivo: 'Ajuste manual desde App',
        tienda: tiendaSeleccionada,
        cajero: cajero,
        prefijo: 'APP'
      };

      const res = await axios.post(API_BASE_URL, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.data.status === 'exito_ajuste') {
        // Actualizamos el estado local para reflejar el cambio sin recargar todo
        const nuevoInventario = inventario.map(prod => {
          if (prod.Codigo === item.Codigo && prod.Tienda === item.Tienda) {
            return { ...prod, Stock: nuevoStockFisico };
          }
          return prod;
        });
        setInventario(nuevoInventario);
      } else {
        Alert.alert("Error", res.data.error || "No se pudo actualizar el stock.");
        loadInventario(); // Revertir visualmente en caso de error
      }
    } catch (error) {
      Alert.alert("Error", "Fallo de red al comunicar con el servidor.");
      loadInventario(); // Revertir visualmente
    }
  };

  const getPrimeraImagen = (urlString: string) => {
    if (!urlString) return 'https://via.placeholder.com/80';
    const imgs = urlString.split(',').map(i => i.trim()).filter(i => i !== '');
    return imgs.length > 0 ? imgs[0] : 'https://via.placeholder.com/80';
  };

  const inventarioFiltrado = inventario.filter((item) => {
    const query = searchQuery.toLowerCase();
    const textoCoincide = 
      item.Producto?.toLowerCase().includes(query) ||
      item.Codigo?.toString().toLowerCase().includes(query) ||
      item.Variante_Color?.toLowerCase().includes(query);
    
    return textoCoincide;
  });

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      
      {/* HEADER TIPO SHOPIFY (Fondo Oscuro) */}
      <View style={styles.darkHeader}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', alignItems: 'center' }} 
            onPress={() => navigation.navigate('ProductosMenu')}
          >
            <Text style={styles.tituloHeader}>Inventario</Text>
            <Ionicons name="chevron-down" size={20} color="#fff" style={{ marginLeft: 5, marginTop: 2 }} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity style={{ marginRight: 15 }}>
              <Ionicons name="barcode-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SELECTOR DE TIENDAS */}
        <View style={styles.selectorTiendaContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sedesDisponibles.map(tienda => (
              <TouchableOpacity 
                key={tienda} 
                style={[styles.btnTiendaSede, tiendaSeleccionada === tienda && styles.btnTiendaSedeActivo]}
                onPress={() => setTiendaSeleccionada(tienda)}
              >
                <Text style={[styles.btnTiendaSedeTexto, tiendaSeleccionada === tienda && styles.btnTiendaSedeTextoActivo]}>
                  {tienda.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* CONTENEDOR BLANCO PRINCIPAL (Con bordes redondeados arriba) */}
      <View style={styles.whiteContainer}>
        
        {/* BARRA DE BÚSQUEDA Y FILTROS */}
        <View style={styles.headerControl}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#6d7175" style={{ marginRight: 8 }} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Buscar"
              placeholderTextColor="#8c9196"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity style={styles.filterIconBox}>
              <Ionicons name="options-outline" size={20} color="#202223" />
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10, marginBottom: 5 }}>
            {tabsFiltro.map(tab => (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* LISTA DE INVENTARIO */}
        {loading ? (
          <ActivityIndicator style={{ flex: 1, marginTop: 40 }} size="large" color="#000" />
        ) : (
          <FlatList
            data={inventarioFiltrado}
            keyExtractor={(item: any, idx) => (item.Codigo ? item.Codigo.toString() + item.Tienda + idx : idx.toString())}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<Text style={styles.emptyText}>No hay productos en esta sede.</Text>}
            renderItem={({ item }) => {
              const urlImagen = item.Url_Imagen || item.URL_Imagen || item.url_imagen || '';
              
              return (
                <View style={styles.cardInventario}>
                  
                  {/* SECCIÓN IZQUIERDA (Info y Foto) */}
                  <View style={styles.infoIzquierda}>
                    <Image source={{ uri: getPrimeraImagen(urlImagen) }} style={styles.imagenMin} />
                    <View style={styles.textosInventario}>
                      <Text style={styles.nombreProducto} numberOfLines={2}>{item.Producto}</Text>
                      <Text style={styles.varianteTexto}>
                        {item.Variante_Color && item.Variante_Color !== '' ? item.Variante_Color : 'Único'}
                      </Text>
                      <Text style={styles.skuTexto}>SKU: {item.Codigo}</Text>
                    </View>
                  </View>

                  {/* SECCIÓN DERECHA (Input Ovalado) */}
                  <View style={styles.inputContenedor}>
                    <TextInput
                      style={styles.inputStock}
                      keyboardType="numeric"
                      defaultValue={item.Stock?.toString() || '0'}
                      onEndEditing={(e) => guardarAjusteInventario(item, e.nativeEvent.text)}
                      selectTextOnFocus={true} // Selecciona todo el número al tocar para escribir rápido
                    />
                  </View>

                </View>
              );
            }}
          />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' // Fondo oscuro detrás de la cabecera
  },
  darkHeader: { 
    paddingTop: Platform.OS === 'ios' ? 50 : 20, 
    paddingBottom: 20, 
    backgroundColor: '#000' 
  },
  headerTopRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    marginBottom: 15 
  },
  tituloHeader: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#fff' 
  },
  selectorTiendaContainer: { 
    paddingHorizontal: 16 
  },
  btnTiendaSede: { 
    paddingVertical: 6, 
    paddingHorizontal: 14, 
    borderRadius: 16, 
    backgroundColor: '#333', 
    marginRight: 8, 
    borderWidth: 1, 
    borderColor: '#444' 
  },
  btnTiendaSedeActivo: { 
    backgroundColor: '#fff', 
    borderColor: '#fff' 
  },
  btnTiendaSedeTexto: { 
    color: '#aaa', 
    fontWeight: '600', 
    fontSize: 12 
  },
  btnTiendaSedeTextoActivo: { 
    color: '#000' 
  },
  whiteContainer: { 
    flex: 1, 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 20, 
    borderTopRightRadius: 20, 
    overflow: 'hidden' 
  },
  headerControl: { 
    paddingHorizontal: 16, 
    paddingTop: 16, 
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f6f8'
  },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f4f6f8', 
    borderRadius: 10, 
    paddingHorizontal: 12, 
    height: 44 
  },
  searchInput: { 
    flex: 1, 
    fontSize: 15, 
    color: '#202223' 
  },
  filterIconBox: { 
    padding: 6, 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    shadowColor: '#000', 
    shadowOffset: {width: 0, height: 1}, 
    shadowOpacity: 0.1, 
    shadowRadius: 2,
    elevation: 2
  },
  tabBtn: { 
    paddingVertical: 6, 
    paddingHorizontal: 14, 
    borderRadius: 16, 
    backgroundColor: 'transparent', 
    marginRight: 8 
  },
  tabBtnActive: { 
    backgroundColor: '#f4f6f8' 
  },
  tabText: { 
    color: '#6d7175', 
    fontWeight: '600', 
    fontSize: 14 
  },
  tabTextActive: { 
    color: '#202223' 
  },
  emptyText: { 
    textAlign: 'center', 
    marginTop: 40, 
    color: '#6d7175', 
    fontSize: 15 
  },
  
  // ESTILOS DE LA TARJETA DE INVENTARIO
  cardInventario: { 
    flexDirection: 'row', 
    paddingVertical: 14,
    paddingHorizontal: 16, 
    borderBottomWidth: 1, 
    borderColor: '#f4f6f8', 
    backgroundColor: '#fff', 
    alignItems: 'center', 
    justifyContent: 'space-between' 
  },
  infoIzquierda: { 
    flexDirection: 'row', 
    flex: 1, 
    alignItems: 'center' 
  },
  imagenMin: { 
    width: 45, 
    height: 45, 
    borderRadius: 6, 
    marginRight: 12, 
    borderWidth: 1, 
    borderColor: '#e4e5e7',
    backgroundColor: '#fafafa',
    resizeMode: 'cover'
  },
  textosInventario: { 
    flex: 1, 
    justifyContent: 'center',
    paddingRight: 10 
  },
  nombreProducto: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#202223',
    marginBottom: 2
  },
  varianteTexto: { 
    fontSize: 13, 
    color: '#6d7175', 
    marginBottom: 2 
  },
  skuTexto: { 
    fontSize: 11, 
    color: '#8c9196' 
  },
  inputContenedor: { 
    justifyContent: 'center', 
    alignItems: 'flex-end' 
  },
  inputStock: { 
    borderWidth: 1, 
    borderColor: '#d2d5d8', 
    borderRadius: 20, // Diseño ovalado
    paddingVertical: 6, 
    paddingHorizontal: 16, 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: '#202223', 
    textAlign: 'center', 
    minWidth: 65,
    backgroundColor: '#fff'
  }
});