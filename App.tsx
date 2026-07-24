import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Importación de pantallas principales
import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import ConfiguracionScreen from './screens/ConfiguracionScreen';
import PedidosScreen from './screens/PedidosScreen';

// Importación de las pantallas de la sección Productos
import ProductosMenuScreen from './screens/ProductosMenuScreen'; 
import ProductosScreen from './screens/ProductosScreen';         
import ColeccionesScreen from './screens/ColeccionesScreen';     

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ProductosStack = createNativeStackNavigator();

// 1. STACK ANIDADO PARA PRODUCTOS
function ProductosStackNavigator() {
  return (
    <ProductosStack.Navigator screenOptions={{ headerShown: false }}>
      <ProductosStack.Screen name="ProductosMenu" component={ProductosMenuScreen} />
      <ProductosStack.Screen name="InventarioScreen" component={ProductosScreen} />
      <ProductosStack.Screen name="ColeccionesScreen" component={ColeccionesScreen} />
    </ProductosStack.Navigator>
  );
}

// 2. MENÚ INFERIOR PRINCIPAL
function MainTabNavigator() {
  return (
    <Tab.Navigator 
      screenOptions={{ 
        tabBarActiveTintColor: '#955F71',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#eee' }
      }}
    >
      <Tab.Screen 
        name="Inicio" 
        component={DashboardScreen} 
        options={{ 
          tabBarIcon: ({color, size}) => <Ionicons name="home" color={color} size={size}/> 
        }} 
      />
      <Tab.Screen 
        name="Pedidos" 
        component={PedidosScreen} 
        options={{ 
          tabBarIcon: ({color, size}) => <Ionicons name="receipt" color={color} size={size}/> 
        }} 
      />
      <Tab.Screen 
        name="Productos" 
        component={ProductosStackNavigator} 
        options={{ 
          tabBarIcon: ({color, size}) => <Ionicons name="pricetag" color={color} size={size}/> 
        }} 
      />
      <Tab.Screen 
        name="Configuracion" 
        component={ConfiguracionScreen} 
        options={{ 
          tabBarIcon: ({color, size}) => <Ionicons name="settings" color={color} size={size}/> 
        }} 
      />
    </Tab.Navigator>
  );
}

// 3. NAVEGADOR RAÍZ CON VERIFICACIÓN DE SESIÓN
export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificarSesionActiva();
  }, []);

  const verificarSesionActiva = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      const userRol = await AsyncStorage.getItem('userRol');

      // Si ya hay un administrador guardado, entra directo a la app
      if (userId && userRol === 'admin') {
        setInitialRoute('MainTabs');
      } else {
        setInitialRoute('LoginScreen');
      }
    } catch (error) {
      console.error("Error al verificar sesión guardada:", error);
      setInitialRoute('LoginScreen');
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de carga mientras lee el almacenamiento local del dispositivo
  if (loading || !initialRoute) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#955F71" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});