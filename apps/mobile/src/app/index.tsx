import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-neutral-50">
      <Text className="text-3xl font-semibold text-neutral-950">EVB</Text>
      <Text className="mt-2 text-neutral-600">What to wear today.</Text>
    </View>
  );
}
