import React, { memo, useMemo } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { useSelector } from "react-redux";
import styles from "./styles";
import { useValues } from "../../../../../utils/context";
import { useTheme } from "@react-navigation/native";
import appColors from "../../../../../theme/appColors";

export const Selection = memo(({ activeTab, onButtonPress }: any) => {
  const { translateData } = useSelector((state: any) => state.setting);
  const { viewRtlStyle, isDark } = useValues();
  const { colors } = useTheme();

  const inactiveBg = useMemo(
    () => ({ backgroundColor: isDark ? appColors.bgDark : appColors.white }),
    [isDark]
  );

  return (
    <View
      style={[
        styles.selection,
        { flexDirection: viewRtlStyle, backgroundColor: colors.card },
      ]}
    >
      <View style={styles.container}>
        {/* WALLET */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tab,
            styles.leftTab,
            activeTab === "wallet" ? styles.activeTab : inactiveBg,
          ]}
          onPress={() => onButtonPress("wallet")}
        >
          <Text
            style={
              activeTab === "wallet"
                ? styles.activeText
                : styles.inactiveText
            }
          >
            {translateData.totalEarning}
          </Text>
        </TouchableOpacity>

        {/* WITHDRAW */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.tab,
            styles.rightTab,
            activeTab === "withdraw" ? styles.activeTab : inactiveBg,
          ]}
          onPress={() => onButtonPress("withdraw")}
        >
          <Text
            style={
              activeTab === "withdraw"
                ? styles.activeText
                : styles.inactiveText
            }
          >
            {translateData.withdrawHistory}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});
