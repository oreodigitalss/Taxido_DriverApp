import React, { useCallback } from 'react'
import { Image, Text, View } from 'react-native'
import styles from './styles'
import { useValues } from '../../utils/context'
import appColors from '../../theme/appColors'
import Images from '../../utils/images/images'
import { Button } from '../button'
import { windowHeight } from '../../theme/appConstant'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import { paymentsData } from '../../api/store/action'
import { AppDispatch } from '../../api/store'
import appFonts from '../../theme/appFonts'

export function LowBalance({ setLowBalance, low }: any) {
  const { translateData } = useSelector((state: any) => state.setting)
  const { isDark, viewRtlStyle } = useValues()
  const navigation = useNavigation<any>()
  const { zoneValue } = useSelector((state: any) => state.zoneUpdate)
  const { taxidoSettingData } = useSelector((state: any) => state.setting)
  const dispatch = useDispatch<AppDispatch>()
  useFocusEffect(
    useCallback(() => {
      dispatch(paymentsData())
    }, [dispatch]),
  )

  const colse = () => {
    setLowBalance(false)
  }

  const handeleTopUp = () => {
    setLowBalance(false)
    navigation.navigate('TopUp')
  }

  return (
    <View style={[styles.flex]}>
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? appColors.primaryFont : appColors.white },
        ]}
      >
        <Image
          source={Images.lowBalance}
          style={styles.image}
          tintColor={appColors.primary}
        />
        <Text
          style={[
            styles.title,
            {
              color: isDark ? appColors.white : appColors.black,
              fontFamily: appFonts.medium,
            },
          ]}
        >
          {low
            ? translateData?.lowBalance
            : translateData?.insufficientWalletBalance}
        </Text>
        <Text style={styles.subText}>
          {low
            ? translateData?.balanceNote
            : `A minimum account balance of ${zoneValue?.currency_symbol} ${taxidoSettingData?.cabbooking_values?.wallet?.driver_min_wallet_balance} is required.`}
        </Text>

        <View
          style={{
            flexDirection: viewRtlStyle,
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: windowHeight(2),
          }}
        >
          <View style={{ width: '51%' }}>
            <Button
              title={translateData?.cancel}
              backgroundColor={isDark ? appColors.bgDark : appColors.lightGray}
              onPress={colse}
              color={isDark ? appColors.white : appColors.black}
            />
          </View>
          <View style={{ width: '51%' }}>
            <Button
              title={translateData?.topUp}
              backgroundColor={appColors.primary}
              color={appColors.white}
              onPress={handeleTopUp}
            />
          </View>
        </View>
      </View>
    </View>
  )
}
