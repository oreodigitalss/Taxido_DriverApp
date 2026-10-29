import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import DropDownPicker from 'react-native-dropdown-picker'
import appColors from '../../../../../../theme/appColors'
import { useTheme } from '@react-navigation/native'
import { useDispatch, useSelector } from 'react-redux'
import { vehicleTypeDataGet } from '../../../../../../api/store/action/vehicleTypeAction'
import { useValues } from '../../../../../../utils/context'
import { fontSizes, windowHeight } from '../../../../../../theme/appConstant'
import styles from './styles'
import { AppDispatch } from '../../../../../../api/store'
import Icons from '../../../../../../utils/icons/icons'

interface RenderItemsProps {
  vehicleIndex?: number
  handleItemPress: (index: number, name: string, itemid?: number) => void
  selectedVehicle: string
  selectedCategory?: string
  serviceId?: any
  categoryId?: number
  selectedItemIndex?: number
  selectedVehicleID?: number
}

export function RenderVehicleList({
  handleItemPress,
  serviceId,
  categoryId,
  selectedVehicle,
  editable
}: RenderItemsProps | any) {
  const { vehicleTypedata } = useSelector((state: any) => state.vehicleType)
  const dispatch = useDispatch<AppDispatch>()
  const { colors } = useTheme()
  const { rtl, isDark, viewRtlStyle } = useValues()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState<string | null>(null)
  const [items, setItems] = useState<any[]>([])
  const { translateData } = useSelector((state: any) => state.setting)
  const [loading, setLoading] = useState<boolean>(true)


  const lastFetchRef = React.useRef<string>("")

  useEffect(() => {
    const fetchKey = `${serviceId}-${categoryId}`
    if (serviceId && fetchKey !== lastFetchRef.current) {
      lastFetchRef.current = fetchKey
      getService()
    }
  }, [serviceId, categoryId])

  useEffect(() => {
    if (
      vehicleTypedata &&
      vehicleTypedata?.data &&
      vehicleTypedata?.data.length > 0
    ) {
      setLoading(false)
      const dropdownItems = vehicleTypedata.data.map((vehicle: any) => ({
        label: vehicle.name,
        value: vehicle.id,
      }))
      setItems(dropdownItems)

      if (selectedVehicle) {
        setValue(selectedVehicle)
      } else if (dropdownItems.length > 0 && value === null) {
        handleValueChange(dropdownItems[0].value)
      }
    }
  }, [vehicleTypedata, value])

  const getService = () => {
    dispatch(
      vehicleTypeDataGet({
        service_id: serviceId,
        service_category_id: categoryId ?? 0,
      }),
    )
  }



  const handleValueChange = (itemValue: any) => {
    setValue(itemValue)
    const selectedItem = vehicleTypedata.data.find(
      (item: any) => item.id === itemValue,
    )
    if (selectedItem) {
      const selectedIndex = vehicleTypedata.data.findIndex(
        (item: any) => item.id === itemValue,
      )
      handleItemPress(selectedIndex, selectedItem.name, selectedItem.id)
    }
  }


  return (
    <View>
      <DropDownPicker
        open={open}
        value={value}
        items={items}
        setOpen={setOpen}
        setValue={setValue}
        setItems={setItems}
        disabled={editable}
        onChangeValue={handleValueChange}
        placeholder={translateData.selectCategory}
        containerStyle={styles.container}
        placeholderStyle={[
          styles.placeholderStyles,
          { color: isDark ? appColors.darkText : appColors.secondaryFont },
        ]}
        style={{
          backgroundColor: isDark ? appColors.darkThemeSub : appColors.white,
          borderColor: open ? appColors.primary : colors.border,
          flexDirection: viewRtlStyle,
          paddingHorizontal: windowHeight(1.9),
        }}
        dropDownContainerStyle={{
          backgroundColor: isDark ? colors.card : appColors.dropDownColor,
          borderColor: open ? appColors.border : colors.border,
          marginTop: 1,
        }}
        textStyle={[styles.text, { color: colors.text }]}
        labelStyle={[
          styles.text,
          { color: isDark ? appColors.white : appColors.black },
        ]}
        listItemLabelStyle={{
          color: isDark ? appColors.white : appColors.black,
        }}
        tickIconStyle={{
          tintColor: isDark ? appColors.white : appColors.black,
        }}
        arrowIconStyle={{
          tintColor: isDark ? appColors.white : appColors.black,
        }}
        textStyle={{
          textAlign: rtl ? 'right' : 'left',
          fontSize: fontSizes.FONT4,
        }}
        scrollViewProps={{
          showsVerticalScrollIndicator: false,
          nestedScrollEnabled: true,
        }}
        zIndex={2}
        listMode="SCROLLVIEW"
        dropDownDirection="AUTO"
        ListEmptyComponent={() => (
          <View
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: windowHeight(1.3),
              zIndex: 2,
            }}
          >
            <Text style={{ color: colors.text }}>
              {translateData?.selectVehicleFirst}
            </Text>
          </View>
        )}
        ArrowDownIconComponent={({ style }) => (
          <View style={[{ transform: [{ rotate: '-90deg' }] }]}>
            <Icons.Back color={appColors.iconColor} />
          </View>
        )}
        ArrowUpIconComponent={({ style }) => (
          <View style={[{ transform: [{ rotate: '90deg' }] }]}>
            <Icons.Back color={appColors.iconColor} />
          </View>
        )}
      />
    </View>
  )
}
