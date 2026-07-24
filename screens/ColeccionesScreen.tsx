import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, 
  ActivityIndicator, Alert, Modal, TextInput, ScrollView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const API_URL = 'https://app-23c8f020-a783-451d-b1cf-b48a15a79604.cleverapps.io/index.php';

export default function ColeccionesScreen({ navigation }: any) {
  const [colecciones, setColecciones] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sedeActiva, setSedeActiva] = useState('santuario'); 
  const [searchQuery, setSearchQuery] = useState('');

  const [vistaDetalleActiva, setVistaDetalleActiva] = useState<any | null>(null);
  const [productosColeccion, setProductosColeccion] = useState<any[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formNombre, setFormNombre] = useState('');
  const [formTienda, setFormTienda] = useState('santuario');
  const [formImagenUrl, setFormImagenUrl] = useState('');
  const [imagenLocalUri, setImagenLocalUri] = useState<string | null>(null);
  const [imagenBase64, setImagenBase64] = useState<string | null>(null); // Estado para el Base64

  useEffect(() => {
    cargarColecciones();
  }, [sedeActiva]);

  const cargarColecciones = () => {
    setCargando(true);
    fetch(`${API_URL}?accion=obtener_colecciones&tienda=${sedeActiva}`)
      .then(res => res.json())
      .then(data => {
        if (data.status === "success") {
          setColecciones(data.data);
        } else {
          setColecciones([]);
        }
      })
      .catch(err => {
        console.error("Error cargando colecciones:", err);
      })
      .finally(() => setCargando(false));
  };

  const abrirVistaDetalle = async (coleccion: any) => {
    setVistaDetalleActiva(coleccion);
    setCargandoProductos(true);
    try {
      const urlFetch = `${API_URL}?accion=obtener_por_marca&marca=${encodeURIComponent(coleccion.nombre)}&tienda=${sedeActiva}`;
      const res = await fetch(urlFetch);
      const data = await res.json();
      
      if (data.status === "success") {
        setProductosColeccion(data.data);
      } else {
        setProductosColeccion([]);
      }
    } catch (err) {
      console.error("Error al cargar productos de colección:", err);
      setProductosColeccion([]);
    } finally {
      setCargandoProductos(false);
    }
  };

  const coleccionesFiltradas = colecciones.filter(c => 
    c.nombre && c.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const abrirModalNuevo = () => {
    setFormNombre(''); 
    setFormTienda(sedeActiva); 
    setFormImagenUrl(''); 
    setImagenLocalUri(null);
    setImagenBase64(null); // Limpiamos el Base64
    setModalVisible(true);
  };

  const abrirModalEditar = () => {
    if (!vistaDetalleActiva) return;
    setFormNombre(vistaDetalleActiva.nombre);
    setFormTienda(vistaDetalleActiva.tienda || 'santuario');
    setFormImagenUrl(vistaDetalleActiva.imagen_url);
    setImagenLocalUri(null);
    setImagenBase64(null); // Limpiamos el Base64
    setModalVisible(true);
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
    });

    if (!result.canceled) {
      setImagenLocalUri(result.assets[0].uri);
      // Ya no necesitamos base64, subiremos directamente con FormData
      subirACloudinaryDirecto(result.assets[0]);
    }
  };

  const subirACloudinaryDirecto = async (foto: any) => {
    setGuardando(true);
    const data = new FormData();

    if (Platform.OS === 'web') {
      try {
        const responseFetch = await fetch(foto.uri);
        const blob = await responseFetch.blob();
        data.append('file', blob, 'coleccion.jpg');
      } catch (e) {
        Alert.alert("Error", "No se pudo procesar la imagen en la web.");
        setGuardando(false);
        return;
      }
    } else {
      data.append('file', {
        uri: foto.uri,
        type: 'image/jpeg',
        name: 'coleccion.jpg',
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
        // Guardamos directamente la URL final que nos devuelve Cloudinary
        setFormImagenUrl(result.secure_url);
      } else {
        Alert.alert("Error", result.error?.message || "Cloudinary no devolvió la URL de la imagen.");
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo subir la foto a Cloudinary");
    } finally {
      setGuardando(false);
    }
  };

const guardarColeccion = async () => {
    if (!formNombre.trim()) { 
      Alert.alert('Error', 'El nombre de la colección es obligatorio.'); 
      return; 
    }
    setGuardando(true);

    try {
      const payload = { 
        id: vistaDetalleActiva ? (vistaDetalleActiva.id || vistaDetalleActiva.ID || 0) : 0,
        nombre: formNombre, 
        tienda: formTienda, 
        imagen_url: formImagenUrl 
      };

      const saveRes = await fetch(`${API_URL}?accion=guardar_coleccion`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
      });
      const saveData = await saveRes.json();

      if (saveData.status === "success") {
        setModalVisible(false);
        cargarColecciones(); 
        if (vistaDetalleActiva) {
          setVistaDetalleActiva({
            ...vistaDetalleActiva, 
            nombre: formNombre, 
            tienda: formTienda, 
            imagen_url: formImagenUrl
          });
        }
        Alert.alert("Éxito", "Colección guardada correctamente.");
      } else { 
        Alert.alert("Error", saveData.message || "No se pudo guardar la colección."); 
      }
    } catch (error) { 
      Alert.alert("Error", "Hubo un problema de conexión al guardar la colección."); 
    } finally { 
      setGuardando(false); 
    }
  };

  const primeraImagenProducto = (urls: string) => {
    if (!urls || urls === 'EMPTY') return 'https://via.placeholder.com/100';
    return urls.split(',')[0].trim();
  };

  if (vistaDetalleActiva) {
    return (
      <View style={styles.container}>
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
          <View style={styles.detalleHero}>
            <Image 
              source={{ uri: vistaDetalleActiva.imagen_url || 'https://via.placeholder.com/400?text=Sin+Foto' }} 
              style={styles.detalleImagenBig} 
            />
            <Text style={styles.detalleTitulo}>{vistaDetalleActiva.nombre}</Text>
          </View>

          <View style={styles.detalleSeccionArticulos}>
            <View style={styles.rowBetween}>
              <Text style={styles.tituloSeccion}>Artículos de la marca</Text>
            </View>
            <Text style={styles.textoGris}>{productosColeccion.length} artículos en {sedeActiva}</Text>

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
                  <Text style={{ marginTop: 20, color: '#888' }}>No hay productos con stock en esta sucursal.</Text>
                )}
              </ScrollView>
            )}
          </View>
          <View style={{height: 100}} />
        </ScrollView>
        {renderModalFormulario()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerDark}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.tituloDark}>Colecciones</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.iconBtnHeader} onPress={abrirModalNuevo}>
          <Ionicons name="add-circle-outline" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.selectorSedeContainer}>
          {['santuario', 'sanfelipe', 'ambas'].map((sede) => (
            <TouchableOpacity 
              key={sede} 
              style={[styles.btnSedeTab, sedeActiva === sede && styles.btnSedeTabActivo]}
              onPress={() => setSedeActiva(sede)}
            >
              <Text style={[styles.textSedeTab, sedeActiva === sede && styles.textSedeTabActivo]}>
                {sede.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={20} color="#888" style={{marginRight: 8}} />
            <TextInput 
              style={styles.searchInputColeccion}
              placeholder="Buscar colección..."
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {cargando ? (
          <ActivityIndicator size="large" color="#000" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={coleccionesFiltradas}
            keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.itemList} onPress={() => abrirVistaDetalle(item)}>
                <Image 
                  source={{ uri: item.imagen_url || 'https://via.placeholder.com/150?text=Sin+Foto' }} 
                  style={styles.imagenListSquar} 
                />
                <View style={styles.infoList}>
                  <Text style={styles.nombreListTitle}>{item.nombre}</Text>
                  <Text style={styles.subtitleList}>Tienda: {item.tienda}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separador} />}
          />
        )}
      </View>
      {renderModalFormulario()}
    </View>
  );

  function renderModalFormulario() {
    return (
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>{vistaDetalleActiva ? 'Editar Colección' : 'Nueva Colección'}</Text>
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
              <Text style={styles.label}>Nombre de la Marca/Colección</Text>
              <TextInput style={styles.input} value={formNombre} onChangeText={setFormNombre} placeholder="Ej. Masglo" />
              
              <Text style={styles.label}>Asignar a Tienda</Text>
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
  container: { flex: 1, backgroundColor: '#000' }, 
  headerDark: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 15, backgroundColor: '#000' },
  tituloDark: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginLeft: 5 },
  iconBtnHeader: { marginLeft: 15 },
  selectorSedeContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#eee', gap: 6 },
  btnSedeTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 6, backgroundColor: '#e9ecef' },
  btnSedeTabActivo: { backgroundColor: '#111' },
  textSedeTab: { fontSize: 12, fontWeight: 'bold', color: '#555' },
  textSedeTabActivo: { color: '#fff' },
  searchContainer: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 10, height: 40 },
  searchInputColeccion: { flex: 1, fontSize: 16, color: '#333'  },
  itemList: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  imagenListSquar: { width: 45, height: 45, borderRadius: 6, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#eee' },
  infoList: { marginLeft: 15, flex: 1 },
  nombreListTitle: { fontSize: 16, fontWeight: '600', color: '#111', marginBottom: 2 },
  subtitleList: { fontSize: 13, color: '#888' },
  separador: { height: 1, backgroundColor: '#eee', marginLeft: 76 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 10, backgroundColor: '#fff' },
  detalleHero: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  detalleImagenBig: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover', marginBottom: 15 },
  detalleTitulo: { fontSize: 28, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  detalleSeccionArticulos: { padding: 16 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  tituloSeccion: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  textoGris: { fontSize: 14, color: '#888', marginBottom: 15 },
  scrollProductos: { flexDirection: 'row' },
  productoCardMini: { width: 110, marginRight: 15 },
  productoImgMini: { width: 110, height: 110, borderRadius: 10, backgroundColor: '#f4f4f4', marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  productoNombreMini: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4 },
  productoVariantesMini: { fontSize: 12, color: '#888' },
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