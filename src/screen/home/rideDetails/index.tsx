import { View, Text, ScrollView, TouchableOpacity, BackHandler } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { useNavigation, useRoute, useTheme } from '@react-navigation/native'
import styles from './styles'
import commanStyle from '../../../style/commanStyles'
import { Payment, Bill } from '../endRide/component'
import { Profile } from './component/profile'
import { Address } from '../../../commonComponents'
import { RateCustomer } from '../rateCustomer'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../../navigation/main/types'
import { useDispatch, useSelector } from 'react-redux'
import { useValues } from '../../../utils/context'
import appColors from '../../../theme/appColors'
import { windowHeight } from '../../../theme/appConstant'
import appFonts from '../../../theme/appFonts'
import BottomSheet from '@gorhom/bottom-sheet'
import { rideDataGet } from '../../../api/store/action'
import { AppDispatch } from '../../../api/store'

type navigation = NativeStackNavigationProp<RootStackParamList>

export function RideDetails() {
  const route = useRoute()
  const ride_Id = route?.params || {}
  const navigation = useNavigation<navigation>()
  const { colors } = useTheme()
  const { isDark } = useValues()
  const { translateData } = useSelector((state: any) => state.setting)
  const [rideData, setRideData] = useState<any>(null)
  const { zoneValue } = useSelector((state: any) => state.zoneUpdate)
  const dispatch = useDispatch<AppDispatch>()


  useEffect(() => {
    fetchRideData()
  }, [])


  const fetchRideData = async () => {
    try {
      if (!ride_Id?.ride_Id) return

      dispatch(rideDataGet(ride_Id?.ride_Id))
        .unwrap()
        .then((res: any) => {
          setRideData(res?.data || res)
        })
        .catch((err: any) => {
          console.error('[RideDetails] Error fetching ride data:', err)
        })
    } catch (error) {
      console.error('[RideDetails] fetchRideData error:', error)
    }
  }
  const bottomSheetRef = useRef<BottomSheet>(null)
  const toggleModal = () => {
    bottomSheetRef?.current?.snapToIndex(0)
  }

  useEffect(() => {
    const handleBackPress = () => {
      navigation.navigate('TabNav')
      return true
    }

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress,
    )
    return () => backHandler.remove()
  }, [navigation])



  const [istrue, setIstrue] = useState<boolean>(true)

  return (
    <ScrollView style={commanStyle.main} showsVerticalScrollIndicator={false}>
      <View
        style={{
          height: windowHeight(9.5),
          backgroundColor: isDark ? appColors.darkThemeSub : appColors.white,
        }}
      >
        <Text style={[styles.activeRide, { color: colors.text }]}>
          {translateData.rideDetails}
        </Text>
      </View>
      <View style={[styles.contain, { backgroundColor: colors.background }]}>
        <Profile userDetails={rideData?.rider} rideDetails={rideData} istrue={istrue} />
        <Address rideDetails={rideData} />
        <View style={styles.spaceTop}>
          {rideData?.payment_status == 'PENDING' ? (
            <Bill pressRefresh={fetchRideData} rideData={rideData} />
          ) : (
            <>
              <Text
                style={{
                  fontFamily: appFonts.medium,
                  marginTop: windowHeight(1.2),
                  marginBottom: windowHeight(0.8),
                  color: isDark ? appColors.white : appColors.black,
                }}
              >
                {translateData.billSummary}
              </Text>
              <View
                style={{
                  backgroundColor: isDark
                    ? appColors.darkThemeSub
                    : appColors.white,
                  padding: windowHeight(1),
                  borderRadius: windowHeight(1),
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginVertical: windowHeight(0.5),
                  }}
                >
                  <Text
                    style={{
                      fontFamily: appFonts.regular,
                      color: isDark ? appColors.white : appColors.black,
                    }}
                  >
                    {translateData.subTotal}
                  </Text>
                  <Text
                    style={{
                      fontFamily: appFonts.regular,
                      color: isDark
                        ? appColors.darkText
                        : appColors.primaryFont,
                    }}
                  >
                    {zoneValue?.currency_symbol}
                    {rideData?.sub_total}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginVertical: windowHeight(0.5),
                  }}
                >
                  <Text
                    style={{
                      fontFamily: appFonts.regular,
                      color: isDark ? appColors.white : appColors.black,
                    }}
                  >
                    {translateData.tax}
                  </Text>
                  <Text
                    style={{
                      fontFamily: appFonts.regular,
                      color: isDark
                        ? appColors.darkText
                        : appColors.primaryFont,
                    }}
                  >
                    {zoneValue?.currency_symbol}
                    {rideData?.tax}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginVertical: windowHeight(0.5),
                  }}
                >
                  <Text
                    style={{
                      fontFamily: appFonts.regular,
                      color: isDark ? appColors.white : appColors.black,
                    }}
                  >
                    {translateData.platformFees}
                  </Text>
                  <Text
                    style={{
                      fontFamily: appFonts.regular,
                      color: isDark
                        ? appColors.darkText
                        : appColors.primaryFont,
                    }}
                  >
                    {zoneValue?.currency_symbol}
                    {rideData?.platform_fees}
                  </Text>
                </View>
                <View
                  style={{
                    borderBottomWidth: 1,
                    borderBottomColor: appColors.border,
                    borderStyle: 'dashed',
                    marginVertical: windowHeight(1),
                  }}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      fontFamily: appFonts.medium,
                      color: isDark ? appColors.white : appColors.black,
                    }}
                  >
                    {translateData.totalBill}
                  </Text>
                  <Text
                    style={{
                      fontFamily: appFonts.bold,
                      color: appColors.primary,
                    }}
                  >
                    {zoneValue?.currency_symbol}
                    {rideData?.total}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
        <Payment rideDetails={rideData} />
      </View>

    </ScrollView >
  )
}
