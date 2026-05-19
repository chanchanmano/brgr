import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { BistroBackground, FloatingChip } from "../components/BistroPrimitives";
import { ArrowRightIcon, SparkIcon } from "../components/Icons";
import { PennyAvatar } from "../components/PennyAvatar";

export default function OnboardingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <BistroBackground>
        <View style={styles.content}>
          <View style={styles.heroStage}>
            <View style={styles.heroChipLeft}>
              <FloatingChip text="“two smash burgers”" rotate={-5} />
            </View>
            <View style={styles.heroChipRight}>
              <FloatingChip text="“no pickles ✓”" backgroundColor="#FFC53D" rotate={3} />
            </View>
            <View style={styles.heroChipBottom}>
              <FloatingChip text="“add fries 🍟”" backgroundColor="#CDE6D8" rotate={-2} />
            </View>

            <View style={styles.heroBubble}>
              <PennyAvatar size={172} />
              <View style={styles.sparkBadge}>
                <SparkIcon color="#FFFFFF" size={18} />
              </View>
            </View>
          </View>

          <View>
            <Text style={styles.kicker}>Meet · Penny</Text>
            <Text style={styles.title}>Hi, I&apos;m Penny.{"\n"}Let&apos;s build something delicious.</Text>
          </View>

          <Pressable onPress={() => router.push("/auth")} style={styles.cta}>
            <Text style={styles.ctaText}>Start with voice</Text>
            <ArrowRightIcon color="#FFFFFF" />
          </Pressable>

          <Pressable onPress={() => router.push("/auth")}>
            <Text style={styles.footer}>
              Already have an account? <Text style={styles.footerStrong}>Sign in</Text>
            </Text>
          </Pressable>
        </View>
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
    paddingTop: 18,
    paddingBottom: 36
  },
  heroStage: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 420
  },
  heroBubble: {
    width: 228,
    height: 228,
    borderRadius: 114,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    shadowColor: "#FF4F2B",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.26,
    shadowRadius: 26
  },
  sparkBadge: {
    position: "absolute",
    top: 12,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2C7A4F"
  },
  heroChipLeft: {
    position: "absolute",
    left: 6,
    top: 94
  },
  heroChipRight: {
    position: "absolute",
    right: 0,
    top: 240
  },
  heroChipBottom: {
    position: "absolute",
    left: 22,
    bottom: 70
  },
  kicker: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#FF4F2B"
  },
  title: {
    marginTop: 10,
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 42,
    lineHeight: 42,
    color: "#1A1410"
  },
  cta: {
    marginTop: 28,
    height: 58,
    borderRadius: 999,
    backgroundColor: "#FF4F2B",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: "#FF4F2B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 22
  },
  ctaText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF"
  },
  footer: {
    marginTop: 14,
    textAlign: "center",
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "#776B5C"
  },
  footerStrong: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#1A1410"
  }
});
