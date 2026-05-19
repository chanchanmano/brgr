import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { BORDER, BistroBackground, FoodTile, GlassCircleButton } from "../../components/BistroPrimitives";
import { BackIcon, ArrowRightIcon } from "../../components/Icons";
import { PennyAvatar } from "../../components/PennyAvatar";
import { PennyHeaderButton } from "../../components/PennyHeaderButton";
import { MENU } from "../../data/menu";
import { createOrder } from "../../lib/api";
import { useCartStore } from "../../store/cartStore";
import { useOrderStore } from "../../store/orderStore";

const TAX_RATE = 0.08;
const DELIVERY_FEE = 2.5;

function TotalRow({ label, value, big = false }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, big && styles.totalLabelBig]}>{label}</Text>
      <Text style={[styles.totalValue, big && styles.totalValueBig]}>{value}</Text>
    </View>
  );
}

export default function CartScreen() {
  const router = useRouter();
  const lines = useCartStore((state) => state.lines);
  const update = useCartStore((state) => state.update);
  const total = useCartStore((state) => state.total());
  const placeOrder = useOrderStore((state) => state.placeOrder);
  const [tip, setTip] = useState(15);

  const detailedLines = useMemo(
    () =>
      lines
        .map((line) => ({
          line,
          item: MENU.find((entry) => entry.id === line.itemId)
        }))
        .filter((entry): entry is { line: (typeof lines)[number]; item: (typeof MENU)[number] } => Boolean(entry.item)),
    [lines]
  );

  const subtotal = total;
  const taxes = subtotal * TAX_RATE;
  const tipAmount = subtotal * (tip / 100);
  const grandTotal = subtotal + taxes + DELIVERY_FEE + tipAmount;

  function handlePlaceOrder() {
    const order = placeOrder(lines, tip / 100);
    if (order) {
      // Fire-and-forget sync to backend so the CLI fulfill endpoint can target it.
      createOrder(order).catch((err) => {
        console.warn("[cart] backend createOrder failed (offline?)", err);
      });
      // Clear the cart — once an order is placed, those items "moved" into the
      // placed order. Same behaviour as Uber Eats / DoorDash.
      useCartStore.getState().clear();
    }
    router.push("/tracking" as Href);
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <BistroBackground flat>
        <View style={{ flex: 1 }}>
          <View style={styles.topRow}>
            <GlassCircleButton
              onPress={() => {
                // Pop the stack to wherever they came from (usually menu).
                // Fall back to menu if cart was somehow the entry screen.
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace("/(tabs)/menu");
                }
              }}
            >
              <BackIcon />
            </GlassCircleButton>
            <Text style={styles.topTitle}>Your order</Text>
            <PennyHeaderButton onPress={() => router.push("/(tabs)")} size={38} />
          </View>

          {detailedLines.length ? (
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
              <Text style={styles.heroTitle}>Almost ready.</Text>
              <Text style={styles.heroSub}>18–22 min · BRGR Downtown</Text>

              <View style={styles.lineItems}>
                {detailedLines.map(({ item, line }) => (
                  <View key={line.itemId} style={styles.lineCard}>
                    <FoodTile item={item} size={58} radius={14} />
                    <View style={styles.lineBody}>
                      <View style={styles.lineHead}>
                        <Text style={styles.lineTitle}>{line.qty} × {item.name}</Text>
                        <Text style={styles.linePrice}>${(item.price * line.qty).toFixed(2)}</Text>
                      </View>
                      {line.note ? <Text style={styles.lineNote}>· {line.note}</Text> : null}
                      <View style={styles.stepperRow}>
                        <View style={styles.stepper}>
                          <Pressable onPress={() => update(line.itemId, line.qty - 1)} style={styles.stepperButton}>
                            <Text style={styles.stepperButtonText}>−</Text>
                          </Pressable>
                          <Text style={styles.stepperQty}>{line.qty}</Text>
                          <Pressable onPress={() => update(line.itemId, line.qty + 1)} style={[styles.stepperButton, styles.stepperButtonPrimary]}>
                            <Text style={[styles.stepperButtonText, styles.stepperButtonTextPrimary]}>+</Text>
                          </Pressable>
                        </View>
                        <Pressable onPress={() => update(line.itemId, 0)}>
                          <Text style={styles.removeText}>Remove</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <View style={{ marginTop: 22 }}>
                <Text style={styles.sectionTitle}>Tip the kitchen</Text>
                <View style={styles.tipRow}>
                  {[0, 10, 15, 20].map((value) => {
                    const active = tip === value;

                    return (
                      <Pressable key={value} onPress={() => setTip(value)} style={[styles.tipPill, active && styles.tipPillActive]}>
                        <Text style={[styles.tipPillText, active && styles.tipPillTextActive]}>{value === 0 ? "None" : `${value}%`}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.totalsCard}>
                <TotalRow label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
                <TotalRow label="Delivery" value={`$${DELIVERY_FEE.toFixed(2)}`} />
                <TotalRow label="Taxes" value={`$${taxes.toFixed(2)}`} />
                <TotalRow label={`Tip · ${tip}%`} value={`$${tipAmount.toFixed(2)}`} />
                <View style={styles.totalsDivider} />
                <TotalRow label="Total" value={`$${grandTotal.toFixed(2)}`} big />
              </View>

              <View style={styles.paymentCard}>
                <View style={styles.paymentBadge}>
                  <Text style={styles.paymentBadgeText}>VISA</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.paymentTitle}>•••• 4242</Text>
                  <Text style={styles.paymentSub}>Default · Apple Pay available</Text>
                </View>
                <Pressable>
                  <Text style={styles.paymentLink}>Change</Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyAvatar}>
                <PennyAvatar size={88} />
              </View>
              <Text style={styles.emptyTitle}>Your cart is empty.</Text>
              <Text style={styles.emptyBody}>Tell Penny what you&apos;re craving, or browse the menu and add a few favorites.</Text>
              <Pressable onPress={() => router.push("/(tabs)/menu")} style={styles.emptyButton}>
                <Text style={styles.emptyButtonText}>Browse menu</Text>
              </Pressable>
            </View>
          )}

          {detailedLines.length ? (
            <View style={styles.placeOrderWrap}>
              <Pressable onPress={handlePlaceOrder} style={styles.placeOrderButton}>
                <Text style={styles.placeOrderText}>Place order · ${grandTotal.toFixed(2)}</Text>
                <ArrowRightIcon color="#FFFFFF" size={16} />
              </Pressable>
            </View>
          ) : null}

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
  topTitle: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 17,
    color: "#1A1410"
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 130
  },
  heroTitle: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 34,
    lineHeight: 36,
    color: "#1A1410"
  },
  heroSub: {
    marginTop: 6,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: "#776B5C"
  },
  lineItems: {
    marginTop: 22,
    gap: 10
  },
  lineCard: {
    flexDirection: "row",
    borderRadius: 18,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER
  },
  lineBody: {
    flex: 1,
    marginLeft: 12
  },
  lineHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline"
  },
  lineTitle: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 15,
    color: "#1A1410"
  },
  linePrice: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 15,
    color: "#1A1410"
  },
  lineNote: {
    marginTop: 3,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "#FF4F2B"
  },
  stepperRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: "#FFE6C9"
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  stepperButtonPrimary: {
    backgroundColor: "#FF4F2B"
  },
  stepperButtonText: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 18,
    color: "#1A1410"
  },
  stepperButtonTextPrimary: {
    color: "#FFFFFF"
  },
  stepperQty: {
    minWidth: 20,
    marginHorizontal: 12,
    textAlign: "center",
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 16,
    color: "#1A1410"
  },
  removeText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: "#776B5C"
  },
  sectionTitle: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 22,
    color: "#1A1410"
  },
  tipRow: {
    marginTop: 10,
    flexDirection: "row",
    gap: 8
  },
  tipPill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER
  },
  tipPillActive: {
    backgroundColor: "#2C7A4F",
    borderColor: "#2C7A4F"
  },
  tipPillText: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 15,
    color: "#1A1410"
  },
  tipPillTextActive: {
    color: "#FFFFFF"
  },
  totalsCard: {
    marginTop: 22,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5
  },
  totalLabel: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: "#776B5C"
  },
  totalLabelBig: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 16,
    color: "#1A1410"
  },
  totalValue: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 13,
    color: "#1A1410"
  },
  totalValueBig: {
    fontSize: 20
  },
  totalsDivider: {
    height: 1,
    backgroundColor: BORDER,
    marginVertical: 10
  },
  paymentCard: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER
  },
  paymentBadge: {
    width: 42,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1410"
  },
  paymentBadgeText: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.1,
    color: "#FFFFFF"
  },
  paymentTitle: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: "#1A1410"
  },
  paymentSub: {
    marginTop: 2,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "#776B5C"
  },
  paymentLink: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: "#FF4F2B"
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
    paddingBottom: 80
  },
  emptyAvatar: {
    width: 118,
    height: 118,
    borderRadius: 59,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.4)"
  },
  emptyTitle: {
    marginTop: 22,
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 30,
    lineHeight: 32,
    textAlign: "center",
    color: "#1A1410"
  },
  emptyBody: {
    marginTop: 10,
    maxWidth: 280,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    color: "#776B5C"
  },
  emptyButton: {
    marginTop: 20,
    borderRadius: 999,
    paddingHorizontal: 22,
    paddingVertical: 14,
    backgroundColor: "#FF4F2B"
  },
  emptyButtonText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF"
  },
  placeOrderWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 24
  },
  placeOrderButton: {
    height: 56,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF4F2B",
    shadowColor: "#FF4F2B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 22
  },
  placeOrderText: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 16,
    color: "#FFFFFF"
  }
});
