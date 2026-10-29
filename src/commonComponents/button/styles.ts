import { StyleSheet } from 'react-native'
import { windowHeight } from '../../theme/appConstant'
import appFonts from '../../theme/appFonts'

const styles = StyleSheet.create({
  button: {
    height: windowHeight(6),
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: windowHeight(1),
  },
  buttonText: {
    fontFamily: appFonts.semiBold,
  },
})

export default styles
