import React, { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, Image, FlatList, BackHandler, ScrollView, RefreshControl } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { BalanceTopup, List, Selection } from './component/'
import { Header } from '../../../commonComponents'
import {
  useFocusEffect,
  useNavigation,
  useTheme,
} from '@react-navigation/native'
import {
  fleetWithdrawRequestData,
  paymentsData,
  withdrawRequestData,
} from '../../../api/store/action/walletActions'
import Images from '../../../utils/images/images'
import appColors from '../../../theme/appColors'
import styles from './styles'
import { useValues } from '../../../utils/context'
import { SkeletonWallet } from './component/List/skeletonWallet'
import { windowWidth } from '../../../theme/appConstant'
import { AppDispatch } from '../../../api/store'

export function MyWallet() {
  const dispatch = useDispatch<AppDispatch>()
  const navigation = useNavigation()
  const { colors } = useTheme()
  const { viewRtlStyle, isDark, textRtlStyle } = useValues()

  const { walletTypedata, withdrawRequestValue } = useSelector(
    (state: any) => state.wallet,
  )
  const { translateData } = useSelector((state: any) => state.setting)
  const { zoneValue } = useSelector((state: any) => state.zoneUpdate)
  const { selfDriver } = useSelector((state: any) => state.account)
  const [activeTab, setActiveTab] = useState<'wallet' | 'withdraw'>('wallet')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const lastFetchRef = useRef<number>(0);

  const fetchData = useCallback(async (isRefresh = false) => {
    const now = Date.now();
    // 5s throttle for anti-spam
    if (isRefresh && now - lastFetchRef.current < 5000) return;

    lastFetchRef.current = now;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      if (activeTab === 'wallet') {
        await dispatch(paymentsData()).unwrap()
      } else {
        const action =
          selfDriver?.role === 'fleet_manager'
            ? fleetWithdrawRequestData
            : withdrawRequestData
        await dispatch(action()).unwrap()
      }
    } catch (error) {
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [dispatch, activeTab, selfDriver?.role])

  useEffect(() => {
    fetchData();
  }, []);


  /* 🔥 SAFE TAB SWITCH */
  const handleButtonPress = useCallback(
    (tab: 'wallet' | 'withdraw') => {
      if (tab !== activeTab) {
        setActiveTab(tab)
      }
    },
    [activeTab],
  )

  /* 🔥 BACK HANDLER */
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (navigation.canGoBack()) {
          navigation.goBack()
          return true
        }
        return false
      }

      const handler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction,
      )

      return () => handler.remove()
    }, [navigation]),
  )

  /* 🔥 RENDER ITEM */
  const renderItem = useCallback(
    ({ item }: any) => (
      <View
        style={[
          styles.listItem,
          {
            flexDirection: viewRtlStyle,
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.leftSection}>
          <Text style={[styles.dateText, { textAlign: textRtlStyle }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
          <Text style={[styles.paymentTypeText, { color: colors.text }]}>
            {item.payment_type}
          </Text>
        </View>

        <View style={styles.rightSection}>
          <Text style={styles.amountText}>
            {zoneValue?.currency_symbol}
            {(zoneValue?.exchange_rate * item.amount).toFixed(2)}
          </Text>
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.status === 'rejected' ? appColors.red : appColors.price,
              },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>
    ),
    [colors, viewRtlStyle, textRtlStyle, zoneValue],
  )

  /* 🔥 EMPTY STATE */
  const renderEmptyState = () => (
    <View style={styles.noDataContainer}>
      <Image source={Images.noDataWallet} style={styles.noDataImg} />

      <View style={[styles.walletContainer, { flexDirection: viewRtlStyle }]}>
        <Text style={styles.msg}>{translateData.walletBalanceEmpty}</Text>
      </View>
    </View>
  )

  return (
    <View style={[styles.main, { backgroundColor: colors.background }]}>
      <Header title={translateData.myWallet} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[appColors.primary]}
          />
        }
      >
        <BalanceTopup
          walletTypedata={walletTypedata?.balance}
          handleButtonPress={handleButtonPress}
          activeTab={activeTab}
        />

        <Selection activeTab={activeTab} onButtonPress={handleButtonPress} />

        {loading ? (
          <SkeletonWallet />
        ) : activeTab === 'wallet' ? (
          walletTypedata?.histories?.length ? (
            <List walletTypedata={walletTypedata.histories} />
          ) : (
            renderEmptyState()
          )
        ) : withdrawRequestValue?.data?.length ? (
          <FlatList
            data={withdrawRequestValue.data}
            keyExtractor={item => item.id.toString()}
            renderItem={renderItem}
            scrollEnabled={false}
            removeClippedSubviews
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            contentContainerStyle={styles.container}
            style={{ paddingBottom: windowWidth(20) }}
          />
        ) : (
          renderEmptyState()
        )}
      </ScrollView>
    </View>
  )
}

