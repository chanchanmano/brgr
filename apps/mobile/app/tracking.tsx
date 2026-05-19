import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { BORDER, BistroBackground, FoodTile, GlassCircleButton } from "../components/BistroPrimitives";
import { BackIcon } from "../components/Icons";
import { PennyHeaderButton } from "../components/PennyHeaderButton";
import { MENU } from "../data/menu";
import { useOrderSync } from "../hooks/useOrderSync";
import { useCartStore } from "../store/cartStore";
import { useOrderStore } from "../store/orderStore";
import type { PlacedOrderLine } from "../types/order";

const TAX_RATE = 0.08;
const DELIVERY_FEE = 2.5;
const TIP_RATE = 0.15;

function fallbackOrderLine(line: { itemId: string; qty: number; note?: string }): PlacedOrderLine | null {
  const item = MENU.find((entry) => entry.id === line.itemId);
  if (!item) return null;

  return {
    itemId: line.itemId,
    qty: line.qty,
    note: line.note,
    name: item.name,
    unitPrice: item.price,
    lineTotal: item.price * line.qty,
    kcal: item.kcal
  };
}

function TotalRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.detailTotalRow}>
      <Text style={[styles.detailTotalLabel, bold && styles.detailTotalLabelBold]}>{label}</Text>
      <Text style={[styles.detailTotalValue, bold && styles.detailTotalValueBold]}>{value}</Text>
    </View>
  );
}

