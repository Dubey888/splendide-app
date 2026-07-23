import React from 'react';
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
import ProductosMenuScreen from './screens/ProductosMenuScreen'; // [NUEVO] Menú oscuro Shopify
import ProductosScreen from './screens/ProductosScreen';         // Tu lista de inventario actual
import ColeccionesScreen from './screens/ColeccionesScreen';     // La pantalla de colecciones

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ProductosStack = createNativeStackNavigator();

// 1. STACK ANIDADO PARA PRODUCTOS
// Controla el flujo: Menú Shopify -> Inventario / Colecciones
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
      {/* Conectamos la pestaña Productos al Stack Anidado en lugar de la pantalla directa */}
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

// 3. NAVEGADOR RAÍZ
export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="LoginScreen" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}