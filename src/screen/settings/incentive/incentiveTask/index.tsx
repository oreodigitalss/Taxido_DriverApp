import { View, Text, ScrollView, LayoutChangeEvent, Image } from 'react-native'
import React, { useState, useEffect, useCallback } from 'react'
import { Header } from '../../../../commonComponents'
import styles from './styles'
import ProgressBarSvg from './ProgressBarSvg'
import { useRoute } from '@react-navigation/native'
import { useValues } from '../../../../utils/context'
import appColors from '../../../../theme/appColors'
import { useSelector } from 'react-redux'
import Images from '../../../../utils/images/images'
import {
  fontSizes,
  windowHeight,
  windowWidth,
} from '../../../../theme/appConstant'
import appFonts from '../../../../theme/appFonts'

export function IncentiveTask() {
  const route = useRoute<any>()
  const { tasks = [], data: completedRides = 0 } = route.params || {}

  const { isDark } = useValues()
  const { translateData } = useSelector((state: any) => state.setting)

  const [incentiveTasks, setIncentiveTasks] = useState<any[]>([])
  const [progressBarWidth, setProgressBarWidth] = useState(0)

  useEffect(() => {
    if (!tasks?.length) {
      setIncentiveTasks([])
      return
    }

    const mapped = tasks.map((task: any) => ({
      ...task,
      rideValue: Math.min(completedRides, task.target_rides),
    }))

    setIncentiveTasks(mapped)
  }, [tasks, completedRides])

  const getProgressPercent = useCallback((value: number, total: number) => {
    if (!total) return 0
    return Math.min((value / total) * 100, 100)
  }, [])

  const handleProgressBarLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width } = event.nativeEvent.layout
      if (width && width !== progressBarWidth) {
        setProgressBarWidth(width)
      }
    },
    [progressBarWidth],
  )

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? appColors.bgDark : appColors.graybackground,
        },
      ]}
    >
      <Header title={translateData.incentiveTask} />

      {incentiveTasks.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {incentiveTasks.map(task => {
            const progress = getProgressPercent(
              task.rideValue,
              task.target_rides,
            )

            return (
              <View
                key={task.id ?? `${task.level_number}`}
                style={[
                  styles.taskCard,
                  {
                    backgroundColor: isDark
                      ? appColors.darkThemeSub
                      : appColors.white,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.taskTitle,
                    {
                      color: isDark ? appColors.white : appColors.primaryFont,
                    },
                  ]}
                >
                  {translateData.level} {task.level_number} –{' '}
                  {translateData.complete} {task.target_rides}{' '}
                  {translateData.rideEarn} {task.incentive_amount}
                </Text>

                <View style={styles.progressContainer}>
                  <View
                    style={[
                      styles.progressBarBackground,
                      {
                        backgroundColor: isDark
                          ? appColors.darkborder
                          : appColors.border,
                      },
                    ]}
                    onLayout={handleProgressBarLayout}
                  >
                    {progressBarWidth > 0 && (
                      <ProgressBarSvg
                        width={(progressBarWidth * progress) / 100}
                        height={10}
                      />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.progressText,
                      {
                        color: isDark
                          ? appColors.darkText
                          : appColors.secondaryFont,
                      },
                    ]}
                  >
                    {task.rideValue}/{task.target_rides}
                  </Text>
                </View>
              </View>
            )
          })}
        </ScrollView>
      ) : (
        <View>
          <Image
            source={isDark ? Images.incentiveDark : Images.incentiveLight}
            style={{
              height: windowWidth(75),
              width: windowWidth(75),
              alignSelf: 'center',
              resizeMode: 'contain',
              marginTop: windowHeight(20),
            }}
          />
          <Text
            style={{
              fontFamily: appFonts.medium,
              fontSize: fontSizes.FONT4,
              color: isDark ? appColors.white : appColors.primaryFont,
              alignSelf: 'center',
              marginTop: windowHeight(2),
            }}
          >
            {translateData.noIncentiveTask}
          </Text>
        </View>
      )}
    </View>
  )
}
