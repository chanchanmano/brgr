import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { BistroBackground, GlassCircleButton } from "../../components/BistroPrimitives";
import { CartIcon, MenuIcon, MicIcon, OrdersIcon, TranscriptIcon } from "../../components/Icons";
import { PennyAvatar } from "../../components/PennyAvatar";
import { TranscriptModal } from "../../components/TranscriptModal";
import { MENU } from "../../data/menu";
import { createOrder } from "../../lib/api";
import { useBasicPenny } from "../../hooks/useBasicPenny";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";
import { useVoiceRecording } from "../../hooks/useVoiceRecording";
import { useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";
import { useOrderStore } from "../../store/orderStore";
import { useSessionStore } from "../../store/sessionStore";
import type { PennyIntent } from "../../types/order";

const TAX_RATE = 0.08;
const DELIVERY_FEE = 2.5;
const TIP_RATE = 0.15;
const PLURAL_ITEM_NAMES: Record<string, string> = {
  classic: "Classic Smashes",
  double: "Double Stacks",
  spicy: "Spicy Chicken Sandos",
  fish: "Crispy Fish Rolls",
  fries: "Crinkle Fries",
  rings: "Onion Rings",
  shake: "Strawberry Shakes",
  cola: "Cherry Colas"
};

function quantityFirstItemName(itemId: string, itemName: string, qty: number) {
  if (itemId === "fries" || itemId === "rings") {
    const unit = qty === 1 ? "order" : "orders";
    return `${qty} ${unit} of ${itemName}`;
  }

  const name = qty === 1 ? itemName : PLURAL_ITEM_NAMES[itemId] ?? `${itemName}s`;
  return `${qty} ${name}`;
}

export default function VoiceHomeScreen() {
  const router = useRouter();
  const lines = useCartStore((state) => state.lines);
  const clearCart = useCartStore((state) => state.clear);
  const placeOrder = useOrderStore((state) => state.placeOrder);
  const cartCount = lines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = useCartStore((state) => state.total());
  const tipAmount = subtotal * TIP_RATE;
  const amountDue = subtotal > 0 ? subtotal + subtotal * TAX_RATE + DELIVERY_FEE + subtotal * TIP_RATE : 0;
  const { handleSend } = useBasicPenny();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  const tts = useTextToSpeech();
  const [pennyIntent, setPennyIntent] = useState<PennyIntent>("ordering");
  const pendingOutcomeRef = useRef<Extract<PennyIntent, "confirmed" | "cancelled"> | null>(null);

  const orderSummary = lines
    .map((line) => ({
      ...line,
      item: MENU.find((entry) => entry.id === line.itemId)
    }))
    .filter(
      (
        entry
      ): entry is {
        item: (typeof MENU)[number];
        itemId: string;
        note?: string;
        qty: number;
      } => Boolean(entry.item)
    );

  function resetToStateZero() {
    clearCart();
    useSessionStore.getState().clearChat();
    setPennyIntent("ordering");
    pendingOutcomeRef.current = null;
    conversationActiveRef.current = false;
    lastSpokenReplyRef.current = null;
    tts.stop();
    voice.cancel();
  }

  const voice = useVoiceRecording({
    onTranscript: async (text) => {
      const { reply, intent = "ordering" } = await handleSend(text, { intent: pennyIntent });
      setPennyIntent(intent);
      pendingOutcomeRef.current =
        intent === "confirmed" || intent === "cancelled" ? intent : null;
      conversationActiveRef.current = intent !== "confirmed" && intent !== "cancelled";
      return reply;
    }
  });

  const [transcriptOpen, setTranscriptOpen] = useState(false);
  // True when we're in a back-and-forth — controls whether mic auto-restarts after Penny.
  const conversationActiveRef = useRef(false);

  // Ref-gated so the effect fires EXACTLY ONCE per unique Penny reply.
  // Without this, `tts` and `voice` are new objects each render, the effect
  // re-fires forever, and msedge-tts gets hammered into 500s.
  const lastSpokenReplyRef = useRef<string | null>(null);
  const longPressCancelledRef = useRef(false);

  useEffect(() => {
    if (voice.status !== "done" || !voice.reply) return;
    if (lastSpokenReplyRef.current === voice.reply) return;

    lastSpokenReplyRef.current = voice.reply;
    tts.speak(voice.reply, {
      onComplete: () => {
        if (pendingOutcomeRef.current === "confirmed") {
          const order = placeOrder(useCartStore.getState().lines);
          if (order) {
            createOrder(order).catch(() => {});
            // Clear the cart — the items have moved into the placed order.
            useCartStore.getState().clear();
          }
          pendingOutcomeRef.current = null;
          setPennyIntent("ordering");
          lastSpokenReplyRef.current = null;
          voice.reset();
          router.replace("/tracking");
          return;
        }

        if (pendingOutcomeRef.current === "cancelled") {
          resetToStateZero();
          return;
        }

        if (!conversationActiveRef.current) return;
        // Small breath before reopening the mic so it doesn't feel jumpy
        setTimeout(() => {
          if (!conversationActiveRef.current) return;
          voice.reset();
          voice.start();
        }, 400);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `tts` and `voice` are
    // intentionally NOT deps; they're unstable per-render and would cause this
    // effect to re-fire infinitely. The ref gate above prevents stale calls.
  }, [voice.status, voice.reply]);

  // ── Avatar animations: gentle breathing + continuous pulse rings ────────
  const breath = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const ringFade = useRef(new Animated.Value(0)).current;

  // Breathing loop — runs forever
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [breath]);

  // Pulse rings — always running, just faded in/out by isActive
  useEffect(() => {
    const loop1 = Animated.loop(
      Animated.timing(ring1, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true
      })
    );
    const loop2 = Animated.loop(
      Animated.sequence([
        Animated.delay(900),
        Animated.timing(ring2, {
          toValue: 1,
          duration: 1800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true
        })
      ])
    );
    loop1.start();
    loop2.start();
    return () => {
      loop1.stop();
      loop2.stop();
    };
  }, [ring1, ring2]);

  // "done" is included because we're waiting for TTS to actually start producing
  // audio (the engine has ~1–2s of warm-up). Without this, rings flash off
  // between the LLM finishing and audio playing.
  const isActive =
    voice.status === "recording" ||
    voice.status === "transcribing" ||
    voice.status === "thinking" ||
    voice.status === "done" ||
    tts.active;

  // Fade rings in/out smoothly when active state changes
  useEffect(() => {
    Animated.timing(ringFade, {
      toValue: isActive ? 1 : 0,
      duration: 280,
      useNativeDriver: true
    }).start();
  }, [isActive, ringFade]);

  function handleProfileTap() {
    if (!user) return;
    Alert.alert(`Hey, ${user.name}`, user.email, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          conversationActiveRef.current = false;
          pendingOutcomeRef.current = null;
          setPennyIntent("ordering");
          tts.stop();
          voice.cancel();
          signOut();
          router.replace("/onboarding");
        }
      }
    ]);
  }

  function handleMicPress() {
    if (longPressCancelledRef.current) {
      longPressCancelledRef.current = false;
      return;
    }

    if (voice.status === "recording") {
      // Manual stop while recording
      voice.stopAndTranscribe();
      return;
    }
    // Mid-flight bail-out: tapping during transcribe/thinking cancels the
    // current attempt so the user is never stuck waiting on a slow LLM.
    if (voice.status === "transcribing" || voice.status === "thinking") {
      voice.cancel();
      return;
    }

    // Starting a (new) turn — open the conversation loop
    tts.stop();
    voice.reset();
    lastSpokenReplyRef.current = null; // allow the next reply to be spoken
    conversationActiveRef.current = true;
    voice.start();
  }

  function handleMicLongPress() {
    // Long-press ends the conversation: stop everything, no auto-restart
    longPressCancelledRef.current = true;
    conversationActiveRef.current = false;
    pendingOutcomeRef.current = null;
    lastSpokenReplyRef.current = null;
    tts.stop();
    voice.cancel();
  }

  // Status hint shown under the avatar — single source of truth, fixed height.
  // "done" + !speaking is the TTS warm-up window — keep showing "Speaking…" so
  // the label doesn't briefly fall back to the welcome copy while audio spins up.
  let statusLabel = "";
  if (voice.status === "recording") statusLabel = "Listening…";
  else if (voice.status === "transcribing") statusLabel = "Got it…";
  else if (voice.status === "thinking") statusLabel = "Thinking…";
  else if (tts.speaking) statusLabel = "Speaking";
  else if (voice.status === "done" || tts.preparing) statusLabel = "Speaking";
  else if (voice.status === "error" && voice.error) statusLabel = voice.error;
  else if (pennyIntent === "confirming") statusLabel = "Say I confirm, cancel, or tell Penny what else to add";
  else statusLabel = "Welcome to BRGR. Tap the mic to talk to Penny.";

  // Ring color reflects the current active state.
  // Mustard stays through "thinking" and the TTS warm-up. Green only kicks in
  // when actual audio is playing.
  const ringColor =
    voice.status === "recording" ? "#FF4F2B" :
    tts.speaking ? "#2C7A4F" :
    "#FFC53D";

  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  // Ring expands from avatar edge (1.0) outward (1.6) — visible past the halo
  const ring1Scale = ring1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ring1Opacity = Animated.multiply(
    ringFade,
    ring1.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] })
  );
  const ring2Scale = ring2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const ring2Opacity = Animated.multiply(
    ringFade,
    ring2.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] })
  );

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <BistroBackground>
        {/* Top bar */}
        <View style={styles.topRow}>
          <Text style={styles.wordmark}>BRGR · DOWNTOWN</Text>
          <View style={styles.topButtons}>
            <GlassCircleButton onPress={() => setTranscriptOpen(true)}>
              <TranscriptIcon size={16} />
            </GlassCircleButton>
            <GlassCircleButton onPress={() => router.push("/(tabs)/menu")}>
              <MenuIcon size={16} />
            </GlassCircleButton>
            <GlassCircleButton onPress={() => router.push("/orders" as never)}>
              <OrdersIcon size={16} />
            </GlassCircleButton>
            <GlassCircleButton onPress={() => router.push("/(tabs)/cart")}>
              <View>
                <CartIcon size={14} />
                {cartCount > 0 ? (
                  <View style={styles.miniBadge}>
                    <Text style={styles.miniBadgeText}>{cartCount}</Text>
                  </View>
                ) : null}
              </View>
            </GlassCircleButton>
            {user ? (
              <Pressable onPress={handleProfileTap} style={styles.profileButton}>
                <Text style={styles.profileInitial}>{user.name[0]?.toUpperCase() ?? "?"}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Center stage — avatar + status label (fixed-height layout) */}
        <View style={styles.stage}>
          <View style={styles.avatarStack}>
            {/* Pulse rings — always mounted, opacity drives visibility */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                { borderColor: ringColor, opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                { borderColor: ringColor, opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }
              ]}
            />

            {/* Avatar (breathing) */}
            <Animated.View style={[styles.avatarFront, { transform: [{ scale: breathScale }] }]}>
              <View style={styles.avatarHalo}>
                <PennyAvatar size={150} />
              </View>
            </Animated.View>
          </View>

          <View style={styles.statusSlot}>
            <Text
              style={[styles.statusLabel, voice.status === "error" && styles.statusError]}
              numberOfLines={2}
            >
              {statusLabel}
            </Text>
          </View>

          {pennyIntent === "confirming" && orderSummary.length ? (
            <View style={styles.confirmationCard}>
              <View style={styles.confirmationHead}>
                <Text style={styles.confirmationKicker}>FINAL ORDER</Text>
                <View style={styles.confirmationTotalWrap}>
                  <Text style={styles.confirmationTotal}>${amountDue.toFixed(2)}</Text>
                  <Text style={styles.confirmationTip}>
                    Includes {Math.round(TIP_RATE * 100)}% tip · ${tipAmount.toFixed(2)}
                  </Text>
                </View>
              </View>
              <ScrollView
                style={styles.confirmationList}
                contentContainerStyle={styles.confirmationListContent}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {orderSummary.map(({ item, itemId, note, qty }, index) => (
                  <View key={`${itemId}-${note ?? "plain"}-${index}`} style={styles.confirmationRow}>
                    <Text style={styles.confirmationName}>
                      {quantityFirstItemName(itemId, item.name, qty)}
                      {note ? <Text style={styles.confirmationNote}> · {note}</Text> : null}
                    </Text>
                  </View>
                ))}
              </ScrollView>
              <Text style={styles.confirmationHint}>
                Say I confirm to place it, cancel to reset, or keep ordering.
              </Text>
            </View>
          ) : null}

          {voice.status === "error" ? (
            <Pressable onPress={handleMicPress} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Mic button */}
        <View style={styles.bottom}>
          <Pressable
            onPress={handleMicPress}
            onLongPress={handleMicLongPress}
            delayLongPress={500}
            // Always tappable: during transcribe/thinking, a tap cancels the
            // in-flight request and resets to idle. Never stuck.
            style={[
              styles.micFab,
              voice.status === "recording" && styles.micFabActive,
              (voice.status === "transcribing" || voice.status === "thinking") && styles.micFabPending
            ]}
          >
            {voice.status === "recording" ? (
              <View style={styles.micStop} />
            ) : (
              <MicIcon color="#FFFFFF" size={30} />
            )}
          </Pressable>

          {conversationActiveRef.current ? (
            <Text style={styles.hint}>Long-press mic to end the chat</Text>
          ) : (
            <Pressable onPress={() => router.push("/(tabs)/menu")} hitSlop={10}>
              <Text style={styles.hint}>or browse the menu →</Text>
            </Pressable>
          )}
        </View>

        <TranscriptModal visible={transcriptOpen} onClose={() => setTranscriptOpen(false)} />
      </BistroBackground>
    </SafeAreaView>
  );
}

