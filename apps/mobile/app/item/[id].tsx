import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { BORDER, BistroBackground, FoodHero, GlassCircleButton } from "../../components/BistroPrimitives";
import { BackIcon } from "../../components/Icons";
import { PennyHeaderButton } from "../../components/PennyHeaderButton";
import { MENU } from "../../data/menu";
import { useCartStore } from "../../store/cartStore";

function OptionGroup({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map((option) => {
          const active = option === value;

          return (
            <Pressable key={option} onPress={() => onChange(option)} style={[styles.optionButton, active && styles.optionButtonActive]}>
              <Text style={[styles.optionButtonText, active && styles.optionButtonTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Pressable onPress={() => onChange(!value)} style={[styles.toggleTrack, value && styles.toggleTrackActive]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
      </Pressable>
    </View>
  );
}

export default function ItemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const add = useCartStore((state) => state.add);

  const itemId = Array.isArray(params.id) ? params.id[0] : params.id;
  const item = useMemo(() => MENU.find((entry) => entry.id === itemId) ?? MENU[0], [itemId]);

  // Heat slider only makes sense for the spicy chicken sando.
  const supportsHeat = item.id === "spicy";
  const [heat, setHeat] = useState<"mild" | "medium" | "hot">("medium");

  // Holds: one toggle per item in the item's `holdable` list. Toggle "on"
  // (the default) means it's included; toggle "off" means "hold the X".
  const holdables = item.customization?.holdable ?? [];
  const [holds, setHolds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(holdables.map((name) => [name, true]))
  );

  function buildNote() {
    const heldOff = holdables.filter((name) => !holds[name]);
    const notes: string[] = [];
    if (heldOff.length) notes.push(`no ${heldOff.join(", no ")}`);
    if (supportsHeat && heat !== "medium") notes.push(`${heat} heat`);
    return notes.length ? notes.join(" · ") : undefined;
  }

  const hasAnyCustomization = supportsHeat || holdables.length > 0;

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <BistroBackground flat>
        <View style={{ flex: 1 }}>
          <View style={{ position: "relative" }}>
            <FoodHero item={item} height={320} />
            <View style={styles.heroActions}>
              <GlassCircleButton onPress={() => router.back()}>
                <BackIcon />
              </GlassCircleButton>
              <PennyHeaderButton onPress={() => router.push("/(tabs)")} size={42} />
            </View>
          </View>

          <ScrollView style={styles.sheet} contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
            {item.tag ? (
              <View style={styles.itemTag}>
                <Text style={styles.itemTagText}>{item.tag} · {item.category}</Text>
              </View>
            ) : null}
            <Text style={styles.itemTitle}>{item.name}</Text>
            <View style={styles.itemPriceRow}>
              <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
              <Text style={styles.itemMeta}>· {item.kcal} kcal</Text>
            </View>
            <Text style={styles.itemDesc}>{item.description}</Text>

            {hasAnyCustomization ? (
              <View style={{ marginTop: 20 }}>
                {supportsHeat ? (
                  <OptionGroup
                    label="Heat"
                    value={heat}
                    options={["mild", "medium", "hot"]}
                    onChange={(v) => setHeat(v as "mild" | "medium" | "hot")}
                  />
                ) : null}
                {holdables.length > 0 ? (
                  <View style={{ marginTop: supportsHeat ? 6 : 0 }}>
                    <Text style={styles.optionLabel}>Hold any of these?</Text>
                    {holdables.map((name) => (
                      <ToggleRow
                        key={name}
                        label={name.charAt(0).toUpperCase() + name.slice(1)}
                        value={holds[name] ?? true}
                        onChange={(v) => setHolds((prev) => ({ ...prev, [name]: v }))}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}
          </ScrollView>

          <Pressable
            onPress={() => {
              add(item.id, 1, buildNote());
              // After adding, send the user back to the menu so they can keep
              // browsing. Use replace so the back-stack doesn't pile up.
              router.replace("/(tabs)/menu");
            }}
            style={styles.addToBasketBanner}
          >
            <Text style={styles.addToBasketLabel}>Add 1 to basket</Text>
            <Text style={styles.addToBasketPrice}>${item.price.toFixed(2)}</Text>
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
  heroActions: {
    position: "absolute",
    top: 14,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sheet: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#FFF1DD",
    paddingHorizontal: 20,
    paddingTop: 22
  },
  itemTag: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#FF4F2B"
  },
  itemTagText: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.2,
    color: "#FFFFFF"
  },
  itemTitle: {
    marginTop: 10,
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 34,
    lineHeight: 36,
    color: "#1A1410"
  },
  itemPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 8
  },
  itemPrice: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 24,
    color: "#FF4F2B"
  },
  itemMeta: {
    marginLeft: 8,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: "#776B5C"
  },
  itemDesc: {
    marginTop: 12,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 15,
    lineHeight: 22,
    color: "#776B5C"
  },
  optionLabel: {
    marginBottom: 8,
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: "#776B5C"
  },
  optionRow: {
    flexDirection: "row",
    gap: 8
  },
  optionButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER
  },
  optionButtonActive: {
    backgroundColor: "#1A1410",
    borderColor: "#1A1410"
  },
  optionButtonText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: "#1A1410"
  },
  optionButtonTextActive: {
    color: "#FFFFFF"
  },
  toggleRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10
  },
  toggleLabel: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: "#1A1410"
  },
  toggleTrack: {
    width: 46,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(26,20,16,0.15)",
    padding: 3,
    justifyContent: "center"
  },
  toggleTrackActive: {
    backgroundColor: "#2C7A4F"
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF"
  },
  toggleThumbActive: {
    marginLeft: 18
  },
  addToBasketBanner: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 16,
    borderRadius: 999,
    backgroundColor: "#FF4F2B",
    shadowColor: "#FF4F2B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.32,
    shadowRadius: 26,
    elevation: 14
  },
  addToBasketLabel: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 16,
    color: "#FFFFFF"
  },
  addToBasketPrice: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 16,
    color: "#FFFFFF"
  }
});