export default function TrackingScreen() {
  const router = useRouter();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const cartLines = useCartStore((state) => state.lines);
  const currentOrder = useOrderStore((state) => state.currentOrder);

  // Poll backend every 3s for status updates (CLI fulfill endpoint, etc.)
  useOrderSync();

  const isFulfilled = currentOrder?.status === "fulfilled";

  const fallbackLines = useMemo(
    () => cartLines.map(fallbackOrderLine).filter((line): line is PlacedOrderLine => Boolean(line)),
    [cartLines]
  );
  const orderLines = currentOrder?.lines.length ? currentOrder.lines : fallbackLines;
  const subtotal = currentOrder?.subtotal ?? orderLines.reduce((sum, line) => sum + line.lineTotal, 0);
  const taxes = currentOrder?.taxes ?? subtotal * TAX_RATE;
  const deliveryFee = currentOrder?.deliveryFee ?? DELIVERY_FEE;
  const tipRate = currentOrder?.tipRate ?? TIP_RATE;
  const tip = currentOrder?.tip ?? subtotal * tipRate;
  const total = currentOrder?.total ?? subtotal + taxes + deliveryFee + tip;
  const orderId = currentOrder?.id ?? "2814";

  const detailedLines = useMemo(
    () =>
      orderLines
        .map((line) => ({
          line,
          item: MENU.find((entry) => entry.id === line.itemId)
        }))
        .filter((entry): entry is { line: PlacedOrderLine; item: (typeof MENU)[number] } => Boolean(entry.item)),
    [orderLines]
  );

  const summaryItems = detailedLines.map(({ item }) => item).slice(0, 4);

  const steps = isFulfilled
    ? [
        { label: "Received", done: true },
        { label: "In the kitchen", done: true },
        { label: "Out for delivery", done: true },
        { label: "Delivered", done: true, current: true }
      ]
    : [
        { label: "Received", done: true },
        { label: "In the kitchen", done: true, current: true },
        { label: "Out for delivery", done: false },
        { label: "Delivered", done: false }
      ];

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <BistroBackground flat>
        <View style={{ flex: 1 }}>
          <View style={styles.topRow}>
            <GlassCircleButton onPress={() => router.replace("/(tabs)")}>
              <BackIcon />
            </GlassCircleButton>
            <Text style={styles.orderId}>ORDER #{orderId}</Text>
            <PennyHeaderButton onPress={() => router.replace("/(tabs)")} size={38} />
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.etaCard}>
              <Text style={styles.etaKicker}>Arrives by</Text>
              <View style={styles.etaRow}>
                <Text style={styles.etaTime}>7:42</Text>
                <Text style={styles.etaSuffix}>pm</Text>
              </View>
              <Text style={styles.etaMeta}>About <Text style={styles.etaMetaBold}>12 minutes</Text> · on schedule</Text>
            </View>

            <View style={styles.statusCard}>
              <View style={styles.statusIconWrap}>
                <View style={styles.statusIconCenter} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.statusTitle}>{isFulfilled ? "Delivered — enjoy!" : "Flipping your patties"}</Text>
                <Text style={styles.statusBody}>
                  {isFulfilled
                    ? "Your order is at the door. Tap below to start a new one."
                    : "The kitchen has your order and is moving."}
                </Text>
              </View>
            </View>

            <View style={styles.timelineWrap}>
              <View style={styles.timelineRail} />
              <View style={styles.timelineRailActive} />
              {steps.map((step, index) => (
                <View key={step.label} style={styles.timelineRow}>
                  <View style={[styles.timelineDot, step.done && styles.timelineDotDone]}>
                    {step.current ? <View style={styles.timelineDotCurrent} /> : null}
                  </View>
                  <Text style={[styles.timelineLabel, step.done ? styles.timelineLabelDone : styles.timelineLabelIdle]}>{step.label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryHead}>
                <Text style={styles.summaryKicker}>Your order</Text>
                <Pressable onPress={() => setDetailsOpen((current) => !current)}>
                  <Text style={styles.summaryLink}>{detailsOpen ? "Hide details" : "View details"}</Text>
                </Pressable>
              </View>
              <View style={styles.summaryTiles}>
                {summaryItems.map((item) => (
                  <FoodTile key={item.id} item={item} size={50} radius={12} />
                ))}
              </View>
              {detailsOpen ? (
                <View style={styles.detailsPanel}>
                  {detailedLines.length ? (
                    <>
                      <View style={styles.detailLines}>
                        {detailedLines.map(({ line, item }) => (
                          <View key={`${line.itemId}-${line.note ?? "plain"}`} style={styles.detailLine}>
                            <FoodTile item={item} size={48} radius={12} />
                            <View style={styles.detailLineBody}>
                              <Text style={styles.detailLineTitle}>{line.qty} × {line.name}</Text>
                              {line.note ? <Text style={styles.detailLineNote}>· {line.note}</Text> : null}
                              <Text style={styles.detailLineMeta}>{line.kcal * line.qty} cal</Text>
                            </View>
                            <Text style={styles.detailLinePrice}>${line.lineTotal.toFixed(2)}</Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.detailTotals}>
                        <TotalRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
                        <TotalRow label="Delivery" value={`$${deliveryFee.toFixed(2)}`} />
                        <TotalRow label="Taxes" value={`$${taxes.toFixed(2)}`} />
                        <TotalRow label={`Tip · ${Math.round(tipRate * 100)}%`} value={`$${tip.toFixed(2)}`} />
                        <View style={styles.detailDivider} />
                        <TotalRow label="Paid total" value={`$${total.toFixed(2)}`} bold />
                      </View>

                      <View style={styles.paymentRow}>
                        <Text style={styles.paymentLabel}>Payment</Text>
                        <Text style={styles.paymentValue}>{currentOrder?.paymentLabel ?? "VISA •••• 4242"}</Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.emptyDetails}>No order details are available for this run.</Text>
                  )}
                </View>
              ) : null}
            </View>

            {isFulfilled ? (
              <Pressable
                onPress={() => {
                  // Move the completed order into history before starting fresh.
                  useOrderStore.getState().archiveCurrentOrder();
                  router.replace("/(tabs)");
                }}
                style={styles.newOrderButton}
              >
                <Text style={styles.newOrderButtonText}>Start a new order →</Text>
              </Pressable>
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
    paddingTop: 12
  },
  orderId: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.5,
    color: "#776B5C"
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 130
  },
  etaCard: {
    borderRadius: 28,
    padding: 22,
    backgroundColor: "#FFE5A0"
  },
  etaKicker: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "rgba(26,20,16,0.7)"
  },
  etaRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "baseline"
  },
  etaTime: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 56,
    lineHeight: 56,
    color: "#1A1410"
  },
  etaSuffix: {
    marginLeft: 10,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 18,
    color: "rgba(26,20,16,0.65)"
  },
  etaMeta: {
    marginTop: 6,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: "rgba(26,20,16,0.75)"
  },
  etaMetaBold: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#1A1410"
  },
  statusCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER
  },
  statusIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF4F2B"
  },
  statusIconCenter: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FFFFFF"
  },
  statusTitle: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 16,
    color: "#1A1410"
  },
  statusBody: {
    marginTop: 2,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "#776B5C"
  },
  timelineWrap: {
    marginTop: 24,
    paddingLeft: 28,
    position: "relative",
    gap: 18
  },
  timelineRail: {
    position: "absolute",
    left: 11,
    top: 8,
    bottom: 8,
    width: 2,
    backgroundColor: "rgba(26,20,16,0.14)"
  },
  timelineRailActive: {
    position: "absolute",
    left: 11,
    top: 8,
    width: 2,
    height: 62,
    backgroundColor: "#FF4F2B"
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  timelineDot: {
    position: "absolute",
    left: -28,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "rgba(26,20,16,0.16)"
  },
  timelineDotDone: {
    backgroundColor: "#FF4F2B",
    borderColor: "#FF4F2B"
  },
  timelineDotCurrent: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF"
  },
  timelineLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14
  },
  timelineLabelDone: {
    color: "#1A1410"
  },
  timelineLabelIdle: {
    color: "#776B5C"
  },
  summaryCard: {
    marginTop: 22,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER
  },
  summaryHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12
  },
  summaryKicker: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: "#776B5C"
  },
  summaryLink: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: "#FF4F2B"
  },
  summaryTiles: {
    flexDirection: "row",
    gap: 8
  },
  detailsPanel: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 14
  },
  detailLines: {
    gap: 10
  },
  detailLine: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 10,
    backgroundColor: "#FFF7EA"
  },
  detailLineBody: {
    flex: 1,
    marginLeft: 10
  },
  detailLineTitle: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 15,
    color: "#1A1410"
  },
  detailLineNote: {
    marginTop: 3,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "#FF4F2B"
  },
  detailLineMeta: {
    marginTop: 3,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 11,
    color: "#776B5C"
  },
  detailLinePrice: {
    marginLeft: 10,
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 15,
    color: "#1A1410"
  },
  detailTotals: {
    marginTop: 14,
    gap: 8
  },
  detailTotalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  detailTotalLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: "#776B5C"
  },
  detailTotalLabelBold: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#1A1410"
  },
  detailTotalValue: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: "#1A1410"
  },
  detailTotalValueBold: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 18
  },
  detailDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 2
  },
  paymentRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#1A1410"
  },
  paymentLabel: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.62)"
  },
  paymentValue: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF"
  },
  newOrderButton: {
    marginTop: 22,
    paddingVertical: 16,
    borderRadius: 999,
    alignItems: "center",
    backgroundColor: "#FF4F2B",
    shadowColor: "#FF4F2B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 22
  },
  newOrderButtonText: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 15,
    color: "#FFFFFF"
  },
  emptyDetails: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: "#776B5C"
  }
});
