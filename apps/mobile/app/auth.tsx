import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { BORDER, BistroBackground } from "../components/BistroPrimitives";
import { ArrowRightIcon, BackIcon } from "../components/Icons";
import { PennyAvatar } from "../components/PennyAvatar";
import { useAuthStore } from "../store/authStore";

type Mode = "signin" | "signup";

export default function AuthScreen() {
  const router = useRouter();
  const signIn = useAuthStore((state) => state.signIn);

  const [mode, setMode] = useState<Mode>("signup");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignup = mode === "signup";
  const canSubmit = email.includes("@") && (!isSignup || name.trim().length > 0);

  function handleSubmit() {
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);

    // Demo-only auth: no password, no backend call.
    const trimmedEmail = email.trim().toLowerCase();
    const resolvedName = isSignup ? name.trim() : trimmedEmail.split("@")[0];

    setTimeout(() => {
      signIn({ name: resolvedName, email: trimmedEmail });
      setSubmitting(false);
      router.replace("/(tabs)");
    }, 350);
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <BistroBackground>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.content}>
            <View style={styles.topRow}>
              <Pressable onPress={() => router.back()} style={styles.backButton}>
                <BackIcon />
              </Pressable>
              <Text style={styles.brand}>BRGR · {isSignup ? "JOIN" : "WELCOME BACK"}</Text>
              <View style={{ width: 38 }} />
            </View>

            <View style={styles.heroSection}>
              <PennyAvatar size={84} />
              <Text style={styles.title}>
                {isSignup ? "Let's get you set up." : "Good to see you again."}
              </Text>
              <Text style={styles.subtitle}>
                {isSignup
                  ? "Just a name and email — Penny remembers the rest."
                  : "Sign in to pick up where you left off."}
              </Text>
            </View>

            <View style={styles.form}>
              {isSignup ? (
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Name</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="What should Penny call you?"
                    placeholderTextColor="#A39687"
                    autoCapitalize="words"
                    autoCorrect={false}
                    style={styles.input}
                  />
                </View>
              ) : null}

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Email</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@brgr.com"
                  placeholderTextColor="#A39687"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.input}
                />
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit || submitting}
                style={[styles.cta, (!canSubmit || submitting) && styles.ctaDisabled]}
              >
                <Text style={styles.ctaText}>
                  {submitting ? "One sec…" : isSignup ? "Create account" : "Sign in"}
                </Text>
                {!submitting ? <ArrowRightIcon color="#FFFFFF" size={18} /> : null}
              </Pressable>

              <Text style={styles.disclaimer}>
                Demo auth — no password needed. Your session lives on this device only.
              </Text>
            </View>

            <Pressable
              onPress={() => {
                setMode(isSignup ? "signin" : "signup");
                setError(null);
              }}
              style={styles.modeToggle}
            >
              <Text style={styles.modeToggleText}>
                {isSignup ? "Already have an account? " : "New here? "}
                <Text style={styles.modeToggleAccent}>
                  {isSignup ? "Sign in" : "Create account"}
                </Text>
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </BistroBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFF1DD"
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER
  },
  brand: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.8,
    color: "#FF4F2B"
  },
  heroSection: {
    alignItems: "center",
    marginTop: 24,
    marginBottom: 32
  },
  title: {
    marginTop: 18,
    textAlign: "center",
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 28,
    lineHeight: 32,
    color: "#1A1410"
  },
  subtitle: {
    marginTop: 8,
    maxWidth: 280,
    textAlign: "center",
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#776B5C"
  },
  form: {
    gap: 14
  },
  field: {
    gap: 6
  },
  fieldLabel: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#776B5C"
  },
  input: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    color: "#1A1410",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER
  },
  error: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: "#FF4F2B"
  },
  cta: {
    marginTop: 6,
    height: 56,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FF4F2B",
    shadowColor: "#FF4F2B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 22
  },
  ctaDisabled: {
    opacity: 0.55,
    shadowOpacity: 0
  },
  ctaText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF"
  },
  disclaimer: {
    marginTop: 6,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11,
    lineHeight: 16,
    color: "#776B5C",
    textAlign: "center"
  },
  modeToggle: {
    marginTop: "auto",
    alignItems: "center",
    paddingVertical: 8
  },
  modeToggleText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: "#776B5C"
  },
  modeToggleAccent: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#1A1410"
  }
});
