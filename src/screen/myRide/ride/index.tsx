import React, { useCallback, useEffect, useState } from 'react'
import { BackHandler, View, ScrollView, RefreshControl } from 'react-native'
import { Header } from '../component'
import styles from './styles'
import { RideStatus } from '../rideStatus'
import appColors from '../../../theme/appColors'
import { rideDataGets } from '../../../api/store/action'
import { useDispatch } from 'react-redux'
import { AppDispatch } from '../../../api/store'
import { useAppNavigation } from '../../../utils/navigation'

export function MyRide() {
  const dispatch = useDispatch<AppDispatch>()
  const navigation = useAppNavigation()
  const [refreshing, setRefreshing] = useState(false)

  // Only call once on mount
  useEffect(() => {
    dispatch(rideDataGets())
  }, [dispatch])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await dispatch(rideDataGets()).unwrap()
    } catch (error) {
    } finally {
      setRefreshing(false)
    }
  }, [dispatch])

  useEffect(() => {
    const backAction = () => {
      navigation.goBack();
      return true;
    };
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  return (
    <View style={styles.main}>
      <Header />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        alwaysBounceVertical={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[appColors.primary]}
          />
        }
      >
        <View
          style={{
            backgroundColor: appColors.graybackground,
            flex: 1
          }}
        >
          <RideStatus />
        </View>
      </ScrollView>
    </View>
  )
}

export default MyRide

