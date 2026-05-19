import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type PennyAvatarProps = {
  size?: number;
};

export function PennyAvatar({ size = 44 }: PennyAvatarProps) {
  return (
    <LinearGradient
      colors={["#FFC53D", "#FF4F2B"]}
      start={{ x: 0.15, y: 0.15 }}
      end={{ x: 0.9, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#FF4F2B",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 16
      }}
    >
      <View
        style={{
          width: size * 0.88,
          height: size * 0.88,
          borderRadius: size,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.08)"
        }}
      >
        <Text style={{ fontSize: size * 0.56, transform: [{ translateY: 1 }] }}>👩‍🍳</Text>
      </View>
    </LinearGradient>
  );
}

