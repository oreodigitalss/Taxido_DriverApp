import React from 'react'
import styles from './styles'
import { Text, View, Image } from 'react-native'
import { useValues } from '../../utils/context'
import appColors from '../../theme/appColors'
import Images from '../../utils/images/images'
import { useSelector } from 'react-redux'

export function NoInternet() {
  const { isDark, viewRtlStyle } = useValues()
  const { translateData } = useSelector((state: any) => state.setting)

  return (
    <View style={styles.mainContainer}>
      <Image source={Images.noInternet} style={styles.image} />
      <View style={[{ flexDirection: viewRtlStyle }]}>
        <Text
          style={[
            styles.title,
            { color: isDark ? appColors.white : appColors.black },
          ]}
        >
          {translateData.noInternetConnectionText}
        </Text>
      </View>
      <Text style={styles.details}>{translateData.plzzConnectionCheck}</Text>
    </View>
  )
}
