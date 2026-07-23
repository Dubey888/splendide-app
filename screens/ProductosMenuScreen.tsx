import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProductosMenuScreen({ navigation }: any) {
  // Controla qué menú está desplegado (por defecto Productos)
  const [menuExpandido, setMenuExpandido] = useState<string | null>('Productos');

  const toggleMenu = (menu: string) => {
    setMenuExpandido(menuExpandido === menu ? null : menu);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* BOTÓN INICIO */}
        <TouchableOpacity style={styles.menuPrincipal}>
          <Ionicons name="home" size={20} color="#fff" style={styles.iconoMenu} />
          <Text style={styles.textoMenuPrincipal}>Inicio</Text>
        </TouchableOpacity>

        {/* SECCIÓN PEDIDOS */}
        <TouchableOpacity style={styles.menuPrincipal} onPress={() => toggleMenu('Pedidos')}>
          <Ionicons name="receipt" size={20} color="#fff" style={styles.iconoMenu} />
          <Text style={styles.textoMenuPrincipal}>Pedidos</Text>
          <Ionicons 
            name={menuExpandido === 'Pedidos' ? "chevron-up" : "chevron-down"} 
            size={20} color="#888" 
          />
        </TouchableOpacity>
        {menuExpandido === 'Pedidos' && (
          <View style={styles.submenuContainer}>
            <TouchableOpacity style={styles.submenuItem}>
              <Text style={styles.textoSubmenu}>Pedidos preliminares</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submenuItem}>
              <Text style={styles.textoSubmenu}>Pagos abandonados</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* SECCIÓN PRODUCTOS (Desplegada por defecto) */}
        <TouchableOpacity style={styles.menuPrincipal} onPress={() => toggleMenu('Productos')}>
          <Ionicons name="pricetag" size={20} color="#fff" style={styles.iconoMenu} />
          <Text style={styles.textoMenuPrincipal}>Productos</Text>
          <Ionicons 
            name={menuExpandido === 'Productos' ? "chevron-up" : "chevron-down"} 
            size={20} color="#888" 
          />
        </TouchableOpacity>
        
        {menuExpandido === 'Productos' && (
          <View style={styles.submenuContainer}>
            {/* Botón Colecciones - Abre el componente ColeccionesScreen */}
            <TouchableOpacity 
              style={styles.submenuItemActivo} 
              onPress={() => navigation.navigate('ColeccionesScreen')}
            >
              <Text style={styles.textoSubmenuActivo}>Colecciones</Text>
            </TouchableOpacity>

            {/* Botón Inventario - Abre el componente antiguo ProductosScreen */}
            <TouchableOpacity 
              style={styles.submenuItem}
              onPress={() => navigation.navigate('InventarioScreen')}
            >
              <Text style={styles.textoSubmenu}>Inventario</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submenuItem}>
              <Text style={styles.textoSubmenu}>Órdenes de compra</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.submenuItem}>
              <Text style={styles.textoSubmenu}>Transferencias</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submenuItem}>
              <Text style={styles.textoSubmenu}>Tarjetas de regalo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.submenuItem, styles.rowSubmenu]}>
              <Ionicons name="barcode-outline" size={18} color="#ccc" style={{marginRight: 8}}/>
              <Text style={styles.textoSubmenu}>Escanear inventario</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* OTROS MENÚS... */}
        <TouchableOpacity style={styles.menuPrincipal}>
          <Ionicons name="person" size={20} color="#fff" style={styles.iconoMenu} />
          <Text style={styles.textoMenuPrincipal}>Clientes</Text>
          <Ionicons name="chevron-down" size={20} color="#888" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Fondo oscuro Shopify
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  menuPrincipal: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  iconoMenu: {
    marginRight: 12,
  },
  textoMenuPrincipal: {
    flex: 1,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  submenuContainer: {
    paddingLeft: 32, // Indentación para los submenús
    marginBottom: 8,
  },
  submenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  submenuItemActivo: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#333333', // Resalte gris oscuro para la selección activa
    borderRadius: 8,
  },
  textoSubmenu: {
    color: '#cccccc',
    fontSize: 16,
    fontWeight: '500',
  },
  textoSubmenuActivo: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rowSubmenu: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});