// Avatar size + ring base size are coupled — rings need to start outside the avatar so they're visible.
const AVATAR_SIZE = 150;
const HALO_SIZE = 175;
const RING_BASE_SIZE = 190;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFF1DD"
  },
  topRow: {
    paddingHorizontal: 18,
    paddingTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  wordmark: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.8,
    color: "#FF4F2B"
  },
  topButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  profileButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1410"
  },
  profileInitial: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 14,
    color: "#FFFFFF"
  },
  miniBadge: {
    position: "absolute",
    top: -5,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF4F2B"
  },
  miniBadgeText: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 9,
    color: "#FFFFFF"
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32
  },
  avatarStack: {
    width: 320,
    height: 320,
    alignItems: "center",
    justifyContent: "center",
    position: "relative"
  },
  ring: {
    position: "absolute",
    width: RING_BASE_SIZE,
    height: RING_BASE_SIZE,
    borderRadius: 999,
    borderWidth: 3
  },
  avatarFront: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarHalo: {
    width: HALO_SIZE,
    height: HALO_SIZE,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.55)"
  },
  // Fixed-height slot so changing labels never cause layout shift
  statusSlot: {
    height: 64,
    width: "100%",
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  statusLabel: {
    maxWidth: 300,
    textAlign: "center",
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 22,
    lineHeight: 28,
    color: "#1A1410"
  },
  statusError: {
    fontSize: 16,
    lineHeight: 22,
    color: "#776B5C"
  },
  confirmationCard: {
    width: "100%",
    maxWidth: 320,
    marginTop: 6,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(26,20,16,0.08)"
  },
  confirmationHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  confirmationKicker: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.5,
    color: "#776B5C"
  },
  confirmationTotalWrap: {
    alignItems: "flex-end"
  },
  confirmationTotal: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 20,
    color: "#1A1410"
  },
  confirmationTip: {
    marginTop: 2,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 10,
    color: "#FF4F2B"
  },
  confirmationList: {
    maxHeight: 116,
    marginTop: 12
  },
  confirmationListContent: {
    gap: 10
  },
  confirmationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  confirmationName: {
    flex: 1,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
    color: "#1A1410"
  },
  confirmationNote: {
    fontFamily: "PlusJakartaSans_400Regular",
    color: "#776B5C"
  },
  confirmationQty: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 12,
    color: "#FF4F2B"
  },
  confirmationHint: {
    marginTop: 12,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    lineHeight: 18,
    color: "#776B5C"
  },
  retryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#1A1410"
  },
  retryText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF"
  },
  bottom: {
    alignItems: "center",
    paddingBottom: 36,
    gap: 14
  },
  micFab: {
    width: 84,
    height: 84,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF4F2B",
    shadowColor: "#FF4F2B",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32,
    shadowRadius: 28
  },
  micFabActive: {
    backgroundColor: "#1A1410"
  },
  // While the LLM/STT is doing its thing — keep the button visually subdued
  // but still tappable (a tap cancels the in-flight request).
  micFabPending: {
    opacity: 0.7
  },
  micStop: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: "#FFFFFF"
  },
  hint: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: "#776B5C"
  }
});
