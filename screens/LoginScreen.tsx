import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, ActivityIndicator, Platform 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://150.136.39.43/index.php';

const mostrarAlertaSegura = (mensaje: string) => {
  if (Platform.OS === 'web') {
    window.alert(mensaje);
  } else {
    const { Alert } = require('react-native');
    Alert.alert("Aviso", mensaje);
  }
};

export default function LoginScreen({ navigation }: { navigation: any }) {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    if (!email || !password) {
      mostrarAlertaSegura("Por favor ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    try {
      // Mantenemos tu código original con application/json que SÍ funciona con tu servidor
      const res = await axios.post(`${API_BASE_URL}?accion=login`, {
        email: email,
        password: password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      let data = res.data;

      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch (e) {
          mostrarAlertaSegura("Error del servidor: La respuesta no tiene el formato correcto.");
          setLoading(false);
          return;
        }
      }

      if (data.status === 'success') {
        const userData = data.usuario || data.data || data;
        const userId = userData.id || userData.user_id;
        const userRol = userData.rol;

        if (!userId) {
          mostrarAlertaSegura("Fallo al iniciar sesión: El servidor no entregó un ID de usuario.");
          setLoading(false);
          return;
        }

        if (userRol !== 'admin') {
          mostrarAlertaSegura("Acceso Denegado: Solo los administradores pueden entrar al panel.");
          setLoading(false);
          return;
        }

        await AsyncStorage.setItem('userId', userId.toString());
        await AsyncStorage.setItem('userRol', userRol);

        // AQUÍ ESTABA EL ERROR LUEGO DE LOS CAMBIOS:
        // En tu App.tsx principal la ruta ya no es 'PedidosScreen', ahora es 'MainTabs'.
        navigation.replace('MainTabs');
        
      } else {
        mostrarAlertaSegura(data.mensaje || "Credenciales incorrectas.");
      }
    } catch (error: any) {
      console.error("Error de petición:", error);
      mostrarAlertaSegura(
        error.response?.data?.mensaje || 
        "Error de red: No se pudo conectar con el servidor web."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Panel Mayorista</Text>
        <Text style={styles.subtitle}>Inicia sesión para gestionar los pedidos</Text>

        <TextInput
          style={styles.input}
          placeholder="Correo electrónico"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Ingresar</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', justifyContent: 'center', padding: 20 },
  formContainer: { backgroundColor: '#fff', padding: 25, borderRadius: 12, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#111827', textAlign: 'center', marginBottom: 5 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 25 },
  input: { backgroundColor: '#f3f4f6', paddingHorizontal: 15, paddingVertical: 12, borderRadius: 8, marginBottom: 15, fontSize: 15, borderWidth: 1, borderColor: '#e5e7eb' },
  button: { backgroundColor: '#955F71', paddingVertical: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});