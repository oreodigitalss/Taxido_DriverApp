import { View, Text, Image } from "react-native";
import React from "react";
import { useValues } from "../../utils/context";
import appColors from "../../theme/appColors";
import { styles } from "./styles";
import Images from "../../utils/images/images";

export function NoInternalServer() {
  const { isDark } = useValues();



  return (
    <View style={styles.mainContainer}>
      <Image source={Images.internalSerivce} style={styles.image} resizeMode="contain" />
      <View style={[styles.mainView]}>
        <Text style={[styles.title, { color: isDark ? appColors.white : appColors.black }]}>Internal Server Error</Text>
        <Text style={[styles.details]}>We’re currently experiencing technical issues. Our team is working to restore service as quickly as possible.</Text>
      </View>
    </View>
  );
}
