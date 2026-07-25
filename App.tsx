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
import InventarioScreen from './screens/InventarioScreen'; 

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const ProductosStack = createNativeStackNavigator();

// 1. STACK ANIDADO PARA PRODUCTOS
function ProductosStackNavigator() {
  return (
    <ProductosStack.Navigator initialRouteName="ProductosScreen" screenOptions={{ headerShown: false }}>
      <ProductosStack.Screen name="ProductosScreen" component={ProductosScreen} />
      <ProductosStack.Screen name="ProductosMenu" component={ProductosMenuScreen} />
      <ProductosStack.Screen name="InventarioScreen" component={InventarioScreen} />
      <ProductosStack.Screen name="ColeccionesScreen" component={ColeccionesScreen} />
    </ProductosStack.Navigator>
  );
}

// 2. MENÚ INFERIOR PRINCIPAL (ESTILO SHOPIFY FLOATING PILL)
function MainTabNavigator() {
  return (
    <Tab.Navigator 
      screenOptions={{ 
        tabBarActiveTintColor: '#000', // Shopify usa negro para el icono activo
        tabBarInactiveTintColor: '#8c9196',
        headerShown: false,
        tabBarStyle: { 
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          backgroundColor: '#ffffff',
          borderRadius: 35, // Esto le da el diseño de "píldora" redondeada
          height: 65,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 5,
          borderTopWidth: 0,
        }
      }}
    >
      <Tab.Screen 
        name="Inicio" 
        component={DashboardScreen} 
        options={{ 
          tabBarIcon: ({color, size}) => <Ionicons name="home-outline" color={color} size={26}/> 
        }} 
      />
      
      <Tab.Screen 
        name="Pedidos" 
        component={PedidosScreen} 
        options={{ 
          tabBarIcon: ({color, size}) => <Ionicons name="receipt-outline" color={color} size={26}/> 
        }} 
      />
      
      <Tab.Screen 
        name="Productos" 
        component={ProductosStackNavigator} 
        options={{ 
          // Usamos el icono relleno solo cuando está activo para dar el efecto de selección
          tabBarIcon: ({focused, color}) => <Ionicons name={focused ? "pricetag" : "pricetag-outline"} color={color} size={26}/> 
        }} 
      />

      {/* AQUÍ ESTÁ EL BOTÓN DE MENÚ INTERCALADO (HAMBURGUESA) */}
      <Tab.Screen 
        name="MenuAcciones" 
        component={View} // Componente vacío de relleno
        options={{ 
          tabBarIcon: ({color}) => <Ionicons name="menu" color={color} size={30}/> 
        }} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault(); // Evitamos que intente navegar como un Tab normal
            
            // Le decimos que abra la pantalla 'ProductosMenu' que está dentro del Stack de Productos
            navigation.navigate('Productos', { screen: 'ProductosMenu' });
          },
        })}
      />
      
      <Tab.Screen 
        name="Configuracion" 
        component={ConfiguracionScreen} 
        options={{ 
          tabBarIcon: ({color, size}) => <Ionicons name="person-outline" color={color} size={26}/> 
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

  if (loading || !initialRoute) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#000" />
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