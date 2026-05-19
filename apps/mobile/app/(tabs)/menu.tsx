import { useMemo, useState } from "react";
import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { BORDER, BistroBackground, FoodHero, FoodTile, SectionHeader, itemTint } from "../../components/BistroPrimitives";
import { CartFAB } from "../../components/CartFAB";
import { PlusIconShim, SearchBadge } from "../../components/MenuExtras";
import { PennyHeaderButton } from "../../components/PennyHeaderButton";
import { MENU, type MenuItem } from "../../data/menu";
import { useCartStore } from "../../store/cartStore";

const categories = ["All", "Burgers", "Sandwiches", "Sides", "Drinks"] as const;
const featuredIds = ["classic", "spicy"] as const;

function FeaturedCard({ item, onPress }: { item: MenuItem; onPress: () => void }) {
  const cardWidth = Math.min(Dimensions.get("window").width - 110, 230);

  return (
    <Pressable onPress={onPress} style={[styles.featuredCard, { width: cardWidth }]}>
      <View style={{ position: "relative" }}>
        <FoodHero item={item} height={150} />
        {item.tag ? (
          <View style={styles.tagBadge}>
            <Text style={styles.tagBadgeText}>{item.tag}</Text>
          </View>
        ) : null}
        <View style={styles.plusBubble}>
          <PlusIconShim />
        </View>
      </View>
      <View style={styles.featuredBody}>
        <Text style={styles.featuredTitle}>{item.name}</Text>
        <View style={styles.featuredMetaRow}>
          <Text style={styles.featuredMeta}>{item.kcal} kcal · {item.category}</Text>
          <Text style={styles.featuredPrice}>${item.price.toFixed(2)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function MenuRow({
  item,
  qtyInCart,
  onPress
}: {
  item: MenuItem;
  qtyInCart: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuRowTap}>
        <FoodTile item={item} size={74} radius={18} />
        <View style={styles.menuRowBody}>
          <Text style={styles.menuRowTitle}>{item.name}</Text>
          <Text style={styles.menuRowDesc} numberOfLines={1}>
            {item.description}
          </Text>
          <View style={styles.menuRowMeta}>
            <Text style={styles.menuRowPrice}>${item.price.toFixed(2)}</Text>
            {item.tag ? (
              <View style={[styles.inlineTag, { backgroundColor: itemTint(item) }]}>
                <Text style={styles.inlineTagText}>{item.tag}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      {/* + button is now just a visual affordance — both row tap AND plus
          navigate to item detail. No inline cart mutations from the menu. */}
      <View style={styles.rowPlusButton}>
        <PlusIconShim />
        {qtyInCart > 0 ? (
          <View style={styles.rowQtyBadge}>
            <Text style={styles.rowQtyBadgeText}>{qtyInCart}</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function MenuScreen() {
  const router = useRouter();
  const lines = useCartStore((state) => state.lines);
  const cartCount = lines.reduce((sum, line) => sum + line.qty, 0);
  const qtyById = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of lines) map.set(line.itemId, (map.get(line.itemId) ?? 0) + line.qty);
    return map;
  }, [lines]);
  const [category, setCategory] = useState<(typeof categories)[number]>("All");

  const featured = useMemo(() => MENU.filter((item) => featuredIds.includes(item.id as (typeof featuredIds)[number])), []);

  // When "All" is selected, group items by category so the menu reads as
  // distinct sections (Burgers → Sandwiches → Sides → Drinks). When a single
  // category is selected, just show that one section.
  const sections = useMemo<{ title: string; items: MenuItem[] }[]>(() => {
    if (category !== "All") {
      return [{ title: category, items: MENU.filter((item) => item.category === category) }];
    }
    const order: MenuItem["category"][] = ["Burgers", "Sandwiches", "Sides", "Drinks"];
    return order
      .map((cat) => ({ title: cat, items: MENU.filter((item) => item.category === cat) }))
      .filter((section) => section.items.length > 0);
  }, [category]);

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <BistroBackground flat>
        <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroRow}>
            <View>
              <Text style={styles.kicker}>BRGR · downtown</Text>
              <Text style={styles.title}>Menu</Text>
            </View>
            <View style={styles.heroActions}>
              <PennyHeaderButton onPress={() => router.push("/(tabs)")} />
              <SearchBadge />
            </View>
          </View>

          <View style={styles.searchBar}>
            <SearchBadge size="small" />
            <Text style={styles.searchText}>Search the menu…</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryStrip}>
            {categories.map((entry) => {
              const active = entry === category;

              return (
                <Pressable key={entry} onPress={() => setCategory(entry)} style={[styles.categoryPill, active && styles.categoryPillActive]}>
                  <Text style={[styles.categoryPillText, active && styles.categoryPillTextActive]}>{entry}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={{ marginTop: 18 }}>
            <SectionHeader title="Today’s pick" rightLabel="See all →" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredStrip}>
              {featured.map((item) => (
                <FeaturedCard key={item.id} item={item} onPress={() => router.push(`/item/${item.id}` as Href)} />
              ))}
            </ScrollView>
          </View>

          {sections.map((section, idx) => (
            <View key={section.title} style={{ marginTop: idx === 0 ? 20 : 26 }}>
              <SectionHeader title={section.title} />
              <View style={styles.rowsWrap}>
                {section.items.map((item) => {
                  const qty = qtyById.get(item.id) ?? 0;
                  return (
                    <MenuRow
                      key={item.id}
                      item={item}
                      qtyInCart={qty}
                      onPress={() => router.push(`/item/${item.id}` as Href)}
                    />
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <CartFAB itemCount={cartCount} onPress={() => router.push("/(tabs)/cart")} />
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
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 120
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  heroActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  kicker: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#FF4F2B"
  },
  title: {
    marginTop: 6,
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 38,
    lineHeight: 38,
    color: "#1A1410"
  },
  searchBar: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER
  },
  searchText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14,
    color: "#776B5C"
  },
  categoryStrip: {
    paddingTop: 14,
    paddingRight: 24,
    gap: 8
  },
  categoryPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER
  },
  categoryPillActive: {
    backgroundColor: "#1A1410",
    borderColor: "#1A1410"
  },
  categoryPillText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: "#1A1410"
  },
  categoryPillTextActive: {
    color: "#FFFFFF"
  },
  featuredStrip: {
    paddingRight: 24,
    gap: 14
  },
  featuredCard: {
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#1A1410",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16
  },
  featuredBody: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14
  },
  featuredTitle: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 18,
    color: "#1A1410"
  },
  featuredMetaRow: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  featuredMeta: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "#776B5C"
  },
  featuredPrice: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 16,
    color: "#FF4F2B"
  },
  tagBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    borderRadius: 8,
    backgroundColor: "#1A1410",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  tagBadgeText: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.1,
    color: "#FFFFFF"
  },
  plusBubble: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    shadowColor: "#1A1410",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14
  },
  rowsWrap: {
    gap: 12
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: BORDER
  },
  menuRowTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  menuRowBody: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12
  },
  menuRowTitle: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 17,
    color: "#1A1410"
  },
  menuRowDesc: {
    marginTop: 2,
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 12,
    color: "#776B5C"
  },
  menuRowMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6
  },
  menuRowPrice: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 15,
    color: "#1A1410"
  },
  inlineTag: {
    marginLeft: 10,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3
  },
  inlineTagText: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 9,
    letterSpacing: 1,
    color: "#FF4F2B"
  },
  rowPlusButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1DD",
    borderWidth: 1,
    borderColor: BORDER,
    position: "relative"
  },
  rowQtyBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF4F2B",
    borderWidth: 2,
    borderColor: "#FFF1DD"
  },
  rowQtyBadgeText: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 9,
    color: "#FFFFFF"
  }
});
