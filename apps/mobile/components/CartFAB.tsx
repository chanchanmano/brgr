import { Pressable, Text, View, type ViewStyle } from "react-native";

import { CartIcon } from "./Icons";

type Props = {
  itemCount: number;
  onPress: () => void;
  style?: ViewStyle;
};

/**
 * Floating cart entry point — tomato disc with a white cart icon and a white
 * badge in the corner holding the item count in black. Hidden when empty.
 */
export function CartFAB({ itemCount, onPress, style }: Props) {
  if (itemCount <= 0) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View basket, ${itemCount} items`}
      hitSlop={12}
      style={[
        {
          position: "absolute",
          bottom: 28,
          right: 22,
          width: 60,
          height: 60,
          borderRadius: 30,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FF4F2B",
          zIndex: 100,
          elevation: 14,
          shadowColor: "#FF4F2B",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.4,
          shadowRadius: 18
        },
        style
      ]}
    >
      <CartIcon color="#FFFFFF" size={26} />
      <View
        style={{
          position: "absolute",
          top: -4,
          right: -4,
          minWidth: 22,
          height: 22,
          paddingHorizontal: 6,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
          borderWidth: 2,
          borderColor: "#FF4F2B"
        }}
      >
        <Text
          style={{
            fontFamily: "IBMPlexMono_600SemiBold",
            fontSize: 11,
            color: "#1A1410"
          }}
        >
          {itemCount}
        </Text>
      </View>
    </Pressable>
  );
}
