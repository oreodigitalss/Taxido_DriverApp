import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, BackHandler } from 'react-native'
import { useSelector } from 'react-redux'
import { useNavigation, useTheme } from '@react-navigation/native'
import styles from '../../auth/registration/vehicleRegistration/styles'
import vehicleStyles from './styles'
import appColors from '../../../theme/appColors'
import { Input, Header } from '../../../commonComponents'
import { TitleView } from '../../auth/component'
import {
  RenderCategoryList,
  RenderVehicleList,
} from '../../auth/registration/vehicleRegistration/component'
import { windowHeight } from '../chat/context'
import { useValues } from '../../../utils/context'
import { RenderServiceList } from './renderServiceList'
import { windowWidth } from '../../../theme/appConstant'
import DropDownPicker from 'react-native-dropdown-picker'
import { CustomCheckbox } from '../../../screen/auth/registration/component'

export function VehicleDetail() {
  const { colors } = useTheme()
  const {
    isDark,
    textRtlStyle,
    viewRtlStyle,
    categoryIndex,
    setCategoryIndex,
  }: any = useValues()
  const { selfDriver } = useSelector((state: any) => state.account)
  const { translateData } = useSelector((state: any) => state.setting)
  const { vehicleTypedata } = useSelector((state: any) => state.vehicleType)
  const { serviceData } = useSelector((state: any) => state.service)
  const { categoryData } = useSelector((state: any) => state.serviceCategory)


  const [formData, setFormData] = useState<any>({
    serviceName: '',
    serviceCategory: '',
    vehicleType: '',
    vehicleName: '',
    vehicleNumber: '',
    maximumSeats: '',
    vehicleColor: '',
    model: '',
    ambulanceName: '',
    ambulanceDescription: '',
    experience: '',
    gear_type: '',
    price_per_day: '',
    price_per_hour: '',
    price_per_km: '',
  })

  const [selectedServiceID, setSelectedServiceID] = useState<number | null>(
    null,
  )
  const [selectedCategoryID, setSelectedCategoryID] = useState<number | null>(
    null,
  )
  const [selectedVehicleID, setSelectedVehicleID] = useState<number | null>(
    null,
  )
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedVehicle, setSelectedVehicle] = useState<string>('')
  const [vehicleIndex, setVehicleIndex] = useState<number | null>(null)
  const [showWarning, setShowWarning] = useState(false)
  const [loader, setLoader] = useState(false)
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(
    null,
  )
  const [selectedService, setSelectedService] = useState<string>('')
  const [selectedPriceTypes, setSelectedPriceTypes] = useState<string[]>([])
  const [openGear, setOpenGear] = useState(false)
  const [gearItems, setGearItems] = useState([
    { label: 'Manual', value: 'manual' },
    { label: 'Automatic', value: 'automatic' }
  ])
  const [selectedVehicleSeat, setSelectedVehicleSeat] = useState<number | null>(null)

  useEffect(() => {
    if (selfDriver?.vehicle_info) {
      const vehicle = selfDriver?.vehicle_info

      setFormData({
        serviceName: selfDriver?.service_id?.toString() || '',
        serviceCategory: selfDriver?.service_category_id?.toString() || '',
        vehicleType: vehicle?.vehicle_type_id?.toString() || '',
        vehicleName: vehicle?.name || '',
        model: vehicle?.model || '',
        vehicleNumber: vehicle?.plate_number || '',
        vehicleColor: vehicle?.color || '',
        maximumSeats: vehicle?.seat?.toString() || '',
        description: vehicle?.description || '',
        ambulanceDescription: vehicle?.description || '',
        ambulanceName: vehicle?.name || '',
        experience: selfDriver?.experience?.toString() || '',
        gear_type: selfDriver?.gear_type || '',
        price_per_day: selfDriver?.per_day_charge?.toString() || '',
        price_per_hour: selfDriver?.per_hour_charge?.toString() || '',
        price_per_km: selfDriver?.per_km_charge?.toString() || '',
      })
      setSelectedServiceID(selfDriver?.service_id || null)
      setSelectedCategoryID(selfDriver?.service_category_id || null)
      setSelectedVehicleID(vehicle?.vehicle_type_id || null)

      const prices = []
      if (selfDriver?.per_day_charge) prices.push('day')
      if (selfDriver?.per_hour_charge) prices.push('hour')
      if (selfDriver?.per_km_charge) prices.push('km')
      setSelectedPriceTypes(prices)
    }
  }, [selfDriver])

  useEffect(() => {
    if (serviceData?.data && selfDriver?.service_id) {
      const selected = serviceData.data.find((s: any) => s.id === selfDriver.service_id)
      if (selected) {
        setSelectedService(selected.slug)
      }
    }
  }, [serviceData, selfDriver?.service_id])

  useEffect(() => {
    if (categoryData?.data && selfDriver?.service_category_id) {
      const selected = categoryData.data.find((c: any) => c.id === selfDriver.service_category_id)
      if (selected) {
        setSelectedCategory(selected.name)
      }
    }
  }, [categoryData, selfDriver?.service_category_id])

  const foundVehicle = vehicleTypedata?.data?.find(
    (v: any) =>
      selfDriver?.vehicle_info.model &&
      selfDriver?.vehicle_info.model
        .toLowerCase()
        .includes(v.name.toLowerCase()),
  )

  const handleChange = (key: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }))
  }

  const handleItemPress = (index: number, slug: string, id: number, name: string) => {
    setSelectedServiceID(id)
    setSelectedService(slug)
    setFormData((prev: any) => ({ ...prev, serviceName: id.toString() }))
  }

  const handleCategoryPress = (
    index: number,
    categoryName: string,
    categoryId?: string,
  ) => {
    setCategoryIndex(index)
    setSelectedCategory(categoryName)
    if (categoryId) setSelectedCategoryID(Number(categoryId))
  }

  const handleVehiclePress = (index: number, name: string, id: string) => {
    setVehicleIndex(index)
    setSelectedVehicle(name)
    setSelectedVehicleID(Number(id))

    const selectedItem = vehicleTypedata?.data?.find(
      (item: any) => item.id === Number(id),
    )
    if (selectedItem?.seat) {
      setSelectedVehicleSeat(selectedItem.seat)
    }
  }

  const navigation = useNavigation()

  useEffect(() => {
    const backAction = () => {
      if (navigation.canGoBack()) {
        navigation.goBack()
        return true
      }
      return false
    }

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    )

    return () => backHandler.remove()
  }, [navigation])
  return (
    <ScrollView style={styles.main} showsVerticalScrollIndicator={false}>
      <Header title={translateData.vehicleRegistration} />
      <View style={[styles.subView, { backgroundColor: colors.background }]}>
        <View style={styles.subContainer}>
          <TitleView
            title={translateData.vehicleRegistration}
            subTitle={translateData.registerContent}
          />

          <Text
            style={[
              styles.selectTitle,
              {
                color: isDark ? appColors.white : appColors.primaryFont,
                textAlign: textRtlStyle,
              },
            ]}
          >
            {translateData.selectService}
          </Text>
          <View
            style={{ flexDirection: viewRtlStyle, marginTop: windowHeight(5) }}
          >
            <RenderServiceList
              selectedItemIndex={selectedItemIndex}
              handleItemPress={handleItemPress}
              serviceId={selfDriver?.service_id}
              setSelectedItemIndex={setSelectedItemIndex}
            />
          </View>

          {(() => {
            const serviceSlug = selectedService?.toLowerCase().replace(/[-_]/g, '')
            const isAmbulance = serviceSlug === 'ambulance'
            const isFindDriver = serviceSlug === 'finddriver'

            if (selectedCategory === 'Rental') {
              return (
                <View style={styles.rentalBg}>
                  <Text style={styles.rentalDesc}>
                    {translateData.registrationNotice} '
                    <Text style={styles.boldText}>
                      {translateData.vehicleList}
                    </Text>
                  </Text>
                </View>
              )
            }

            if (isAmbulance) {
              return (
                <>
                  <View style={[styles.vehicleNo, { marginTop: windowHeight(25) }]}>
                    <Input
                      title={translateData.ambulanceName}
                      titleShow={true}
                      placeholder={translateData.enterHospitalName}
                      value={formData.ambulanceName}
                      onChangeText={text => handleChange('ambulanceName', text)}
                      showWarning={showWarning && !formData.ambulanceName}
                      warning={translateData.pleaseEnterAmbulanceNameeeee}
                      backgroundColor={
                        isDark ? appColors.darkThemeSub : appColors.white
                      }
                      editable={false}
                    />
                  </View>
                  <View style={styles.vehicleColor}>
                    <Input
                      title={translateData.ambulanceDescription}
                      titleShow={true}
                      placeholder={translateData.enterAmbulanceDescription}
                      value={formData.ambulanceDescription}
                      onChangeText={text =>
                        handleChange('ambulanceDescription', text)
                      }
                      showWarning={showWarning && !formData.ambulanceDescription}
                      warning={translateData.pleaseEnterAmbulanceDescriptionnnnn}
                      backgroundColor={
                        isDark ? appColors.darkThemeSub : appColors.white
                      }
                      editable={false}
                    />
                  </View>
                </>
              )
            }

            if (isFindDriver) {
              return (
                <View>
                  <View style={styles.vehicle}>
                    <Text
                      style={[
                        styles.vehicleTitle,
                        { textAlign: textRtlStyle },
                        {
                          color: isDark
                            ? appColors.white
                            : appColors.primaryFont,
                        },
                        { bottom: windowHeight(0) },
                      ]}
                    >
                      {translateData.selectVehicle}
                    </Text>
                    <View style={{ flexDirection: viewRtlStyle }}>
                      <View>
                        <RenderVehicleList
                          vehicleIndex={vehicleIndex}
                          handleItemPress={handleVehiclePress}
                          selectedCategory={selectedCategoryID || selfDriver?.service_category_id}
                          serviceId={selectedServiceID || selfDriver?.service_id}
                          categoryId={selectedCategoryID || selfDriver?.service_category_id}
                          selectedVehicleID={selectedVehicleID || selfDriver?.vehicle_info?.vehicle_type_id}
                          editable={false}
                        />
                      </View>
                    </View>
                  </View>

                  <View style={styles.experienceInput}>
                    <Input
                      title={"Experience (Years)"}
                      titleShow={true}
                      placeholder={"Enter Experience"}
                      value={formData.experience}
                      onChangeText={text => handleChange('experience', text)}
                      keyboardType="numeric"
                      backgroundColor={isDark ? appColors.darkThemeSub : appColors.white}
                      editable={false}
                    />
                  </View>

                  <Text style={[styles.priceType, { color: isDark ? appColors.white : appColors.primaryFont, marginTop: windowHeight(2) }]}>
                    Price Type
                  </Text>
                  <View style={styles.priceTypeContainer}>
                    {['day', 'hour', 'km'].map((type) => (
                      <View key={type} style={styles.checkboxItem}>
                        <CustomCheckbox
                          label={`Per ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                          checked={selectedPriceTypes.includes(type)}
                          onPress={() => { }}
                        />
                      </View>
                    ))}
                  </View>

                  {selectedPriceTypes.map((type) => (
                    <View key={type} style={styles.priceFields}>
                      <Input
                        title={`Price Per ${type.charAt(0).toUpperCase() + type.slice(1)}`}
                        titleShow={true}
                        placeholder={`Enter price per ${type}`}
                        value={formData[`price_per_${type}`]}
                        onChangeText={text => handleChange(`price_per_${type}`, text)}
                        keyboardType="numeric"
                        backgroundColor={isDark ? appColors.darkThemeSub : appColors.white}
                        editable={false}
                      />
                    </View>
                  ))}

                  <Text style={[styles.vehicleTitle, { color: isDark ? appColors.white : appColors.primaryFont, marginTop: windowHeight(2) }]}>
                    Gear Type
                  </Text>
                  <DropDownPicker
                    open={openGear}
                    value={formData.gear_type}
                    items={gearItems}
                    setOpen={setOpenGear}
                    setValue={callback => { }}
                    setItems={setGearItems}
                    placeholder="Select Gear Type"
                    containerStyle={styles.dropdownContainer}
                    style={[
                      styles.dropdown,
                      {
                        backgroundColor: isDark ? appColors.darkThemeSub : appColors.white,
                        borderColor: appColors.border
                      }
                    ]}
                    textStyle={[styles.dropdownText, { color: isDark ? appColors.white : appColors.black }]}
                    dropDownContainerStyle={{
                      backgroundColor: isDark ? appColors.darkThemeSub : appColors.white,
                      borderColor: appColors.border
                    }}
                    disabled={true}
                  />
                </View>
              )
            }

            return (
              <>
                <Text
                  style={[
                    styles.selectTitle,
                    {
                      color: isDark ? appColors.white : appColors.primaryFont,
                      textAlign: textRtlStyle,
                      marginTop: windowHeight(1),
                    },
                  ]}
                >
                  {translateData.selectCategory}
                </Text>
                <View
                  style={[
                    vehicleStyles.categoryList,
                    { flexDirection: viewRtlStyle },
                  ]}
                >
                  <RenderCategoryList
                    categoryIndex={categoryIndex}
                    selectedService={selectedServiceID || selfDriver?.service_id}
                    selectedCategory={selectedCategory}
                    categoryId={selfDriver?.service_category_id}
                    handleItemPress={handleCategoryPress}
                  />
                </View>

                <Text
                  style={[
                    styles.selectTitle1,
                    {
                      color: isDark ? appColors.white : appColors.primaryFont,
                      textAlign: textRtlStyle,
                      marginTop: windowHeight(2),
                    },
                  ]}
                >
                  {translateData.selectVehicle}
                </Text>
                <View style={{ flexDirection: viewRtlStyle }}>
                  <RenderVehicleList
                    vehicleIndex={vehicleIndex}
                    selectedItemIndex={selectedItemIndex}
                    selectedCategory={
                      selectedCategoryID || selfDriver?.service_category_id
                    }
                    selectedVehicle={
                      selectedVehicleID ||
                      selfDriver?.vehicle_info?.vehicle_type_id
                    }
                    serviceId={selectedServiceID || selfDriver?.service_id}
                    handleItemPress={handleVehiclePress}
                    editable={true}
                  />
                </View>

                <View
                  style={[
                    vehicleStyles.vehicleName,
                    { marginTop: windowWidth(6) },
                  ]}
                >
                  <Input
                    titleShow
                    title={translateData.vehicleName}
                    placeholder={translateData.enterVehicleNames}
                    value={formData.model}
                    onChangeText={text => handleChange('model', text)}
                    showWarning={showWarning && !formData.model}
                    warning={translateData.enterYourvehicleName}
                    backgroundColor={
                      isDark ? appColors.darkThemeSub : appColors.white
                    }
                    editable={false}
                  />
                </View>
                <View style={vehicleStyles.vehicle}>
                  <Input
                    titleShow
                    title={translateData.vehicleNo}
                    placeholder={translateData.rnterVehicleNo}
                    value={formData.vehicleNumber}
                    onChangeText={text => handleChange('vehicleNumber', text)}
                    showWarning={showWarning && !formData.vehicleNumber}
                    warning={translateData.pleaseEnterVehicleNo}
                    backgroundColor={
                      isDark ? appColors.darkThemeSub : appColors.white
                    }
                    editable={false}
                  />
                </View>
                <View style={vehicleStyles.vehicle}>
                  <Input
                    titleShow
                    title={translateData.vehicleColor}
                    placeholder={translateData.enterVehicleColor}
                    value={formData.vehicleColor}
                    onChangeText={text => handleChange('vehicleColor', text)}
                    showWarning={showWarning && !formData.vehicleColor}
                    warning={translateData.enterYourvehicleColor}
                    backgroundColor={
                      isDark ? appColors.darkThemeSub : appColors.white
                    }
                    editable={false}
                  />
                </View>
                <View style={vehicleStyles.datePicker}>
                  <Input
                    titleShow
                    title={translateData.maximumSeats}
                    placeholder={translateData.enterMaximumSeats}
                    value={formData.maximumSeats}
                    onChangeText={text => handleChange('maximumSeats', text)}
                    showWarning={
                      showWarning &&
                      (!formData.maximumSeats ||
                        Number(formData.maximumSeats) > (foundVehicle?.seat || 0))
                    }
                    warning={
                      !formData.maximumSeats
                        ? translateData.enterYourmaximumSeats
                        : `${translateData?.maax} ${foundVehicle?.seat} ${translateData?.Seats}`
                    }
                    keyboardType="numeric"
                    backgroundColor={
                      isDark ? appColors.darkThemeSub : appColors.white
                    }
                    editable={false}
                  />
                </View>
              </>
            )
          })()}
        </View>
      </View>
    </ScrollView>
  )
}
