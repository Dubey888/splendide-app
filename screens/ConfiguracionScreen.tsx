import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function ConfiguracionScreen({ cerrarSesion, adminData }: any) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configuración</Text>
      <Text>Hola, {adminData?.nombre}</Text>
      <TouchableOpacity style={styles.button} onPress={cerrarSesion}>
        <Text style={{color: '#fff', fontWeight: 'bold'}}>Cerrar Sesión</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, marginBottom: 20 },
  button: { padding: 15, backgroundColor: '#d9534f', borderRadius: 8, marginTop: 20 }
});