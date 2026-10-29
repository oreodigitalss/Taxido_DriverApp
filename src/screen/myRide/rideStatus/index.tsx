import React, { useEffect, useState, useMemo, memo } from 'react'
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native'
import appColors from '../../../theme/appColors'
import { styles } from './styles'
import RideContainer from '../rideContainer/index'
import { useValues } from '../../../utils/context'
import { useTheme } from '@react-navigation/native'
import { useLoadingContext } from '../../../utils/loadingContext'
import { LoaderStatus } from './loaderStatus'
import { windowHeight } from '../../../theme/appConstant'
export function RideStatus() {
  const { rtl, isDark } = useValues()
  const [selected, setSelected] = useState(0)
  const { colors } = useTheme()
  const [loading, setLoading] = useState(false)
  const loadingContext: any = useLoadingContext()
  const { addressLoaded, setAddressLoaded } = loadingContext || {}
  const rideStatusData = useMemo(
    () => [
      {
        id: 0,
        title: 'Upcoming',
      },
      {
        id: 1,
        title: 'Active',
      },
      {
        id: 2,
        title: 'Past',
      },
    ],
    [],
  )

  useEffect(() => {
    if (!addressLoaded) {
      setLoading(true)
      setLoading(false)
      setAddressLoaded && setAddressLoaded(true)
    }
  }, [addressLoaded, setAddressLoaded])

  const renderItem = useMemo(() => {
    return ({ item }: { item: any }) => (
      <View
        style={{
          backgroundColor: isDark ? appColors.bgDark : appColors.white,
          borderRadius: windowHeight(5),
        }}
      >
        <Pressable
          onPress={() => setSelected(item?.id)}
          style={[
            styles.container,
            {
              backgroundColor:
                item?.id === selected
                  ? appColors.primary
                  : isDark
                    ? appColors.bgDark
                    : appColors.white,
              borderColor: colors.border,
            },
            item?.id === selected ? { borderColor: appColors.primary } : null,
          ]}
        >
          <Text
            style={[
              styles.mediumTextBlack12,
              item?.id === selected
                ? { color: appColors.white }
                : { color: appColors.primary },
            ]}
          >
            {item?.title}
          </Text>
        </Pressable>
      </View>
    )
  }, [selected, isDark, colors, rtl])

  const renderRideComponents = useMemo(() => {
    switch (selected) {
      case 0:
        return <RideContainer status={'schedule'} />
      case 1:
        return <RideContainer status={'accepted'} />
      case 2:
        return <RideContainer status={'past'} />
      default:
        return <RideContainer status={'schedule'} />
    }
  }, [selected])

  return (
    <View
      style={{
        backgroundColor: isDark ? colors.background : appColors.graybackground,
        flex: 1,
      }}
    >
      {loading ? (
        <LoaderStatus />
      ) : (
        <View
          style={[
            styles.listContainer,
            { backgroundColor: isDark ? appColors.bgDark : appColors.white },
          ]}
        >
          <FlatList
            showsHorizontalScrollIndicator={false}
            horizontal
            renderItem={renderItem}
            data={rideStatusData}
            inverted={rtl}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            contentContainerStyle={{
              justifyContent: 'space-between',
              width: '100%',
            }}
            keyExtractor={item => item?.id.toString()}
          />
        </View>
      )}

      <View style={{ flex: 1 }}>{renderRideComponents}</View>
    </View>
  )
}

export default memo(RideStatus)
