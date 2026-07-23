import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, StyleSheet, Image, ActivityIndicator, 
  TouchableOpacity, Modal, TextInput, Alert, ScrollView, Platform 
} from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons'; 
import { CameraView, useCameraPermissions } from 'expo-camera';

const API_BASE_URL = 'https://app-23c8f020-a783-451d-b1cf-b48a15a79604.cleverapps.io/index.php';

export default function ProductosScreen({ navigation }: any) {
  const [productos, setProductos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  
  const [galeria, setGaleria] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false); 

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Todos');

  const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}?accion=obtener_catalogo_web`);
      if (res.data.status === 'success') {
        const generarHandle = (nombre: string) => {
          return nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        };

        const agrupados = res.data.data.reduce((acc: any, current: any) => {
          let rawHandle = current.Handle || current.handle || '';
          rawHandle = rawHandle.toString().trim();
          const tienda = current.Tienda || current.Sede || current.nombre_tienda || '';

          if (rawHandle === '' && tienda === 'El Santuario') {
            rawHandle = generarHandle(current.Producto);
          }

          let key = rawHandle !== '' ? rawHandle.toLowerCase() : current.Codigo.toString().trim();
          
          if (!acc[key]) {
            const urlImagenString = current.Url_Imagen || current.URL_Imagen || current.url_imagen || '';
            acc[key] = { 
              ...current, 
              HandleAgrupado: key, 
              stockTotal: 0, 
              cantidadVariantes: 0,
              StringImagenes: urlImagenString 
            };
          }
          acc[key].stockTotal += parseInt(current.Stock) || 0;
          acc[key].cantidadVariantes += 1;
          return acc;
        }, {});
        
        setProductos(Object.values(agrupados));
      }
    } catch (e) { 
      Alert.alert("Error", "No se pudo cargar el catálogo."); 
    } finally { 
      setLoading(false); 
    }
  };

  const productosFiltrados = productos.filter((item) => {
    const textoCoincide = 
      item.Producto.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.Codigo.toString().toLowerCase().includes(searchQuery.toLowerCase());
    
    let tabCoincide = true;
    if (activeTab === 'Con Stock') {
      tabCoincide = item.stockTotal > 0;
    } else if (activeTab === 'Agotados') {
      tabCoincide = item.stockTotal <= 0;
    }

    return textoCoincide && tabCoincide;
  });

  const abrirScanner = async () => {
    if (!permisoCamara?.granted) {
      const result = await pedirPermisoCamara();
      if (!result.granted) {
        Alert.alert("Permiso denegado", "Necesitas dar acceso a la cámara para poder escanear los productos.");
        return;
      }
    }
    setScannerVisible(true);
  };

  const openEditModal = async (item: any) => {
    const nombreTienda = item.Tienda || item.Sede || item.nombre_tienda;
    try {
      const valorBusqueda = item.HandleAgrupado || item.Handle;
      let url = `${API_BASE_URL}?accion=obtener_producto_rapido&tipo=handle&valor=${valorBusqueda}&tienda=${nombreTienda}`;
      
      if (!valorBusqueda || valorBusqueda === item.Codigo.toString().trim()) {
         url = `${API_BASE_URL}?accion=obtener_producto_rapido&tipo=codigo&valor=${item.Codigo}&tienda=${nombreTienda}`;
      }

      const res = await axios.get(url);
      
      if (res.data.existe) {
        setEditData(res.data);
        const urlString = res.data.Url_Imagen || res.data.URL_Imagen || res.data.url_imagen || '';
        const imagenesGuardadas = urlString 
          ? urlString.split(',').map((img: string) => img.trim()).filter((img: string) => img !== '')
          : [];
        const imagenesUnicas = [...new Set(imagenesGuardadas)] as string[];
        
        setGaleria(imagenesUnicas);
        setModalVisible(true);
      } else {
        Alert.alert("Aviso", "No se encontraron detalles completos para este producto.");
      }
    } catch (e) { 
      Alert.alert("Error", "No se pudieron obtener los detalles."); 
    }
  };

  const seleccionarImagen = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7, 
    });

    if (!result.canceled) {
      subirACloudinary(result.assets[0]);
    }
  };

  const subirACloudinary = async (foto: any) => {
    setUploadingImage(true);
    const data = new FormData();
    
    if (Platform.OS === 'web') {
      const res = await fetch(foto.uri);
      const blob = await res.blob();
      data.append('file', blob, 'producto.jpg');
    } else {
      data.append('file', {
        uri: foto.uri,
        type: 'image/jpeg',
        name: 'producto.jpg',
      } as any);
    }
    
    data.append('upload_preset', 'njjetabd'); 
    data.append('cloud_name', 'sngqwvpv');

    try {
      const res = await fetch('https://api.cloudinary.com/v1_1/sngqwvpv/image/upload', {
        method: 'POST',
        body: data,
      });
      const result = await res.json();
      
      if (result.secure_url) {
        setGaleria([...galeria, result.secure_url]);
      } else {
        Alert.alert("Error", "Cloudinary no devolvió la URL de la imagen.");
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo subir la foto a Cloudinary");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVariantChange = (index: number, field: string, value: string) => {
    const newVariants = [...editData.lista_variantes];
    newVariants[index] = { ...newVariants[index], [field]: value };
    setEditData({ ...editData, lista_variantes: newVariants });
  };

  const handleSaveCompleto = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      const payload = {
        producto: {
          nombre: editData.Producto,
          marca: editData.Proveedor || '',
          categoria: editData.Categoria || '',
          descripcion: editData.Descripcion || '',
          handle: editData.Handle,
          tienda: editData.Tienda,
          variante_nombre: editData.Variante_Nombre || 'Tono',
          id_shopify_producto: editData.ID_Shopify_Producto,
          url_imagen: galeria.join(',') 
        },
        variantes: editData.lista_variantes.map((v: any) => ({
          codigo: v.Codigo,
          variante_color: v.Variante_Color,
          precio_venta: parseFloat(v.Precio_Venta) || 0,
          precio_mayor: parseFloat(v.Precio_Mayor) || 0,
          precio_compra: parseFloat(v.Precio_Compra) || 0,
          stock: parseInt(v.Stock) || 0,
          referencia: v.Referencia || '',
          id_shopify_variante: v.ID_Shopify_Variante,
          id_inventory_item: v.ID_Inventory_Item
        }))
      };
      
      const res = await axios.post(`${API_BASE_URL}?accion=sincronizar_producto_completo`, payload);
      
      if (res.data.exito) {
        Alert.alert("Éxito", "Producto y variantes guardados correctamente");
        setModalVisible(false);
        loadProductos();
      } else {
        Alert.alert("Error del Servidor", res.data.detalle_servidor || res.data.error || "Fallo desconocido al sincronizar.");
      }
    } catch (e: any) { 
      Alert.alert("Error", `Fallo de red o servidor: ${e.message}`); 
    } finally {
      setSaving(false);
    }
  };

  const getPrimeraImagen = (urlString: string) => {
    if (!urlString) return 'https://via.placeholder.com/80';
    const imgs = urlString.split(',').map(i => i.trim()).filter(i => i !== '');
    return imgs.length > 0 ? imgs[0] : 'https://via.placeholder.com/80';
  };

  if (loading) return <ActivityIndicator style={{flex:1, justifyContent: 'center'}} size="large" color="#008060" />;

  return (
    <View style={styles.container}>
      
      {/* HEADER NUEVO SOLICITADO */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.tituloHeaderPrincipal}>Inventario</Text>
      </View>

      <View style={styles.headerControl}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar productos o escanear..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{marginRight: 10}}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={abrirScanner}>
            <Ionicons name="barcode-outline" size={24} color="#008060" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsContainer}>
          {['Todos', 'Con Stock', 'Agotados'].map(tab => (
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

      <FlatList
        data={productosFiltrados}
        keyExtractor={(item: any) => item.Codigo + item.Variante_Color}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron productos.</Text>}
        renderItem={({ item }) => {
          const tieneStock = item.stockTotal > 0;
          return (
            <TouchableOpacity style={styles.card} onPress={() => openEditModal(item)}>
              <Image 
                source={{ uri: getPrimeraImagen(item.StringImagenes) }} 
                style={styles.imagen} 
              />
              <View style={styles.info}>
                <Text style={styles.nombre} numberOfLines={2}>{item.Producto}</Text>
                
                <View style={styles.priceRow}>
                  <Text style={styles.precio}>${item.Precio_Venta}</Text>
                  <View style={styles.stockBadge}>
                    <View style={[styles.stockDot, { backgroundColor: tieneStock ? '#008060' : '#d32f2f' }]} />
                    <Text style={styles.stockText}>{item.stockTotal} disponibles</Text>
                  </View>
                </View>
                
                <Text style={styles.variantesText}>{item.cantidadVariantes} variante(s)</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      <Modal visible={scannerVisible} animationType="slide">
        <View style={styles.scannerContainer}>
          <Text style={styles.scannerText}>Apunta al código de barras del producto</Text>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={({ data }) => {
              setSearchQuery(data);
              setScannerVisible(false);
            }}
          />
          <TouchableOpacity style={styles.btnCancelarScanner} onPress={() => setScannerVisible(false)}>
             <Text style={styles.btnText}>Cancelar Escáner</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalHeader}>
           <Text style={styles.tituloHeader}>Editar Producto</Text>
           {saving && <ActivityIndicator color="#008060" />}
        </View>

        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
          {editData && (
            <>
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>Multimedia ({galeria.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.multimediaScroll}>
                  {galeria.map((img, index) => (
                    <Image key={index} source={{ uri: img }} style={styles.imgThumbnail} />
                  ))}
                  <TouchableOpacity style={styles.addBtnContainer} onPress={seleccionarImagen} disabled={uploadingImage}>
                    {uploadingImage ? <ActivityIndicator color="#008060" /> : <Text style={styles.addBtnText}>+</Text>}
                  </TouchableOpacity>
                </ScrollView>
              </View>

              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>Datos Generales</Text>
                <Text style={styles.label}>Nombre del Producto</Text>
                <TextInput style={styles.input} value={editData.Producto} onChangeText={(v) => setEditData({...editData, Producto: v})} />
                <Text style={styles.label}>Marca (Proveedor)</Text>
                <TextInput style={styles.input} value={editData.Proveedor} onChangeText={(v) => setEditData({...editData, Proveedor: v})} />
                <Text style={styles.label}>Categoría</Text>
                <TextInput style={styles.input} value={editData.Categoria} onChangeText={(v) => setEditData({...editData, Categoria: v})} />
              </View>

              <Text style={[styles.sectionTitle, {marginLeft: 10, marginTop: 10}]}>
                Variantes ({editData.lista_variantes?.length || 0})
              </Text>
              
              {editData.lista_variantes?.map((variante: any, index: number) => (
                <View key={index} style={styles.varianteBox}>
                  <Text style={styles.varianteTitle}>{variante.Variante_Color || 'Único'} (SKU: {variante.Codigo})</Text>
                  
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Text style={styles.label}>Color/Tono</Text>
                      <TextInput style={styles.input} value={variante.Variante_Color} onChangeText={(v) => handleVariantChange(index, 'Variante_Color', v)} />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.label}>Stock</Text>
                      <TextInput style={styles.input} value={variante.Stock?.toString()} keyboardType="numeric" onChangeText={(v) => handleVariantChange(index, 'Stock', v)} />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Text style={styles.label}>Precio Venta ($)</Text>
                      <TextInput style={styles.input} value={variante.Precio_Venta?.toString()} keyboardType="numeric" onChangeText={(v) => handleVariantChange(index, 'Precio_Venta', v)} />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.label}>Precio Mayor ($)</Text>
                      <TextInput style={styles.input} value={variante.Precio_Mayor?.toString()} keyboardType="numeric" onChangeText={(v) => handleVariantChange(index, 'Precio_Mayor', v)} />
                    </View>
                  </View>
                  
                  <Text style={styles.label}>Referencia (Opcional)</Text>
                  <TextInput style={styles.input} value={variante.Referencia} onChangeText={(v) => handleVariantChange(index, 'Referencia', v)} />
                </View>
              ))}
            </>
          )}
          <View style={{height: 40}} /> 
        </ScrollView>

        <View style={styles.footerButtons}>
          <TouchableOpacity style={[styles.btn, styles.btnGuardar]} onPress={handleSaveCompleto} disabled={saving}>
            <Text style={styles.btnText}>{saving ? "GUARDANDO..." : "GUARDAR CAMBIOS"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnCancelar]} onPress={() => setModalVisible(false)} disabled={saving}>
            <Text style={styles.btnText}>CANCELAR</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  // NUEVO ESTILO DE HEADER
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 15,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  tituloHeaderPrincipal: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  headerControl: { marginBottom: 15, paddingHorizontal: 10, paddingTop: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ebebeb', borderRadius: 10, paddingHorizontal: 12, height: 45, marginBottom: 12 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#333', height: '100%' },
  tabsContainer: { flexDirection: 'row' },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#ebebeb', marginRight: 10 },
  tabBtnActive: { backgroundColor: '#333' },
  tabText: { color: '#666', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#666', fontSize: 16 },

  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 10, marginHorizontal: 10, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  imagen: { width: 70, height: 70, borderRadius: 8, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#eee', resizeMode: 'cover' },
  info: { marginLeft: 15, justifyContent: 'center', flex: 1 },
  nombre: { fontSize: 15, fontWeight: 'bold', color: '#202223', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  precio: { color: '#333', fontWeight: 'bold', fontSize: 15 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f6f8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  stockDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  stockText: { fontSize: 12, color: '#666', fontWeight: '500' },
  variantesText: { color: '#8c9196', fontSize: 12 },
  
  scannerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  camera: { width: '100%', height: '80%' },
  scannerText: { color: '#fff', fontSize: 18, marginBottom: 20, fontWeight: 'bold', textAlign: 'center' },
  btnCancelarScanner: { backgroundColor: '#d32f2f', padding: 15, borderRadius: 8, marginTop: 20, width: '80%', alignItems: 'center' },

  modalHeader: { padding: 20, paddingTop: Platform.OS === 'ios' ? 50 : 20, backgroundColor: '#fff', elevation: 3, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tituloHeader: { fontSize: 20, fontWeight: 'bold' },
  modalScroll: { flex: 1, backgroundColor: '#f4f6f8', padding: 10 },
  multimediaScroll: { flexDirection: 'row', paddingVertical: 10 },
  imgThumbnail: { width: 100, height: 100, borderRadius: 8, marginRight: 10, backgroundColor: '#e0e0e0', borderWidth: 1, borderColor: '#ccc', resizeMode: 'cover' },
  addBtnContainer: { width: 100, height: 100, borderRadius: 8, borderWidth: 1, borderColor: '#aaa', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  addBtnText: { fontSize: 30, color: '#888', fontWeight: '300' },
  sectionBox: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  varianteBox: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#008060', elevation: 1 },
  varianteTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#008060' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { flex: 0.48 },
  label: { fontSize: 12, color: '#666', marginBottom: 4, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginBottom: 12, borderRadius: 5, backgroundColor: '#fafafa', color: '#000' },
  footerButtons: { padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#ddd' },
  btn: { padding: 15, borderRadius: 5, alignItems: 'center', marginBottom: 10 },
  btnGuardar: { backgroundColor: '#008060' },
  btnCancelar: { backgroundColor: '#d32f2f' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});