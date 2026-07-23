import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, Alert, Modal, TextInput, ScrollView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'https://app-23c8f020-a783-451d-b1cf-b48a15a79604.cleverapps.io/index.php';
const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/sngqwvpv/image/upload'; 
const UPLOAD_PRESET = 'njjetabd';

export default function ColeccionesScreen({ navigation }: any) {
  // Estado Principal
  const [colecciones, setColecciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sedeActiva, setSedeActiva] = useState('santuario'); 
  const [searchQuery, setSearchQuery] = useState('');

  // Estados para Vista de Detalle (Shopify Style)
  const [vistaDetalleActiva, setVistaDetalleActiva] = useState<any | null>(null);
  const [productosColeccion, setProductosColeccion] = useState<any[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);

  // Estados para Formulario (Crear/Editar)
  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formId, setFormId] = useState<number | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formTienda, setFormTienda] = useState('ambas');
  const [formImagenUrl, setFormImagenUrl] = useState('');
  const [imagenLocalUri, setImagenLocalUri] = useState<string | null>(null);

  useEffect(() => {
    cargarColecciones();
  }, [sedeActiva]);

  const cargarColecciones = () => {
    setCargando(true);
    fetch(`${API_URL}?accion=obtener_colecciones&tienda=${sedeActiva}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") setColecciones(data.data);
      })
      .catch(err => console.error(err))
      .finally(() => setCargando(false));
  };

  // Al presionar una colección de la lista, abrimos la VISTA DE DETALLE
  const abrirVistaDetalle = async (coleccion: any) => {
    setVistaDetalleActiva(coleccion);
    setCargandoProductos(true);
    try {
      // Hacemos el llamado a PHP usando tu nueva acción (obtener_por_marca)
      const res = await fetch(`${API_URL}?accion=obtener_por_marca&marca=${coleccion.nombre}&tienda=${sedeActiva}`);
      const data = await res.json();
      if (data.status === "success") {
        setProductosColeccion(data.data);
      } else {
        setProductosColeccion([]);
      }
    } catch (err) {
      console.error("Error al cargar productos de colección:", err);
    } finally {
      setCargandoProductos(false);
    }
  };

  // Filtrado de la barra de búsqueda
  const coleccionesFiltradas = colecciones.filter(c => 
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Funciones del Formulario
  const abrirModalNuevo = () => {
    setFormId(null); setFormNombre(''); setFormTienda('ambas'); setFormImagenUrl(''); setImagenLocalUri(null);
    setModalVisible(true);
  };

  const abrirModalEditar = () => {
    if (!vistaDetalleActiva) return;
    setFormId(vistaDetalleActiva.id);
    setFormNombre(vistaDetalleActiva.nombre);
    setFormTienda(vistaDetalleActiva.tienda);
    setFormImagenUrl(vistaDetalleActiva.imagen_url);
    setImagenLocalUri(null);
    setModalVisible(true);
  };

  const seleccionarImagen = async () => {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) { Alert.alert('Permiso denegado', 'Se requiere acceso a la galería.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setImagenLocalUri(result.assets[0].uri);
  };

  const guardarColeccion = async () => {
    if (!formNombre.trim()) { Alert.alert('Error', 'El nombre de la colección es obligatorio.'); return; }
    setGuardando(true);
    let urlFinal = formImagenUrl; 

    try {
      if (imagenLocalUri) {
        const formData = new FormData();
        formData.append('file', { uri: imagenLocalUri, type: 'image/jpeg', name: `coleccion_${formNombre.replace(/\s+/g, '_')}.jpg` } as any);
        formData.append('upload_preset', UPLOAD_PRESET);
        formData.append('folder', 'colecciones');
        const cloudinaryRes = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData, headers: { 'Content-Type': 'multipart/form-data' } });
        const cloudData = await cloudinaryRes.json();
        if (cloudData.secure_url) urlFinal = cloudData.secure_url;
      }
      
      const payload = { id: formId, nombre: formNombre, tienda: formTienda, imagen_url: urlFinal };
      const saveRes = await fetch(`${API_URL}?accion=guardar_coleccion`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const saveData = await saveRes.json();

      if (saveData.status === "success") {
        setModalVisible(false);
        cargarColecciones(); 
        if (vistaDetalleActiva) {
          // Si editamos, actualizamos la vista de detalle visualmente
          setVistaDetalleActiva({...vistaDetalleActiva, nombre: formNombre, tienda: formTienda, imagen_url: urlFinal});
        }
      } else { Alert.alert("Error", saveData.message); }
    } catch (error) { Alert.alert("Error", "Hubo un problema al guardar la colección."); } finally { setGuardando(false); }
  };

  const primeraImagenProducto = (urls: string) => {
    if (!urls) return 'https://via.placeholder.com/100';
    return urls.split(',')[0].trim();
  };

  // RENDER: SI HAY UNA COLECCIÓN SELECCIONADA -> MOSTRAMOS VISTA DETALLE
  if (vistaDetalleActiva) {
    return (
      <View style={styles.container}>
        {/* Cabecera Detalle */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setVistaDetalleActiva(null)} style={{ marginRight: 15 }}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={abrirModalEditar}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1, backgroundColor: '#fff' }}>
          {/* Imagen de Portada y Título */}
          <View style={styles.detalleHero}>
            <Image 
              source={{ uri: vistaDetalleActiva.imagen_url || 'https://via.placeholder.com/400' }} 
              style={styles.detalleImagenBig} 
            />
            <Text style={styles.detalleTitulo}>{vistaDetalleActiva.nombre}</Text>
            <Text style={styles.detalleSubtitulo}>Descripción  ›</Text>
          </View>

          {/* Carrusel de Productos de la Colección */}
          <View style={styles.detalleSeccionArticulos}>
            <View style={styles.rowBetween}>
              <Text style={styles.tituloSeccion}>Artículos de la colección</Text>
              <TouchableOpacity><Text style={styles.linkVerTodos}>Ver todos</Text></TouchableOpacity>
            </View>
            <Text style={styles.textoGris}>{productosColeccion.length} artículos</Text>

            {cargandoProductos ? (
              <ActivityIndicator color="#000" style={{marginTop: 20}} />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollProductos}>
                {productosColeccion.map((prod, index) => (
                  <View key={index} style={styles.productoCardMini}>
                    <Image source={{ uri: primeraImagenProducto(prod.URL_Imagen) }} style={styles.productoImgMini} />
                    <Text style={styles.productoNombreMini} numberOfLines={2}>{prod.Producto}</Text>
                    <Text style={styles.productoVariantesMini}>${prod.Precio_Venta}</Text>
                  </View>
                ))}
                {productosColeccion.length === 0 && (
                  <Text style={{ marginTop: 20, color: '#888' }}>No hay productos con stock en esta marca.</Text>
                )}
              </ScrollView>
            )}
          </View>

          <View style={{height: 100}} />
        </ScrollView>

        {/* MODAL EDITAR DENTRO DEL DETALLE */}
        {renderModalFormulario()}
      </View>
    );
  }

  // RENDER PRINCIPAL: VISTA DE LISTA (Buscador y Colecciones)
  return (
    <View style={styles.container}>
      {/* Header Oscuro (Estilo Shopify Colecciones) */}
      <View style={styles.headerDark}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.tituloDark}>Colecciones</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.iconBtnHeader} onPress={abrirModalNuevo}>
          <Ionicons name="add-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtnHeader}>
          <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Barra de Búsqueda y Filtros */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#888" style={{marginRight: 8}} />
            <TextInput 
              style={styles.searchInputColeccion}
              placeholder="Buscar"
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="swap-vertical" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn}>
            <Ionicons name="filter" size={20} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Lista de Colecciones */}
        {cargando ? (
          <ActivityIndicator size="large" color="#000" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={coleccionesFiltradas}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.itemList} onPress={() => abrirVistaDetalle(item)}>
                <Image 
                  source={{ uri: item.imagen_url || 'https://via.placeholder.com/150?text=Sin+Foto' }} 
                  style={styles.imagenListSquar} 
                />
                <View style={styles.infoList}>
                  <Text style={styles.nombreListTitle}>{item.nombre}</Text>
                  <Text style={styles.subtitleList}>Colección • {item.tienda}</Text>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separador} />}
          />
        )}
      </View>

      {/* MODAL CREAR DESDE LA LISTA */}
      {renderModalFormulario()}
    </View>
  );

  // Función Auxiliar para no repetir el código del Modal
  function renderModalFormulario() {
    return (
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>{formId ? 'Editar Colección' : 'Nueva Colección'}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.btnCancelar}>Cancelar</Text></TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.sectionTitle}>Multimedia</Text>
            <View style={styles.cardBlanca}>
              <TouchableOpacity style={styles.cajaPunteada} onPress={seleccionarImagen}>
                {imagenLocalUri || formImagenUrl ? (
                  <Image source={{ uri: imagenLocalUri || formImagenUrl }} style={styles.imagenPreview} />
                ) : <Text style={styles.iconoMas}>+</Text>}
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionTitle}>Datos Generales</Text>
            <View style={styles.cardBlanca}>
              <Text style={styles.label}>Nombre de la Colección</Text>
              <TextInput style={styles.input} value={formNombre} onChangeText={setFormNombre} placeholder="Ej. Atenea" />
              <Text style={styles.label}>Tienda / Sede</Text>
              <View style={styles.rowBotonesTienda}>
                {['santuario', 'sanfelipe', 'ambas'].map((t) => (
                  <TouchableOpacity key={t} style={[styles.btnTienda, formTienda === t && styles.btnTiendaActivo]} onPress={() => setFormTienda(t)}>
                    <Text style={[styles.btnTiendaTexto, formTienda === t && styles.btnTiendaTextoActivo]}>{t.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          <View style={styles.footerModal}>
            <TouchableOpacity style={[styles.btnGuardarVerde, guardando && styles.btnDeshabilitado]} onPress={guardarColeccion} disabled={guardando}>
              {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.textoBtnGuardar}>GUARDAR CAMBIOS</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' }, // Fondo negro para el header dark
  
  // ESTILOS HEADER LISTA (Shopify Dark)
  headerDark: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 15,
    backgroundColor: '#000',
  },
  tituloDark: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginLeft: 5 },
  iconBtnHeader: { marginLeft: 15 },

  // ESTILOS BARRA BÚSQUEDA
  searchContainer: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  searchInputColeccion: { flex: 1, fontSize: 16, color: '#333'  },
  filterBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },

  // ESTILOS LISTA COLECCIONES
  itemList: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  imagenListSquar: { width: 45, height: 45, borderRadius: 6, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#eee' },
  infoList: { marginLeft: 15, flex: 1 },
  nombreListTitle: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 2 },
  subtitleList: { fontSize: 13, color: '#888' },
  separador: { height: 1, backgroundColor: '#eee', marginLeft: 76 },

  // ESTILOS VISTA DETALLE
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 10,
    backgroundColor: '#fff', 
  },
  detalleHero: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detalleImagenBig: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover', marginBottom: 15 },
  detalleTitulo: { fontSize: 28, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  detalleSubtitulo: { fontSize: 15, color: '#555' },
  
  detalleSeccionArticulos: { padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  linkVerTodos: { fontSize: 15, color: '#007AFF' },
  textoGris: { fontSize: 14, color: '#888', marginBottom: 15 },
  
  scrollProductos: { flexDirection: 'row' },
  productoCardMini: { width: 110, marginRight: 15 },
  productoImgMini: { width: 110, height: 110, borderRadius: 10, backgroundColor: '#f4f4f4', marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  productoNombreMini: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  productoVariantesMini: { fontSize: 12, color: '#888' },

  // ESTILOS MODAL FORMULARIO
  modalContainer: { flex: 1, backgroundColor: '#f4f6f8' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitulo: { fontSize: 18, fontWeight: 'bold' },
  btnCancelar: { color: '#007AFF', fontSize: 16 },
  modalBody: { flex: 1, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 10 },
  cardBlanca: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 },
  cajaPunteada: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#ccc', borderRadius: 8, height: 120, width: 120, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  iconoMas: { fontSize: 30, color: '#aaa' },
  imagenPreview: { width: '100%', height: '100%' },
  label: { fontSize: 13, color: '#666', marginBottom: 6, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 12, fontSize: 15, marginBottom: 16, backgroundColor: '#fafafa' },
  rowBotonesTienda: { flexDirection: 'row', gap: 8 },
  btnTienda: { flex: 1, paddingVertical: 10, borderRadius: 6, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  btnTiendaActivo: { backgroundColor: '#e8f4fd', borderColor: '#007AFF' },
  btnTiendaTexto: { fontSize: 12, color: '#666', fontWeight: '600' },
  btnTiendaTextoActivo: { color: '#007AFF' },
  footerModal: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingBottom: 30 },
  btnGuardarVerde: { backgroundColor: '#007f5f', paddingVertical: 14, borderRadius: 6, alignItems: 'center' },
  btnDeshabilitado: { backgroundColor: '#80bfae' },
  textoBtnGuardar: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});