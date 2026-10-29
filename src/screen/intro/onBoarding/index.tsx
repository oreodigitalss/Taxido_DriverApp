import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Keyboard,
  SafeAreaView,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import React, { useState, useRef, useEffect, useCallback } from 'react'
import Swiper from 'react-native-swiper'
import Images from '../../../utils/images/images'
import appColors from '../../../theme/appColors'
import { styles, windowHeight } from './styles'
import {
  useNavigation,
  useTheme,
} from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../../../navigation/main/types'
import DropDownPicker from 'react-native-dropdown-picker'
import { useValues } from '../../../utils/context'
import Icons from '../../../utils/icons/icons'
import { fontSizes } from '../../../theme/appConstant'
import { useDispatch, useSelector } from 'react-redux'
import {
  languageDataGet,
  settingDataGet,
  taxidosettingDataGet,
  translateDataGet,
} from '../../../api/store/action'
import { setValue } from '../../../utils/localstorage'
import { AppDispatch } from '../../../api/store'
import AsyncStorage from '@react-native-async-storage/async-storage'

type OnboardingProps = NativeStackNavigationProp<RootStackParamList>

export function OnBoarding() {
  const { navigate } = useNavigation<OnboardingProps>()
  const { colors } = useTheme()
  const dispatch = useDispatch<AppDispatch>()
  const swiperRef = useRef<Swiper | null>(null)
  const hasNavigated = useRef(false)

  const { settingData, languageData, translateData, taxidoSettingData } =
    useSelector((state: any) => state.setting)

  const { isDark, viewRtlStyle, setRtl } = useValues()

  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null)
  const [items, setItems] = useState<
    { label: string; value: string; icon: () => React.JSX.Element }[]
  >([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const imageDarkBottom = isDark ? Images.bgDarkOnboard : Images.bgOnboarding


  useEffect(() => {
    if (languageData?.data?.length) {
      const formattedItems = languageData?.data.map((lang: any) => ({
        label: lang.name,
        value: lang.locale,
        icon: () => (
          typeof lang.flag === 'string' && lang.flag.trim() ? (
            <Image source={{ uri: lang.flag }} style={styles.flagImage} />
          ) : (
            <View style={styles.flagImage} />
          )
        ),
      }))

      setItems(formattedItems)

      if (!selectedLanguage) {
        const firstLang =
          settingData?.values?.general?.default_language?.locale ||
          formattedItems[0]?.value

        setSelectedLanguage(firstLang)
        handleLanguageChange(firstLang)
      }
    }
  }, [languageData])

  useEffect(() => {
    if (swiperRef.current) {
      swiperRef.current.scrollBy(0, false)
    }
  }, [selectedLanguage, items, open])

  const handleLanguageChange = async (value: string | null) => {
    if (!value) return

    if (value === 'ar') {
      setRtl(true)
      await AsyncStorage.setItem('rtl', JSON.stringify(true))
    } else {
      setRtl(false)
      await AsyncStorage.setItem('rtl', JSON.stringify(false))
    }

    setSelectedLanguage(value)
    await setValue('selectedLanguage', value)

    dispatch(settingDataGet())
    dispatch(translateDataGet())
    dispatch(taxidosettingDataGet())
  }

  const handleOpenDropdown = async () => {
    if (!languageData?.data?.length) {
      setLoading(true)
      try {
        await dispatch(languageDataGet())
      } catch (error) {
        console.log('Error fetching language data:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleNavigation = () => {
    navigate('Login')
  }

  const handleIndexChanged = (index: number) => {
    if (index === 2 && !hasNavigated.current) {
      hasNavigated.current = true
      setTimeout(handleNavigation, 300)
    }
  }

  const handleNext = (index: number) => {
    const total = taxidoSettingData?.cabbooking_values?.onboarding?.length || 0
    if (index < total - 1) {
      swiperRef.current?.scrollBy(1)
    } else {
      handleNavigation()
    }
  }

  const onboardingData = taxidoSettingData?.cabbooking_values?.onboarding || []

  if (!onboardingData.length) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          backgroundColor: colors.background,
        }}
      >
        <Text
          style={{
            marginBottom: 16,
            color: colors.text,
            fontSize: 18,
            textAlign: 'center',
          }}
        >
          Welcome to Taxido Driver
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={handleNavigation}
          style={{
            minWidth: 180,
            alignItems: 'center',
            borderRadius: 8,
            paddingHorizontal: 24,
            paddingVertical: 14,
            backgroundColor: appColors.primary,
          }}
        >
          <Text style={{ color: appColors.white, fontSize: 16 }}>
            Continue to login
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Swiper
        ref={swiperRef}
        loop={false}
        autoplayTimeout={2}
        showsButtons={false}
        onIndexChanged={handleIndexChanged}
        activeDotStyle={styles.activeStyle}
        paginationStyle={styles.paginationStyle}
        dotColor={isDark ? appColors.dotPrimary : appColors.subPrimary}
      >
        {onboardingData.map((slide: any, index: number) => (
          <TouchableWithoutFeedback
            key={slide.key || index}
            onPress={() => {
              setOpen(false)
              Keyboard.dismiss()
            }}
          >
            <View style={styles.slide}>
              <View
                style={[
                  styles.languageContainer,
                  { flexDirection: viewRtlStyle },
                ]}
              >
                <DropDownPicker
                  open={open}
                  value={selectedLanguage}
                  items={items}
                  setOpen={setOpen}
                  setValue={setSelectedLanguage}
                  setItems={setItems}
                  placeholder={"Select Language"}
                  onSelectItem={item => handleLanguageChange(item?.value ?? null)}
                  onChangeValue={handleLanguageChange}
                  onOpen={handleOpenDropdown}
                  loading={loading}
                  listMode="SCROLLVIEW"
                  dropDownContainerStyle={[
                    styles.dropdownManu,
                    { backgroundColor: colors.card },
                  ]}
                  labelStyle={[styles.labelStyle, { color: colors.text }]}
                  arrowIconStyle={{ right: windowHeight(8) }}
                  containerStyle={styles.dropdownContainer}
                  style={styles.dropdown}
                  textStyle={{
                    color: colors.text,
                    fontSize: fontSizes.FONT4,
                  }}
                  theme={isDark ? 'DARK' : 'LIGHT'}
                  ActivityIndicatorComponent={({ color }) => (
                    <ActivityIndicator color={color} size="small" />
                  )}
                  ArrowDownIconComponent={() => (
                    <View style={{ transform: [{ rotate: '-90deg' }] }}>
                      <Icons.Back color={colors.text} />
                    </View>
                  )}
                  ArrowUpIconComponent={() => (
                    <View style={{ transform: [{ rotate: '90deg' }] }}>
                      <Icons.Back color={colors.text} />
                    </View>
                  )}
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleNavigation}
                >
                  <Text
                    style={[
                      styles.skipText,
                      {
                        borderColor: isDark
                          ? appColors.darkborder
                          : appColors.border,
                      },
                    ]}
                  >
                    {translateData?.skip || 'Skip'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Image
                style={styles.imageBackground}
                source={
                  typeof slide?.onboarding_image_url === 'string' &&
                  slide.onboarding_image_url.trim()
                    ? { uri: slide.onboarding_image_url }
                    : Images.carFront
                }
                resizeMode="contain"
              />

              <View
                style={[
                  styles.imageBgView,
                  { backgroundColor: colors.background },
                ]}
              >
                <ImageBackground
                  resizeMode="stretch"
                  style={styles.img}
                  source={imageDarkBottom}
                >
                  <Text
                    style={[
                      styles.title,
                      {
                        color: isDark ? appColors.white : appColors.primaryFont,
                      },
                    ]}
                  >
                    {slide?.title || ''}
                  </Text>
                  <Text style={styles.description}>
                    {slide?.description || ''}
                  </Text>
                  <TouchableOpacity
                    style={[styles.backArrow, { transform: [{ scaleX: -1 }] }]}
                    onPress={() => handleNext(index)}
                    activeOpacity={0.7}
                  >
                    <Icons.Back color={appColors.white} />
                  </TouchableOpacity>
                </ImageBackground>
              </View>
            </View>
          </TouchableWithoutFeedback>
        ))}
      </Swiper>
    </SafeAreaView>
  )
}
