import React from 'react'
import { View, Text, Image, FlatList, StyleSheet, RefreshControl } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { Header } from '../../../../commonComponents'
import { fontSizes, windowHeight, windowWidth } from '../../../../theme/appConstant'
import appColors from '../../../../theme/appColors'
import appFonts from '../../../../theme/appFonts'
import Images from '../../../../utils/images/images'
import { useValues } from '../../../../utils/context'
import styles from './styles'
import { referralData as fetchReferralData } from '../../../../api/store/action/referralAction'
import { AppDispatch } from '../../../../api/store'

export function ReferralList() {
  const dispatch = useDispatch<AppDispatch>()
  const { referralList, loading } = useSelector((state: any) => state.refer)
  const referralDataArray = referralList?.data?.data || []
  const { isDark } = useValues()
  const { translateData } = useSelector((state: any) => state.setting)

  React.useEffect(() => {
    if (referralDataArray.length === 0) {
      dispatch(fetchReferralData())
    }
  }, [])

  const onRefresh = React.useCallback(() => {
    dispatch(fetchReferralData())
  }, [dispatch])


  const renderItem = ({ item }: any) => {
    const referredUser = item?.referred || {}
    const status = item?.status || ''
    const isPending = status === 'pending'
    const statusColor = isPending ? '#FFB400' : '#28A745'
    const bgColor = isPending ? '#FFF7E5' : '#E8F4F1'

    return (
      <View style={[styles.itemContainer, { backgroundColor: isDark ? appColors.bgDark : appColors.white, borderColor: isDark ? appColors.darkborder : appColors.border, }]}>
        {!item?.referred?.profile_image_url ? (
          <View style={styles.userImage1}>
            <Text
              style={[
                styles.nameText,
                { fontSize: fontSizes.FONT5, color: appColors.white },
              ]}
            >
              {referredUser?.name?.charAt(0)?.toUpperCase()}
            </Text>
          </View>
        ) : (
          <Image
            source={{ uri: item?.referred?.profile_image_url }}
            style={styles.userImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.textContainer}>
          <Text style={styles.nameText}>
            {referredUser?.name || translateData.unknownUser}
          </Text>
          {item?.referrer_bonus_amount > 0 && (
            <Text style={styles.amountText}>
              +{item?.referrer_bonus_amount}
            </Text>
          )}{' '}
        </View>

        <View
          style={[
            styles.statusContainer,
            {
              backgroundColor: bgColor,
              paddingHorizontal: windowWidth(5),
              paddingVertical: windowHeight(1),
              borderRadius: windowHeight(7),
            },
          ]}
        >
          <Text style={[styles.statusText, { color: statusColor }]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={{ flex: 1 }}>
      <Header title={translateData.referralsList} />
      <FlatList
        data={referralDataArray}
        keyExtractor={item => item.id?.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            colors={[appColors.primary]}
          />
        }
        contentContainerStyle={{ padding: windowHeight(2) }}

        ItemSeparatorComponent={() => (
          <View style={{ marginVertical: windowHeight(1) }} />
        )}
        ListEmptyComponent={
          <View
            style={{
              alignItems: 'center',
              flex: 1,
              justifyContent: 'center',
              marginTop: windowHeight(11),
            }}
          >
            <Image
              source={isDark ? Images.noReferralDark : Images.noReferrals}
              style={{
                height: windowHeight(45),
                width: windowWidth(85),
                resizeMode: 'contain',
              }}
            />
            <Text
              style={{
                fontFamily: appFonts.bold,
                fontSize: fontSizes.FONT4HALF,
                color: isDark ? appColors.white : appColors.black,
              }}
            >
              {translateData.noReferralList}{' '}
            </Text>
            <Text
              style={{
                fontFamily: appFonts.regular,
                color: appColors.secondaryFont,
                textAlign: 'center',
                marginTop: windowHeight(1.2),
              }}
            >
              {translateData.noReferralDetail}
            </Text>
          </View>
        }
      />
    </View>
  )
}

