import { useState, type PropsWithChildren, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { CATEGORY_ACCENTS, type MenuItem } from "../data/menu";

// Per-item tint that the FoodTile / FoodHero fall back to when no image
// loads. Internal-only; CATEGORY_ACCENTS is the default if an item isn't here.
const ITEM_TINTS: Record<string, string> = {
  classic: "#FFD8C8",
  double: "#FFE5A0",
  bbq: "#FFD8C8",
  mushroom: "#E8E0D0",
  garden: "#CDE6D8",
  spicy: "#FFD8C8",
  fish: "#CDE6D8",
  fries: "#FFE5A0",
  rings: "#FFE5A0",
  tots: "#FFE5A0",
  slaw: "#CDE6D8",
  shake: "#FFD3DC",
  cola: "#FFD8C8",
  malt: "#E5D4C8",
  lemonade: "#FFF4B8",
  coffee: "#D7C0A8"
};

const GLASS_SOFT = "rgba(255,255,255,0.62)";
export const BORDER = "rgba(26,20,16,0.08)";

export function itemTint(item: MenuItem) {
  return ITEM_TINTS[item.id] ?? CATEGORY_ACCENTS[item.category];
}

export function BistroBackground({ children, flat = false }: PropsWithChildren<{ flat?: boolean }>) {
  const colors: readonly [string, string] = flat ? ["#FFF6EB", "#FFF1DD"] : ["#FFF9F0", "#FFF1DD"];

  return (
    <LinearGradient colors={colors} style={styles.background}>
      {/* Decorative colored blobs are only shown on Penny mode (voice home /
          onboarding). On browse screens (flat=true), they'd just clutter the
          content with overlapping circles. */}
      {!flat ? (
        <>
          <View style={[styles.blob, styles.blobOne]} />
          <View style={[styles.blob, styles.blobTwo]} />
          <View style={[styles.blob, styles.blobThree]} />
          <View style={[styles.blob, styles.blobFour]} />
        </>
      ) : null}
      {children}
    </LinearGradient>
  );
}

export function GlassCircleButton({
  children,
  onPress,
  style
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.glassCircleButton, style]}>
      {children}
    </Pressable>
  );
}

export function FloatingChip({
  text,
  backgroundColor = "#FFFFFF",
  textColor = "#1A1410",
  rotate = -3
}: {
  text: string;
  backgroundColor?: string;
  textColor?: string;
  rotate?: number;
}) {
  return (
    <View
      style={[
        styles.floatingChip,
        {
          backgroundColor,
          transform: [{ rotate: `${rotate}deg` }]
        }
      ]}
    >
      <Text style={[styles.floatingChipText, { color: textColor }]}>{text}</Text>
    </View>
  );
}

export function FoodTile({
  item,
  size = 88,
  radius = 22,
  showId = false
}: {
  item: MenuItem;
  size?: number;
  radius?: number;
  showId?: boolean;
}) {
  const stampInset = Math.max(12, size * 0.16);
  // If image load errors, fall back to the abstract pattern by hiding the Image layer.
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.image) && !imageFailed;

  return (
    <View
      style={[
        styles.foodTile,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: itemTint(item)
        }
      ]}
    >
      {/* Always-mounted fallback layer */}
      <View style={styles.foodTileDotOverlay} />
      <View style={[styles.foodStampWrap, { top: stampInset, bottom: stampInset - 2, left: stampInset, right: stampInset }]}>
        <View style={[styles.foodStampBar, { flex: 1.1 }]} />
        <View style={[styles.foodStampBar, styles.foodStampCenter, { flex: 0.68 }]} />
        <View style={[styles.foodStampBar, { flex: 1 }]} />
      </View>
      {/* Overlay network image on top — if it loads it covers the fallback */}
      {showImage ? (
        <Image
          source={{ uri: item.image! }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : null}
      {showId ? (
        <Text style={styles.foodTileLabel} numberOfLines={1}>
          {item.id}.jpg
        </Text>
      ) : null}
    </View>
  );
}

export function FoodHero({ item, height = 220 }: { item: MenuItem; height?: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(item.image) && !imageFailed;

  return (
    <LinearGradient colors={[itemTint(item), "#FFF5E7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ height, overflow: "hidden" }}>
      <View
        style={[
          styles.foodHeroCircle,
          {
            width: height * 0.78,
            height: height * 0.78,
            borderRadius: height,
            top: height * 0.1,
            left: "50%",
            marginLeft: -(height * 0.39)
          }
        ]}
      />
      <View
        style={[
          styles.foodHeroStamp,
          {
            width: height * 0.36,
            height: height * 0.36,
            top: height * 0.33,
            left: "50%",
            marginLeft: -(height * 0.18)
          }
        ]}
      >
        <View style={[styles.foodStampBar, { flex: 1.15 }]} />
        <View style={[styles.foodStampBar, styles.foodStampCenter, { flex: 0.62 }]} />
        <View style={[styles.foodStampBar, { flex: 1 }]} />
      </View>
      {showImage ? (
        <Image
          source={{ uri: item.image! }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={styles.foodHeroLabel}>photo · {item.id}.jpg</Text>
      )}
    </LinearGradient>
  );
}

export function SectionHeader({
  kicker,
  title,
  rightLabel,
  onRightPress
}: {
  kicker?: string;
  title: string;
  rightLabel?: string;
  onRightPress?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        {kicker ? <Text style={styles.sectionKicker}>{kicker}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {rightLabel ? (
        <Pressable onPress={onRightPress}>
          <Text style={styles.sectionRight}>{rightLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.56
  },
  blobOne: {
    width: 180,
    height: 180,
    left: -40,
    top: 96,
    backgroundColor: "#FFD8C8"
  },
  blobTwo: {
    width: 220,
    height: 220,
    right: -60,
    top: 48,
    backgroundColor: "#FFE5A0"
  },
  blobThree: {
    width: 150,
    height: 150,
    left: 36,
    bottom: 160,
    backgroundColor: "#CDE6D8"
  },
  blobFour: {
    width: 140,
    height: 140,
    right: 14,
    bottom: 220,
    backgroundColor: "#FFD3DC",
    opacity: 0.32
  },
  glassCircleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GLASS_SOFT,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#1A1410",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14
  },
  floatingChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: BORDER,
    shadowColor: "#1A1410",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18
  },
  floatingChipText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12
  },
  foodTile: {
    overflow: "hidden",
    borderWidth: 1,
    borderColor: BORDER,
    position: "relative"
  },
  foodTileDotOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.2
  },
  foodStampWrap: {
    position: "absolute",
    gap: 4
  },
  foodStampBar: {
    borderRadius: 999,
    backgroundColor: "rgba(26,20,16,0.14)"
  },
  foodStampCenter: {
    marginHorizontal: 8,
    borderRadius: 999
  },
  foodTileLabel: {
    position: "absolute",
    bottom: 6,
    left: 8,
    right: 8,
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "rgba(26,20,16,0.45)",
    textAlign: "center"
  },
  foodHeroCircle: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderWidth: 8,
    borderColor: "rgba(255,255,255,0.92)"
  },
  foodHeroStamp: {
    position: "absolute",
    gap: 6
  },
  foodHeroLabel: {
    position: "absolute",
    left: 16,
    bottom: 12,
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "rgba(26,20,16,0.4)"
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 12
  },
  sectionKicker: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "#776B5C",
    marginBottom: 4
  },
  sectionTitle: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 24,
    lineHeight: 26,
    color: "#1A1410"
  },
  sectionRight: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 13,
    color: "#FF4F2B"
  }
});
