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
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState('santuario'); // Selector superior de tienda

  const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);

  const sedesDisponibles = ['santuario', 'sanfelipe', 'ambas'];

  useEffect(() => {
    loadProductos();
  }, [tiendaSeleccionada]);

  const loadProductos = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}?accion=obtener_catalogo_web&tienda=${tiendaSeleccionada}`);
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

  const abrirNuevoProducto = () => {
    setEditData({
      Codigo: '',
      Producto: '',
      Descripcion: '',
      Handle: '',
      Variante_Nombre: 'Tono',
      Proveedor: '',
      Categoria: '',
      Tienda: tiendaSeleccionada,
      ID_Shopify_Producto: '',
      Porcentaje_Venta: '30', // Margen por defecto Excel (%)
      Porcentaje_Mayor: '15',  // Margen mayorista por defecto (%)
      lista_variantes: [
        {
          Codigo: '',
          Variante_Color: 'Único',
          Precio_Compra: '',
          Precio_Venta: '',
          Precio_Mayor: '',
          Stock: 1,
          Referencia: '',
          ID_Shopify_Variante: '',
          ID_Inventory_Item: ''
        }
      ]
    });
    setGaleria([]);
    setModalVisible(true);
  };

  const productosFiltrados = productos.filter((item) => {
    const textoCoincide = 
      item.Producto?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.Codigo?.toString().toLowerCase().includes(searchQuery.toLowerCase());
    
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
        Alert.alert("Permiso denegado", "Necesitas dar acceso a la cámara.");
        return;
      }
    }
    setScannerVisible(true);
  };

  const openEditModal = async (item: any) => {
    const nombreTienda = item.Tienda || item.Sede || item.nombre_tienda || tiendaSeleccionada;
    try {
      const valorBusqueda = item.HandleAgrupado || item.Handle;
      let url = `${API_BASE_URL}?accion=obtener_producto_rapido&tipo=handle&valor=${valorBusqueda}&tienda=${nombreTienda}`;
      
      if (!valorBusqueda || valorBusqueda === item.Codigo?.toString().trim()) {
         url = `${API_BASE_URL}?accion=obtener_producto_rapido&tipo=codigo&valor=${item.Codigo}&tienda=${nombreTienda}`;
      }

      const res = await axios.get(url);
      
      if (res.data.existe) {
        setEditData({
          ...res.data,
          Porcentaje_Venta: res.data.Porcentaje_Venta || '30',
          Porcentaje_Mayor: res.data.Porcentaje_Mayor || '15',
        });
        const urlString = res.data.Url_Imagen || res.data.URL_Imagen || res.data.url_imagen || '';
        const imagenesGuardadas = urlString 
          ? urlString.split(',').map((img: string) => img.trim()).filter((img: string) => img !== '')
          : [];
        setGaleria([...new Set(imagenesGuardadas)] as string[]);
        setModalVisible(true);
      } else {
        Alert.alert("Aviso", "No se encontraron detalles completos.");
      }
    } catch (e) { 
      Alert.alert("Error", "No se pudieron obtener los detalles."); 
    }
  };

  const seleccionarImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      Alert.alert('Permiso denegado', 'Se requiere acceso a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true, // <-- AQUI ESTA LA CORRECCIÓN. Solo "base64: true"
    });

    if (!result.canceled) {
      const base64 = result.assets[0].base64;
      if (base64) {
        subirImagenBase64(base64); 
      } else {
        Alert.alert("Error", "No se pudo obtener la información de la imagen.");
      }
    }
  };

  const subirImagenBase64 = async (base64String: string) => {
    setUploadingImage(true);
    try {
      // Ya no necesitamos FileSystem.readAsStringAsync
      const payload = { 
        imagen_base64: `data:image/jpeg;base64,${base64String}`,
        folder: 'productos'
      };

      const res = await axios.post(`${API_BASE_URL}?accion=subir_imagen_cloudinary`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.data.status === 'success' || res.data.secure_url) {
        const urlImagen = res.data.secure_url || res.data.url;
        setGaleria([...galeria, urlImagen]);
      } else {
        Alert.alert("Error", res.data.message || "No se pudo subir la imagen.");
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo subir la foto.");
    } finally {
      setUploadingImage(false);
    }
  };

  // Cálculo automático de precios basado en porcentajes (Lógica de Excel)
  const aplicarPorcentajesExcel = (pventaPct: string, pmayorPct: string) => {
    const pVentaMargen = parseFloat(pventaPct) || 0;
    const pMayorMargen = parseFloat(pmayorPct) || 0;

    const nuevasVariantes = editData.lista_variantes.map((v: any) => {
      const costo = parseFloat(v.Precio_Compra) || 0;
      const calcVenta = costo > 0 ? costo + (costo * (pVentaMargen / 100)) : (parseFloat(v.Precio_Venta) || 0);
      const calcMayor = costo > 0 ? costo + (costo * (pMayorMargen / 100)) : (parseFloat(v.Precio_Mayor) || 0);

      return {
        ...v,
        Precio_Venta: calcVenta.toFixed(2),
        Precio_Mayor: calcMayor.toFixed(2)
      };
    });

    setEditData({
      ...editData,
      Porcentaje_Venta: pventaPct,
      Porcentaje_Mayor: pmayorPct,
      lista_variantes: nuevasVariantes
    });
  };

  const handleVariantChange = (index: number, field: string, value: string) => {
    const newVariants = [...editData.lista_variantes];
    newVariants[index] = { ...newVariants[index], [field]: value };

    // Si modifican el precio de compra individualmente, recalculamos según los porcentajes globales activos
    if (field === 'Precio_Compra') {
      const costo = parseFloat(value) || 0;
      const pVentaMargen = parseFloat(editData.Porcentaje_Venta) || 0;
      const pMayorMargen = parseFloat(editData.Porcentaje_Mayor) || 0;

      if (costo > 0) {
        newVariants[index].Precio_Venta = (costo + (costo * (pVentaMargen / 100))).toFixed(2);
        newVariants[index].Precio_Mayor = (costo + (costo * (pMayorMargen / 100))).toFixed(2);
      }
    }

    setEditData({ ...editData, lista_variantes: newVariants });
  };

  const agregarVarianteFila = () => {
    const primerPrecioCompra = editData.lista_variantes[0]?.Precio_Compra || '';
    const pVentaMargen = parseFloat(editData.Porcentaje_Venta) || 0;
    const pMayorMargen = parseFloat(editData.Porcentaje_Mayor) || 0;
    const costo = parseFloat(primerPrecioCompra) || 0;

    const nuevaVariante = {
      Codigo: '',
      Variante_Color: 'Nuevo Tono',
      Precio_Compra: primerPrecioCompra,
      Precio_Venta: costo > 0 ? (costo + (costo * (pVentaMargen / 100))).toFixed(2) : '',
      Precio_Mayor: costo > 0 ? (costo + (costo * (pMayorMargen / 100))).toFixed(2) : '',
      Stock: 1,
      Referencia: '',
      ID_Shopify_Variante: '',
      ID_Inventory_Item: ''
    };
    setEditData({
      ...editData,
      lista_variantes: [...editData.lista_variantes, nuevaVariante]
    });
  };

  const handleSaveCompleto = async () => {
    if (!editData) return;
    setSaving(true);
    try {
      const payload = {
        producto: {
          codigo: editData.Codigo || '',
          nombre: editData.Producto,
          marca: editData.Proveedor || '',
          categoria: editData.Categoria || '',
          descripcion: editData.Descripcion || '',
          handle: editData.Handle,
          tienda: editData.Tienda || tiendaSeleccionada,
          variante_nombre: editData.Variante_Nombre || 'Tono',
          id_shopify_producto: editData.ID_Shopify_Producto || '',
          url_imagen: galeria.join(',') 
        },
        variantes: editData.lista_variantes.map((v: any) => ({
          codigo: v.Codigo || editData.Codigo,
          variante_color: v.Variante_Color,
          precio_compra: parseFloat(v.Precio_Compra) || 0,
          precio_venta: parseFloat(v.Precio_Venta) || 0,
          precio_mayor: parseFloat(v.Precio_Mayor) || 0,
          stock: parseInt(v.Stock) || 0,
          referencia: v.Referencia || '',
          id_shopify_variante: v.ID_Shopify_Variante || '',
          id_inventory_item: v.ID_Inventory_Item || ''
        }))
      };
      
      const res = await axios.post(`${API_BASE_URL}?accion=sincronizar_producto_completo`, payload);
      
      if (res.data.exito) {
        Alert.alert("Éxito", "Producto guardado correctamente");
        setModalVisible(false);
        loadProductos();
      } else {
        Alert.alert("Error", res.data.detalle_servidor || res.data.error || "Error al sincronizar.");
      }
    } catch (e: any) { 
      Alert.alert("Error", "Fallo de red o servidor."); 
    } finally {
      setSaving(false);
    }
  };

  const getPrimeraImagen = (urlString: string) => {
    if (!urlString) return 'https://via.placeholder.com/80';
    const imgs = urlString.split(',').map(i => i.trim()).filter(i => i !== '');
    return imgs.length > 0 ? imgs[0] : 'https://via.placeholder.com/80';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.tituloHeaderPrincipal}>Inventario / Productos</Text>
        <TouchableOpacity style={styles.btnNuevoTop} onPress={abrirNuevoProducto}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={{color: '#fff', fontWeight: 'bold', marginLeft: 4}}>Nuevo</Text>
        </TouchableOpacity>
      </View>

      {/* SELECTOR DE TIENDA SUPERIOR */}
      <View style={styles.selectorTiendaContainer}>
        <Text style={{fontSize: 11, fontWeight: 'bold', color: '#555', marginBottom: 4}}>SEDE ACTIVA:</Text>
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

      <View style={styles.headerControl}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar productos o escanear..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={abrirScanner}>
            <Ionicons name="barcode-outline" size={24} color="#008060" />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

      {loading ? (
        <ActivityIndicator style={{flex:1}} size="large" color="#008060" />
      ) : (
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item: any, idx) => (item.Codigo ? item.Codigo.toString() + idx : idx.toString())}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron productos en {tiendaSeleccionada}.</Text>}
          renderItem={({ item }) => {
            const tieneStock = item.stockTotal > 0;
            return (
              <TouchableOpacity style={styles.card} onPress={() => openEditModal(item)}>
                <Image source={{ uri: getPrimeraImagen(item.StringImagenes) }} style={styles.imagen} />
                <View style={styles.info}>
                  <Text style={styles.nombre} numberOfLines={2}>{item.Producto}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.precio}>${item.Precio_Venta || 0}</Text>
                    <View style={styles.stockBadge}>
                      <View style={[styles.stockDot, { backgroundColor: tieneStock ? '#008060' : '#d32f2f' }]} />
                      <Text style={styles.stockText}>{item.stockTotal} disponibles</Text>
                    </View>
                  </View>
                  <Text style={styles.variantesText}>{item.cantidadVariantes} variante(s) - Sede: {tiendaSeleccionada}</Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* MODAL SCANNER */}
      <Modal visible={scannerVisible} animationType="slide">
        <View style={styles.scannerContainer}>
          <Text style={styles.scannerText}>Escanea el código de barras</Text>
          <CameraView style={styles.camera} facing="back" onBarcodeScanned={({ data }) => { setSearchQuery(data); setScannerVisible(false); }} />
          <TouchableOpacity style={styles.btnCancelarScanner} onPress={() => setScannerVisible(false)}>
             <Text style={styles.btnText}>Cancelar Escáner</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* MODAL DE EDICIÓN Y CREACIÓN AVANZADA (LÓGICA EXCEL + PORCENTAJES) */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalHeader}>
           <Text style={styles.tituloHeader}>Gestión de Producto</Text>
           <TouchableOpacity onPress={() => setModalVisible(false)}>
             <Ionicons name="close" size={24} color="#000" />
           </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
          {editData && (
            <>
              {/* Sección Multimedia */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>Imágenes del Producto</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.multimediaScroll}>
                  {galeria.map((img, index) => (
                    <Image key={index} source={{ uri: img }} style={styles.imgThumbnail} />
                  ))}
                  <TouchableOpacity style={styles.addBtnContainer} onPress={seleccionarImagen} disabled={uploadingImage}>
                    {uploadingImage ? <ActivityIndicator color="#008060" /> : <Text style={styles.addBtnText}>+</Text>}
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Datos Generales tipo Excel */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>Datos Generales (Formulario Excel)</Text>
                
                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Código / SKU Principal</Text>
                    <TextInput style={styles.input} value={editData.Codigo?.toString()} onChangeText={(v) => setEditData({...editData, Codigo: v})} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Handle (Shopify URL)</Text>
                    <TextInput style={styles.input} value={editData.Handle} onChangeText={(v) => setEditData({...editData, Handle: v})} />
                  </View>
                </View>

                <Text style={styles.label}>Nombre del Producto</Text>
                <TextInput style={styles.input} value={editData.Producto} onChangeText={(v) => setEditData({...editData, Producto: v})} />

                <Text style={styles.label}>Descripción</Text>
                <TextInput style={[styles.input, {height: 60}]} multiline value={editData.Descripcion} onChangeText={(v) => setEditData({...editData, Descripcion: v})} />

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Proveedor / Marca</Text>
                    <TextInput style={styles.input} value={editData.Proveedor} onChangeText={(v) => setEditData({...editData, Proveedor: v})} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Categoría</Text>
                    <TextInput style={styles.input} value={editData.Categoria} onChangeText={(v) => setEditData({...editData, Categoria: v})} />
                  </View>
                </View>

                {/* Porcentajes de Cálculo Automático */}
                <View style={styles.porcentajesBox}>
                  <Text style={{fontWeight: 'bold', fontSize: 13, color: '#008060', marginBottom: 6}}>Márgenes de Ganancia (%)</Text>
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Text style={styles.label}>% Margen Venta</Text>
                      <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={editData.Porcentaje_Venta} 
                        onChangeText={(v) => aplicarPorcentajesExcel(v, editData.Porcentaje_Mayor)} 
                      />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.label}>% Margen Mayorista</Text>
                      <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={editData.Porcentaje_Mayor} 
                        onChangeText={(v) => aplicarPorcentajesExcel(editData.Porcentaje_Venta, v)} 
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Variantes y SKUs */}
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 15, marginTop: 10}}>
                <Text style={[styles.sectionTitle, {marginBottom: 0}]}>Variantes</Text>
                <TouchableOpacity style={styles.btnAgregarVar} onPress={agregarVarianteFila}>
                  <Text style={{color: '#fff', fontWeight: 'bold', fontSize: 13}}>+ Agregar Variante</Text>
                </TouchableOpacity>
              </View>
              
              {editData.lista_variantes?.map((variante: any, index: number) => (
                <View key={index} style={styles.varianteBox}>
                  <Text style={styles.varianteTitle}>Variante #{index + 1}</Text>
                  
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Text style={styles.label}>Color / Tono</Text>
                      <TextInput style={styles.input} value={variante.Variante_Color} onChangeText={(v) => handleVariantChange(index, 'Variante_Color', v)} />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.label}>Código / SKU</Text>
                      <TextInput style={styles.input} value={variante.Codigo?.toString()} onChangeText={(v) => handleVariantChange(index, 'Codigo', v)} />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Text style={styles.label}>Stock</Text>
                      <TextInput style={styles.input} value={variante.Stock?.toString()} keyboardType="numeric" onChangeText={(v) => handleVariantChange(index, 'Stock', v)} />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.label}>Referencia</Text>
                      <TextInput style={styles.input} value={variante.Referencia} onChangeText={(v) => handleVariantChange(index, 'Referencia', v)} />
                    </View>
                  </View>

                  {/* Precios calculados por porcentajes */}
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Text style={styles.label}>Precio Compra ($)</Text>
                      <TextInput style={styles.input} value={variante.Precio_Compra?.toString()} keyboardType="numeric" onChangeText={(v) => handleVariantChange(index, 'Precio_Compra', v)} />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.label}>Precio Venta ($)</Text>
                      <TextInput style={[styles.input, {backgroundColor: '#eef6f4'}]} value={variante.Precio_Venta?.toString()} keyboardType="numeric" onChangeText={(v) => handleVariantChange(index, 'Precio_Venta', v)} />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Text style={styles.label}>Precio Mayor ($)</Text>
                      <TextInput style={[styles.input, {backgroundColor: '#eef6f4'}]} value={variante.Precio_Mayor?.toString()} keyboardType="numeric" onChangeText={(v) => handleVariantChange(index, 'Precio_Mayor', v)} />
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
          <View style={{height: 40}} /> 
        </ScrollView>

        <View style={styles.footerButtons}>
          <TouchableOpacity style={[styles.btn, styles.btnGuardar]} onPress={handleSaveCompleto} disabled={saving}>
            <Text style={styles.btnText}>{saving ? "GUARDANDO..." : "GUARDAR PRODUCTO"}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 15,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  tituloHeaderPrincipal: { fontSize: 18, fontWeight: 'bold', color: '#000' },
  btnNuevoTop: { flexDirection: 'row', backgroundColor: '#008060', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignItems: 'center' },
  
  selectorTiendaContainer: { backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#eee' },
  btnTiendaSede: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#f0f0f0', marginRight: 8 },
  btnTiendaSedeActivo: { backgroundColor: '#008060' },
  btnTiendaSedeTexto: { color: '#666', fontWeight: '600', fontSize: 12 },
  btnTiendaSedeTextoActivo: { color: '#fff' },

  headerControl: { marginBottom: 10, paddingHorizontal: 10, paddingTop: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ebebeb', borderRadius: 10, paddingHorizontal: 12, height: 42, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  
  tabBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#ebebeb', marginRight: 8 },
  tabBtnActive: { backgroundColor: '#333' },
  tabText: { color: '#666', fontWeight: '600', fontSize: 12 },
  tabTextActive: { color: '#fff' },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#666', fontSize: 15 },

  card: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 10, marginHorizontal: 10, elevation: 2 },
  imagen: { width: 70, height: 70, borderRadius: 8, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#eee', resizeMode: 'cover' },
  info: { marginLeft: 12, justifyContent: 'center', flex: 1 },
  nombre: { fontSize: 14, fontWeight: 'bold', color: '#202223', marginBottom: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  precio: { color: '#333', fontWeight: 'bold', fontSize: 14 },
  stockBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f6f8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  stockDot: { width: 6, height: 6, borderRadius: 3, marginRight: 4 },
  stockText: { fontSize: 11, color: '#666', fontWeight: '500' },
  variantesText: { color: '#8c9196', fontSize: 11 },
  
  scannerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  camera: { width: '100%', height: '80%' },
  scannerText: { color: '#fff', fontSize: 16, marginBottom: 20, fontWeight: 'bold', textAlign: 'center' },
  btnCancelarScanner: { backgroundColor: '#d32f2f', padding: 12, borderRadius: 8, marginTop: 20, width: '80%', alignItems: 'center' },

  modalHeader: { padding: 16, paddingTop: Platform.OS === 'ios' ? 50 : 15, backgroundColor: '#fff', elevation: 3, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: '#ddd' },
  tituloHeader: { fontSize: 18, fontWeight: 'bold' },
  modalScroll: { flex: 1, backgroundColor: '#f4f6f8', padding: 10 },
  multimediaScroll: { flexDirection: 'row', paddingVertical: 5 },
  imgThumbnail: { width: 80, height: 80, borderRadius: 8, marginRight: 8, backgroundColor: '#e0e0e0', resizeMode: 'cover' },
  addBtnContainer: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#aaa', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  addBtnText: { fontSize: 24, color: '#888' },
  sectionBox: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 12, elevation: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#333' },
  porcentajesBox: { backgroundColor: '#f9f9f9', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#e0e0e0', marginTop: 5 },
  varianteBox: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#008060', elevation: 1 },
  varianteTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#008060' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { flex: 0.48 },
  label: { fontSize: 11, color: '#666', marginBottom: 3, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 8, marginBottom: 10, borderRadius: 5, backgroundColor: '#fafafa', color: '#000', fontSize: 14 },
  footerButtons: { padding: 15, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#ddd' },
  btn: { padding: 14, borderRadius: 6, alignItems: 'center' },
  btnGuardar: { backgroundColor: '#008060' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  btnAgregarVar: { backgroundColor: '#007AFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }
});