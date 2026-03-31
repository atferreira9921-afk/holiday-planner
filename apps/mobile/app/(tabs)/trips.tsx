import { View, Text, StyleSheet } from "react-native";

export default function TripsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Trips — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { color: "#6b7280" },
});
