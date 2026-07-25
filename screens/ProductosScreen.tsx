import React, { useEffect, useState } from 'react';
import { 
  View, Text, FlatList, StyleSheet, Image, ActivityIndicator, 
  TouchableOpacity, Modal, TextInput, Alert, ScrollView, Platform, Linking
} from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons'; 
import { CameraView, useCameraPermissions } from 'expo-camera';

const API_BASE_URL = 'https://app-23c8f020-a783-451d-b1cf-b48a15a79604.cleverapps.io/index.php';
const URL_TIENDA_WEB = 'https://tutienda.com/products/'; // <-- CAMBIA ESTO POR EL DOMINIO DE TU PÁGINA WEB

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
  const [tiendaSeleccionada, setTiendaSeleccionada] = useState('ambas'); // Inicializa en 'ambas' por defecto

  const [permisoCamara, pedirPermisoCamara] = useCameraPermissions();
  const [scannerVisible, setScannerVisible] = useState(false);

  const sedesDisponibles = ['santuario', 'sanfelipe', 'ambas'];
  const tabsFiltro = ['Todos', 'Activo', 'Borrador'];

  useEffect(() => {
    loadProductos();
  }, [tiendaSeleccionada]);

  const loadProductos = async () => {
    setLoading(true);
    try {
      // Mandamos la tienda seleccionada al PHP (él se encargará de filtrar o traer todos si es 'ambas')
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
              StringImagenes: urlImagenString,
              estado: (current.estado || current.Estado || 'activo').toLowerCase() // Recuperamos el estado de la DB
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
      Tienda: tiendaSeleccionada === 'ambas' ? 'santuario' : tiendaSeleccionada, 
      estado: 'borrador', // Los productos nuevos inician en borrador
      ID_Shopify_Producto: '',
      Porcentaje_Venta: '30',
      Porcentaje_Mayor: '15',
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
    const estadoItem = item.estado || 'activo';
    
    if (activeTab === 'Activo') {
      tabCoincide = estadoItem === 'activo';
    } else if (activeTab === 'Borrador') {
      tabCoincide = estadoItem === 'borrador';
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
          estado: (res.data.estado || item.estado || 'activo').toLowerCase(),
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
      try {
        const responseFetch = await fetch(foto.uri);
        const blob = await responseFetch.blob();
        data.append('file', blob, 'producto.jpg');
      } catch (e) {
        Alert.alert("Error", "No se pudo procesar la imagen.");
        setUploadingImage(false);
        return;
      }
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
        Alert.alert("Error", result.error?.message || "Cloudinary no devolvió la URL.");
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo subir la foto a Cloudinary");
    } finally {
      setUploadingImage(false);
    }
  };

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
          tienda: editData.Tienda || (tiendaSeleccionada === 'ambas' ? 'santuario' : tiendaSeleccionada),
          estado: editData.estado || 'activo', // Mandamos el estado al backend
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

  const abrirVistaPrevia = () => {
    if(!editData?.Handle) {
        Alert.alert("Aviso", "El producto no tiene Handle para generar la URL.");
        return;
    }
    const url = `${URL_TIENDA_WEB}${editData.Handle}`;
    Linking.openURL(url).catch(err => Alert.alert("Error", "No se pudo abrir el navegador."));
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
        <Text style={styles.tituloHeaderPrincipal}>Productos</Text>
        <TouchableOpacity style={styles.btnNuevoTop} onPress={abrirNuevoProducto}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* SELECTOR DE TIENDA TIPO CHIPS */}
      <View style={styles.selectorTiendaContainer}>
        <Text style={{fontSize: 11, fontWeight: 'bold', color: '#6d7175', marginBottom: 6}}>SEDE ACTIVA:</Text>
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
          <Ionicons name="search" size={20} color="#6d7175" style={{ marginRight: 8 }} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Buscar productos o escanear..."
            placeholderTextColor="#8c9196"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={abrirScanner} style={styles.scannerIconBox}>
            <Ionicons name="barcode-outline" size={20} color="#6d7175" />
          </TouchableOpacity>
        </View>

        {/* TABS TIPO SHOPIFY */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 5}}>
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

      {loading ? (
        <ActivityIndicator style={{flex:1, marginTop: 40}} size="large" color="#008060" />
      ) : (
        <FlatList
          data={productosFiltrados}
          keyExtractor={(item: any, idx) => (item.Codigo ? item.Codigo.toString() + idx : idx.toString())}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No se encontraron productos.</Text>}
          renderItem={({ item }) => {
            const isActivo = item.estado === 'activo';
            return (
              <TouchableOpacity style={styles.cardShopify} onPress={() => openEditModal(item)}>
                <Image source={{ uri: getPrimeraImagen(item.StringImagenes) }} style={styles.imagenShopify} />
                <View style={styles.infoShopify}>
                  <View style={styles.tituloRow}>
                    <Text style={styles.nombreShopify} numberOfLines={2}>{item.Producto}</Text>
                    {/* BADGE DE ESTADO SHOPIFY STYLE */}
                    <View style={[styles.badgeEstado, { backgroundColor: isActivo ? '#c3f0d5' : '#e4e5e7' }]}>
                      <Text style={[styles.badgeTexto, { color: isActivo ? '#008060' : '#454749' }]}>
                        {isActivo ? 'Activo' : 'Borrador'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.detallesShopify}>
                    {item.stockTotal} disponibles · {item.cantidadVariantes} variante(s)
                  </Text>
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

      {/* MODAL DE EDICIÓN Y CREACIÓN AVANZADA */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalHeader}>
           <Text style={styles.tituloHeader}>Editar Producto</Text>
           <View style={{flexDirection: 'row', alignItems: 'center'}}>
             <TouchableOpacity style={{marginRight: 20}} onPress={abrirVistaPrevia}>
               <Ionicons name="eye-outline" size={24} color="#000" />
             </TouchableOpacity>
             <TouchableOpacity onPress={() => setModalVisible(false)}>
               <Ionicons name="close" size={24} color="#000" />
             </TouchableOpacity>
           </View>
        </View>

        <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
          {editData && (
            <>
              {/* Selector de Estado tipo Shopify */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>Estado del producto</Text>
                <View style={styles.statusContainer}>
                  <TouchableOpacity 
                    style={[styles.statusBtn, editData.estado === 'activo' && styles.statusBtnActive]}
                    onPress={() => setEditData({...editData, estado: 'activo'})}
                  >
                    <Text style={[styles.statusText, editData.estado === 'activo' && styles.statusTextActive]}>Activo</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.statusBtn, editData.estado === 'borrador' && styles.statusBtnBorrador]}
                    onPress={() => setEditData({...editData, estado: 'borrador'})}
                  >
                    <Text style={[styles.statusText, editData.estado === 'borrador' && styles.statusTextBorrador]}>Borrador</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.statusDescription}>
                  {editData.estado === 'activo' 
                    ? "El producto está visible y disponible para la venta en la web." 
                    : "El producto está oculto y no se mostrará a los clientes."}
                </Text>
              </View>

              {/* Sección Multimedia */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>Multimedia</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.multimediaScroll}>
                  {galeria.map((img, index) => (
                    <Image key={index} source={{ uri: img }} style={styles.imgThumbnail} />
                  ))}
                  <TouchableOpacity style={styles.addBtnContainer} onPress={seleccionarImagen} disabled={uploadingImage}>
                    {uploadingImage ? <ActivityIndicator color="#008060" /> : <Text style={styles.addBtnText}>+</Text>}
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Datos Generales */}
              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>Información General</Text>
                
                <Text style={styles.label}>Nombre del Producto</Text>
                <TextInput style={styles.input} value={editData.Producto} onChangeText={(v) => setEditData({...editData, Producto: v})} />

                <Text style={styles.label}>Descripción</Text>
                <TextInput style={[styles.input, {height: 80, textAlignVertical: 'top'}]} multiline value={editData.Descripcion} onChangeText={(v) => setEditData({...editData, Descripcion: v})} />

                <View style={styles.row}>
                  <View style={styles.col}>
                    <Text style={styles.label}>Código / SKU</Text>
                    <TextInput style={styles.input} value={editData.Codigo?.toString()} onChangeText={(v) => setEditData({...editData, Codigo: v})} />
                  </View>
                  <View style={styles.col}>
                    <Text style={styles.label}>Handle (URL)</Text>
                    <TextInput style={styles.input} value={editData.Handle} onChangeText={(v) => setEditData({...editData, Handle: v})} />
                  </View>
                </View>

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
                  <Text style={{fontWeight: 'bold', fontSize: 13, color: '#202223', marginBottom: 6}}>Cálculo de Márgenes (%)</Text>
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Text style={styles.label}>Margen Venta Público</Text>
                      <TextInput 
                        style={styles.input} 
                        keyboardType="numeric" 
                        value={editData.Porcentaje_Venta} 
                        onChangeText={(v) => aplicarPorcentajesExcel(v, editData.Porcentaje_Mayor)} 
                      />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.label}>Margen Mayorista</Text>
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
                      <Text style={styles.label}>Stock Disponible</Text>
                      <TextInput style={styles.input} value={variante.Stock?.toString()} keyboardType="numeric" onChangeText={(v) => handleVariantChange(index, 'Stock', v)} />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.label}>Referencia</Text>
                      <TextInput style={styles.input} value={variante.Referencia} onChangeText={(v) => handleVariantChange(index, 'Referencia', v)} />
                    </View>
                  </View>

                  {/* Precios */}
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Text style={styles.label}>Costo Base ($)</Text>
                      <TextInput style={styles.input} value={variante.Precio_Compra?.toString()} keyboardType="numeric" onChangeText={(v) => handleVariantChange(index, 'Precio_Compra', v)} />
                    </View>
                    <View style={styles.col}>
                      <Text style={styles.label}>Venta Público ($)</Text>
                      <TextInput style={[styles.input, {backgroundColor: '#f4f6f8'}]} value={variante.Precio_Venta?.toString()} keyboardType="numeric" onChangeText={(v) => handleVariantChange(index, 'Precio_Venta', v)} />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Text style={styles.label}>Venta Mayorista ($)</Text>
                      <TextInput style={[styles.input, {backgroundColor: '#f4f6f8'}]} value={variante.Precio_Mayor?.toString()} keyboardType="numeric" onChangeText={(v) => handleVariantChange(index, 'Precio_Mayor', v)} />
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
    backgroundColor: '#f4f6f8',
  },
  tituloHeaderPrincipal: { fontSize: 22, fontWeight: 'bold', color: '#202223', flex: 1 },
  btnNuevoTop: { flexDirection: 'row', backgroundColor: '#000', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  
  selectorTiendaContainer: { paddingHorizontal: 15, paddingVertical: 8 },
  btnTiendaSede: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#d2d5d8' },
  btnTiendaSedeActivo: { backgroundColor: '#e4e5e7', borderColor: '#202223' },
  btnTiendaSedeTexto: { color: '#6d7175', fontWeight: '600', fontSize: 12 },
  btnTiendaSedeTextoActivo: { color: '#202223' },

  headerControl: { marginBottom: 10, paddingHorizontal: 15, paddingTop: 5 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: '#d2d5d8' },
  searchInput: { flex: 1, fontSize: 15, color: '#202223' },
  scannerIconBox: { padding: 4, backgroundColor: '#f4f6f8', borderRadius: 6 },
  
  tabBtn: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'transparent', marginRight: 8 },
  tabBtnActive: { backgroundColor: '#e4e5e7' },
  tabText: { color: '#6d7175', fontWeight: '600', fontSize: 13 },
  tabTextActive: { color: '#202223' },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#6d7175', fontSize: 15 },

  /* ESTILOS DE LA TARJETA TIPO SHOPIFY */
  cardShopify: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f4f6f8', marginHorizontal: 10, borderRadius: 8, marginBottom: 5 },
  imagenShopify: { width: 50, height: 50, borderRadius: 6, backgroundColor: '#f4f6f8', borderWidth: 1, borderColor: '#e4e5e7', resizeMode: 'cover' },
  infoShopify: { marginLeft: 12, flex: 1, justifyContent: 'center' },
  tituloRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  nombreShopify: { fontSize: 14, fontWeight: '600', color: '#202223', flex: 1, marginRight: 8 },
  detallesShopify: { color: '#6d7175', fontSize: 12, marginTop: 4 },
  
  badgeEstado: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, alignSelf: 'flex-start' },
  badgeTexto: { fontSize: 11, fontWeight: '600' },
  
  scannerContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  camera: { width: '100%', height: '80%' },
  scannerText: { color: '#fff', fontSize: 16, marginBottom: 20, fontWeight: 'bold', textAlign: 'center' },
  btnCancelarScanner: { backgroundColor: '#d32f2f', padding: 12, borderRadius: 8, marginTop: 20, width: '80%', alignItems: 'center' },

  modalHeader: { padding: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, backgroundColor: '#f4f6f8', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tituloHeader: { fontSize: 20, fontWeight: 'bold', color: '#202223' },
  modalScroll: { flex: 1, backgroundColor: '#f4f6f8', padding: 12 },
  multimediaScroll: { flexDirection: 'row', paddingVertical: 5 },
  imgThumbnail: { width: 80, height: 80, borderRadius: 8, marginRight: 8, backgroundColor: '#e4e5e7', resizeMode: 'cover', borderWidth: 1, borderColor: '#d2d5d8' },
  addBtnContainer: { width: 80, height: 80, borderRadius: 8, borderWidth: 1, borderColor: '#8c9196', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  addBtnText: { fontSize: 24, color: '#8c9196' },
  
  sectionBox: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 2 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 12, color: '#202223' },
  
  /* ESTILOS DEL SELECTOR DE ESTADO */
  statusContainer: { flexDirection: 'row', backgroundColor: '#f4f6f8', borderRadius: 8, padding: 4, marginBottom: 8 },
  statusBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6 },
  statusBtnActive: { backgroundColor: '#c3f0d5' },
  statusBtnBorrador: { backgroundColor: '#e4e5e7' },
  statusText: { fontWeight: '600', color: '#6d7175', fontSize: 13 },
  statusTextActive: { color: '#008060' },
  statusTextBorrador: { color: '#454749' },
  statusDescription: { fontSize: 12, color: '#6d7175', fontStyle: 'italic' },

  porcentajesBox: { backgroundColor: '#fafafa', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e4e5e7', marginTop: 5 },
  varianteBox: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#e4e5e7' },
  varianteTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 12, color: '#202223' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { flex: 0.48 },
  label: { fontSize: 12, color: '#6d7175', marginBottom: 4, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#d2d5d8', padding: 10, marginBottom: 12, borderRadius: 6, backgroundColor: '#fff', color: '#202223', fontSize: 14 },
  footerButtons: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#e4e5e7' },
  btn: { padding: 14, borderRadius: 8, alignItems: 'center' },
  btnGuardar: { backgroundColor: '#000' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  btnAgregarVar: { backgroundColor: '#f4f6f8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#d2d5d8' }
});