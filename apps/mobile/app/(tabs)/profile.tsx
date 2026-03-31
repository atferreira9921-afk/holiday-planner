import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <TouchableOpacity style={styles.button} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 24 },
  button: { borderWidth: 1, borderColor: "#ef4444", borderRadius: 10, padding: 14, alignItems: "center" },
  buttonText: { color: "#ef4444", fontWeight: "600" },
});
