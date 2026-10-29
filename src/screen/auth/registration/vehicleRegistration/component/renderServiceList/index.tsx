import React, { useEffect, useRef, useState } from 'react'
import {
  TouchableOpacity,
  Text,
  View,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native'
import { SvgUri } from 'react-native-svg'
import { useTheme } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import appColors from '../../../../../../theme/appColors'
import styles from '../renderVehicleList/styles'
import { serviceDataGet } from '../../../../../../api/store/action/serviceAction'
import { useValues } from '../../../../../../utils/context'
import { AppDispatch } from '../../../../../../api/store'
import Icons from '../../../../../../utils/icons/icons'

export function RenderServiceList({
  selectedItemIndex: propSelectedItemIndex,
  handleItemPress,
  serviceId,
}: any) {
  const { serviceData } = useSelector((state: any) => state.service)
  const dispatch = useDispatch<AppDispatch>()
  const { isDark } = useValues()
  const { colors } = useTheme()

  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(
    propSelectedItemIndex,
  )
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const flatListRef = useRef<FlatList>(null)
  const scrollX = useRef(0)
  const contentWidth = useRef(0)
  const visibleWidth = useRef(0)

  useEffect(() => {
    dispatch(serviceDataGet())
  }, [])

  useEffect(() => {
    if (serviceData?.data?.length && serviceId) {
      const index = serviceData.data.findIndex((i: any) => i.id === serviceId)
      if (index !== -1) {
        setSelectedItemIndex(index)
        flatListRef.current?.scrollToIndex({ index, animated: true })
      }
    } else if (serviceData?.data?.length && selectedItemIndex === null) {
      const firstItem = serviceData.data[0]
      setSelectedItemIndex(0)
      handleItemPress(0, firstItem.slug, firstItem.id, firstItem.name)
    }
  }, [serviceData, serviceId])

  const updateArrows = () => {
    const maxScroll = contentWidth.current - visibleWidth.current
    setShowLeftArrow(scrollX.current > 5)
    setShowRightArrow(scrollX.current < maxScroll - 5)
  }

  const scrollLeft = () => {
    flatListRef.current?.scrollToOffset({
      offset: Math.max(0, scrollX.current - 200),
      animated: true,
    })
  }

  const scrollRight = () => {
    flatListRef.current?.scrollToOffset({
      offset: scrollX.current + 200,
      animated: true,
    })
  }

  const renderItem = ({ item, index }: any) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.listView,
        {
          backgroundColor:
            selectedItemIndex === index
              ? appColors.subPrimary
              : isDark
              ? appColors.primaryFont
              : appColors.white,
          borderColor:
            selectedItemIndex === index
              ? appColors.subPrimary
              : appColors.border,
        },
      ]}
      onPress={() => {
        setSelectedItemIndex(index)
        handleItemPress(index, item.slug, item.id, item.name)
      }}
    >
      <View style={styles.iconAndTextContainer}>
        <SvgUri width={42} height={42} uri={item?.service_icon_url} />
        <Text
          style={[
            styles.serviceTitle,
            {
              color:
                selectedItemIndex === index ? appColors.black : colors.text,
            },
          ]}
        >
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={{ position: 'relative' }}>
      {showLeftArrow && (
        <TouchableOpacity
          onPress={scrollLeft}
          style={[
            styles.arrowButton,
            {
              left: 0,
              backgroundColor: isDark ? appColors.primaryFont : appColors.white,
            },
          ]}
        >
          <Icons.Back color={isDark ? appColors.white : appColors.black} />
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={serviceData?.data || []}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        onLayout={e => {
          visibleWidth.current = e.nativeEvent.layout.width
          updateArrows()
        }}
        onContentSizeChange={w => {
          contentWidth.current = w
          updateArrows()
        }}
        onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
          scrollX.current = e.nativeEvent.contentOffset.x
          updateArrows()
        }}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({
          length: 120,
          offset: 120 * index,
          index,
        })}
      />

      {showRightArrow && (
        <TouchableOpacity
          onPress={scrollRight}
          style={[
            styles.arrowButton,
            {
              right: 0,
              backgroundColor: isDark ? appColors.primaryFont : appColors.white,
              transform: [{ rotate: '180deg' }],
            },
          ]}
        >
          <Icons.Back color={isDark ? appColors.white : appColors.black} />
        </TouchableOpacity>
      )}
    </View>
  )
}
