import { Pressable, StyleSheet, type ViewStyle } from "react-native";

import { PennyAvatar } from "./PennyAvatar";

type Props = {
  onPress: () => void;
  size?: number;
  style?: ViewStyle;
};

/**
 * Header-area button that takes the user back to Penny mode.
 * Visually identical to the PennyAvatar (gradient disc + chef emoji)
 * so users recognize "tap that = talk to Penny" everywhere.
 */
export function PennyHeaderButton({ onPress, size = 44, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Talk to Penny"
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <PennyAvatar size={size} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center"
  },
  pressed: {
    transform: [{ scale: 0.94 }]
  }
});
