import { View, StyleSheet } from 'react-native'
import React from 'react'
import { windowHeight, windowWidth } from '../../../../../theme/appConstant'
import LottieView from 'lottie-react-native'
import Gifs from '../../../../../utils/gifs/gifs'

export function LineAnimation() {
  return (
    <View style={[styles.container]}>
      <LottieView source={Gifs.lineAnimation} style={styles.image} autoPlay loop />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    height: windowHeight(2),
    width: windowWidth(6),
  },
  image: {
    width: windowWidth(30),
    height: windowHeight(12),
    transform: [{ rotate: '-90deg' }],
    resizeMode: 'contain',
  },
})
