import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, TextInput, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ConfiguracionScreen({ cerrarSesion, adminData }: any) {
  const [searchQuery, setSearchQuery] = useState('');

  // Lista de opciones de configuración estilo Shopify
  const seccionesConfig = [
    {
      titulo: 'Configuración de la tienda',
      elementos: [
        { icono: 'storefront-outline', nombre: 'General', ruta: 'General' },
        { icono: 'cube-outline', nombre: 'Inventario y Sucursales', ruta: 'Sucursales' },
        { icono: 'card-outline', nombre: 'Pagos y Facturación', ruta: 'Facturacion' },
        { icono: 'pricetags-outline', nombre: 'Impuestos y aranceles', ruta: 'Impuestos' },
        { icono: 'local-shipping-outline', nombre: 'Envío y entrega', ruta: 'Envio' },
      ]
    },
    {
      titulo: 'Configuración de la app',
      elementos: [
        { icono: 'notifications-outline', nombre: 'Notificaciones automáticas', ruta: 'Notificaciones' },
        { icono: 'people-outline', nombre: 'Usuarios y Permisos', ruta: 'Usuarios' },
        { icono: 'shield-checkmark-outline', nombre: 'Privacidad y seguridad', ruta: 'Seguridad' },
      ]
    }
  ];

  return (
    <View style={styles.container}>
      {/* Header Oscuro estilo Shopify */}
      <View style={styles.headerDark}>
        <Text style={styles.tituloDark}>Configuración</Text>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Barra de Búsqueda */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
            <TextInput 
              style={styles.searchInput}
              placeholder="Buscar en configuración"
              placeholderTextColor="#888"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Info del Admin Conectado */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {adminData?.nombre ? adminData.nombre.charAt(0).toUpperCase() : 'A'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{adminData?.nombre || 'Administrador'}</Text>
            <Text style={styles.userRole}>Splendide Store • Principal</Text>
          </View>
        </View>

        {/* Secciones de Configuración Estilo Lista */}
        {seccionesConfig.map((seccion, index) => (
          <View key={index} style={styles.seccionGrupo}>
            <Text style={styles.sectionHeaderTitle}>{seccion.titulo}</Text>
            <View style={styles.cardLista}>
              {seccion.elementos.map((item, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.itemFila, idx === seccion.elementos.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => {
                    // Aquí puedes agregar la navegación a sub-pantallas si lo requieres
                  }}
                >
                  <Ionicons name={item.icono as any} size={20} color="#555" style={{ marginRight: 15 }} />
                  <Text style={styles.itemTexto}>{item.nombre}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#ccc" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Botón de Cerrar Sesión */}
        <View style={styles.seccionGrupo}>
          <View style={styles.cardLista}>
            <TouchableOpacity style={[styles.itemFila, { borderBottomWidth: 0 }]} onPress={cerrarSesion}>
              <Ionicons name="log-out-outline" size={20} color="#d9534f" style={{ marginRight: 15 }} />
              <Text style={[styles.itemTexto, { color: '#d9534f', fontWeight: '600' }]}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.versionText}>Splendide POS v10.2628.0</Text>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  headerDark: { 
    paddingHorizontal: 16, 
    paddingTop: Platform.OS === 'ios' ? 50 : 20, 
    paddingBottom: 15, 
    backgroundColor: '#000' 
  },
  tituloDark: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  body: { flex: 1, paddingHorizontal: 12 },
  searchContainer: { paddingVertical: 12 },
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#e3e3e8', 
    borderRadius: 10, 
    paddingHorizontal: 12, 
    height: 40 
  },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  userCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    padding: 14, 
    borderRadius: 12, 
    marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2
  },
  userAvatar: { 
    width: 45, 
    height: 45, 
    borderRadius: 22.5, 
    backgroundColor: '#955F71', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  userAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  userName: { fontSize: 16, fontWeight: '600', color: '#111' },
  userRole: { fontSize: 13, color: '#888', marginTop: 2 },
  seccionGrupo: { marginBottom: 20 },
  sectionHeaderTitle: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginLeft: 8, textTransform: 'uppercase' },
  cardLista: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1
  },
  itemFila: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    paddingHorizontal: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f5' 
  },
  itemTexto: { flex: 1, fontSize: 16, color: '#333' },
  versionText: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 10 }
});