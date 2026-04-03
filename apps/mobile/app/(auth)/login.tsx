import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) { Alert.alert("Missing info", "Please enter your email and password."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      Alert.alert("Login failed", error.message);
    } else {
      router.replace("/(tabs)/dashboard");
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
        {/* Logo area */}
        <View style={s.logoArea}>
          <View style={s.logoIcon}>
            <Text style={{ fontSize: 36 }}>✈️</Text>
          </View>
          <Text style={s.appName}>Holiday Planner</Text>
          <Text style={s.tagline}>Plan amazing trips together</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <Text style={s.formTitle}>Sign in</Text>

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoCorrect={false}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            placeholder="••••••••"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={s.btnText}>{loading ? "Signing in…" : "Sign in"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.linkBtn} onPress={() => router.push("/(auth)/register")}>
            <Text style={s.linkText}>No account? <Text style={{ color: C.primary }}>Create one</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, paddingTop: 60 },
  logoArea: { alignItems: "center", marginBottom: 40, marginTop: 20 },
  logoIcon: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: C.header,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  appName: { fontSize: 28, fontWeight: "800", color: C.text },
  tagline: { fontSize: 15, color: C.muted, marginTop: 4 },

  form: {
    backgroundColor: C.surface, borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: C.border,
  },
  formTitle: { fontSize: 20, fontWeight: "700", color: C.text, marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "600", color: C.muted, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    padding: 13, fontSize: 16, backgroundColor: C.bg, color: C.text,
  },
  btn: {
    backgroundColor: C.primary, borderRadius: 12, padding: 16,
    alignItems: "center", marginTop: 24,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  linkBtn: { alignItems: "center", marginTop: 16 },
  linkText: { fontSize: 14, color: C.muted },
});
