import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSessionStore } from "../store/sessionStore";
import { CloseIcon } from "./Icons";
import { PennyAvatar } from "./PennyAvatar";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function TranscriptModal({ visible, onClose }: Props) {
  const messages = useSessionStore((state) => state.messages);
  const clearChat = useSessionStore((state) => state.clearChat);

  // Skip the welcome message (the only one before any real turns)
  const turns = messages.filter((_, i, arr) => !(arr.length === 1 && i === 0));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.root} edges={["top", "left", "right", "bottom"]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>CONVERSATION</Text>
            <Text style={styles.title}>What you and Penny said</Text>
          </View>
          <Pressable onPress={clearChat} style={styles.clearButton}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <CloseIcon />
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          {turns.length === 0 ? (
            <View style={styles.emptyState}>
              <PennyAvatar size={64} />
              <Text style={styles.emptyTitle}>Nothing yet.</Text>
              <Text style={styles.emptyBody}>Hit the mic and have a chat — turns will land here.</Text>
            </View>
          ) : (
            turns.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <View key={msg.id} style={[styles.turn, isUser ? styles.turnRight : styles.turnLeft]}>
                  {!isUser ? (
                    <View style={styles.pennyLabel}>
                      <PennyAvatar size={22} />
                      <Text style={styles.pennyLabelText}>Penny</Text>
                    </View>
                  ) : (
                    <Text style={styles.youLabel}>You</Text>
                  )}
                  <View style={[styles.bubble, isUser ? styles.userBubble : styles.pennyBubble]}>
                    <Text style={[styles.bubbleText, isUser ? styles.userText : styles.pennyText]}>{msg.text}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFF1DD"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(26,20,16,0.06)"
  },
  kicker: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.5,
    color: "#776B5C"
  },
  title: {
    marginTop: 2,
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 20,
    color: "#1A1410"
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  clearText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 12,
    color: "#776B5C"
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF"
  },
  body: {
    flex: 1
  },
  bodyContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12
  },
  emptyTitle: {
    fontFamily: "BricolageGrotesque_700Bold",
    fontSize: 20,
    color: "#1A1410"
  },
  emptyBody: {
    maxWidth: 240,
    textAlign: "center",
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    color: "#776B5C"
  },
  turn: {
    gap: 6
  },
  turnLeft: {
    alignItems: "flex-start"
  },
  turnRight: {
    alignItems: "flex-end"
  },
  youLabel: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.2,
    color: "#776B5C"
  },
  pennyLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  pennyLabelText: {
    fontFamily: "IBMPlexMono_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.2,
    color: "#776B5C"
  },
  bubble: {
    maxWidth: "85%",
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  userBubble: {
    backgroundColor: "#FF4F2B",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 6
  },
  pennyBubble: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(26,20,16,0.08)",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 22
  },
  bubbleText: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 14.5,
    lineHeight: 21
  },
  userText: {
    color: "#FFFFFF"
  },
  pennyText: {
    color: "#1A1410"
  }
});
