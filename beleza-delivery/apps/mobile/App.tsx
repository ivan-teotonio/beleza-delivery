import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Beleza Delivery</Text>
        <Text style={styles.subtitle}>Agendamento a domicílio para beleza e mobilidade.</Text>
        <Text style={styles.text}>Estrutura inicial criada com base na SPEC e no PLAN do projeto.</Text>
      </View>
      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171717',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#232323',
    borderRadius: 18,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f4f4f5',
    marginBottom: 12,
  },
  subtitle: {
    color: '#f5d0fe',
    fontSize: 16,
    marginBottom: 12,
  },
  text: {
    color: '#ddd6fe',
    fontSize: 14,
    lineHeight: 22,
  },
});
