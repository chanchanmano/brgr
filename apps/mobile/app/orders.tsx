import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { BORDER, BistroBackground, GlassCircleButton } from "../components/BistroPrimitives";
import { BackIcon } from "../components/Icons";
import { PennyHeaderButton } from "../components/PennyHeaderButton";
import { useOrderStore } from "../store/orderStore";
import type { PlacedOrder } from "../types/order";

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (isToday) return `Today · ${time}`;
  if (isYesterday) return `Yesterday · ${time}`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + ` · ${time}`;
}

function statusLabel(order: PlacedOrder): { text: string; tone: "active" | "done" | "warn" } {
  if (order.status === "fulfilled") return { text: "Delivered", tone: "done" };
  if (order.status === "cancelled") return { text: "Cancelled", tone: "warn" };
  return { text: "In the kitchen", tone: "active" };
}

function OrderCard({
  order,
  onPress,
  pinned = false
}: {
  order: PlacedOrder;
  onPress: () => void;
  pinned?: boolean;
}) {
  const status = statusLabel(order);
  const lineSummary = order.lines.map((l) => `${l.qty}× ${l.name}`).join(", ");

  return (
    <Pressable onPress={onPress} style={[styles.card, pinned && styles.cardPinned]}>
      <View style={styles.cardTopRow}>
        <Text style={styles.cardOrderId}>ORDER #{order.id}</Text>
        <View
          style={[
            styles.statusPill,
            status.tone === "active" && styles.statusActive,
            status.tone === "done" && styles.statusDone,
            status.tone === "warn" && styles.statusWarn
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              status.tone === "active" && styles.statusActiveText,
              status.tone === "done" && styles.statusDoneText,
              status.tone === "warn" && styles.statusWarnText
            ]}
          >
            {status.text}
          </Text>
        </View>
      </View>
      <Text style={styles.cardLines} numberOfLines={2}>
        {lineSummary}
      </Text>
      <View style={styles.cardBottomRow}>
        <Text style={styles.cardMeta}>{formatDate(order.placedAt)}</Text>
        <Text style={styles.cardTotal}>${order.total.toFixed(2)}</Text>
      </View>
    </Pressable>
  );
}

export default function OrdersScreen() {
  const router = useRouter();
  const currentOrder = useOrderStore((state) => state.currentOrder);
  const history = useOrderStore((state) => state.history);

  const past = useMemo(() => history.slice(), [history]);
  const isEmpty = !currentOrder && past.length === 0;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <BistroBackground flat>
        <View style={{ flex: 1 }}>
          <View style={styles.topRow}>
            <GlassCircleButton
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace("/(tabs)");
              }}
            >
              <BackIcon />
            </GlassCircleButton>
            <Text style={styles.topTitle}>Your orders</Text>
            <PennyHeaderButton onPress={() => router.replace("/(tabs)")} size={38} />
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {currentOrder ? (
              <View style={{ marginBottom: 24 }}>
                <Text style={styles.sectionLabel}>QUEUED</Text>
                <OrderCard
                  order={currentOrder}
                  pinned
                  onPress={() => router.push("/tracking")}
                />
              </View>
            ) : null}

            {past.length > 0 ? (
              <View>
                <Text style={styles.sectionLabel}>PREVIOUS</Text>
                <View style={{ gap: 10 }}>
                  {past.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onPress={() => {
                        // Past orders are read-only — no tracking screen for them in this demo.
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {isEmpty ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No orders yet</Text>
                <Text style={styles.emptyBody}>
                  Talk to Penny or browse the menu to place your first one.
                </Text>
                <Pressable onPress={() => router.replace("/(tabs)/menu")} style={styles.emptyCta}>
                  <Text style={styles.emptyCtaText}>Browse menu</Text>
                </Pressable>
              </View>
            ) : null}
          </ScrollView>
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12
  },
  topTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 17,
    color: "#1A1410"
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 60
  },
  sectionLabel: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.6,
    color: "#776B5C",
    marginBottom: 10
  },
  card: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10
  },
  cardPinned: {
    borderColor: "rgba(255,79,43,0.4)",
    borderWidth: 1.5
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cardOrderId: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.4,
    color: "#776B5C"
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  statusPillText: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase"
  },
  statusActive: { backgroundColor: "rgba(255,79,43,0.14)" },
  statusActiveText: { color: "#FF4F2B" },
  statusDone: { backgroundColor: "rgba(44,122,79,0.14)" },
  statusDoneText: { color: "#2C7A4F" },
  statusWarn: { backgroundColor: "rgba(26,20,16,0.08)" },
  statusWarnText: { color: "#776B5C" },
  cardLines: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 15,
    lineHeight: 21,
    color: "#1A1410"
  },
  cardBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  cardMeta: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "#776B5C"
  },
  cardTotal: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 15,
    color: "#1A1410"
  },
  emptyState: {
    paddingTop: 60,
    alignItems: "center",
    gap: 12
  },
  emptyTitle: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 22,
    color: "#1A1410"
  },
  emptyBody: {
    maxWidth: 270,
    textAlign: "center",
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: "#776B5C"
  },
  emptyCta: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#FF4F2B"
  },
  emptyCtaText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF"
  }
});
