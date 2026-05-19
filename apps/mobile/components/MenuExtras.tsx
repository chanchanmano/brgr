import { StyleSheet, View } from "react-native";

import { SearchIcon } from "./Icons";

export function PlusIconShim() {
  return (
    <View style={styles.plusWrap}>
      <View style={styles.plusHorizontal} />
      <View style={styles.plusVertical} />
    </View>
  );
}

export function SearchBadge({ size = "large" }: { size?: "large" | "small" }) {
  const large = size === "large";

  return (
    <View style={[styles.searchBadge, large ? styles.searchLarge : styles.searchSmall]}>
      <SearchIcon size={large ? 18 : 16} />
    </View>
  );
}

const styles = StyleSheet.create({
  plusWrap: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  plusHorizontal: {
    position: "absolute",
    width: 12,
    height: 2.2,
    borderRadius: 999,
    backgroundColor: "#1A1410"
  },
  plusVertical: {
    position: "absolute",
    width: 2.2,
    height: 12,
    borderRadius: 999,
    backgroundColor: "#1A1410"
  },
  searchBadge: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(26,20,16,0.08)"
  },
  searchLarge: {
    width: 44,
    height: 44
  },
  searchSmall: {
    width: 28,
    height: 28,
    borderWidth: 0,
    backgroundColor: "transparent"
  }
});
