import { StyleSheet } from 'react-native'
import appColors from '../../../../../../theme/appColors'
import { windowHeight, windowWidth } from '../../../../../../theme/appConstant'
import appFonts from '../../../../../../theme/appFonts'

const styles = StyleSheet.create({
  listView: {
    width: windowWidth(27),
    height: windowWidth(23),
    borderRadius: windowWidth(2),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: windowWidth(2),
    backgroundColor: appColors.white,
    paddingHorizontal: windowWidth(2)
  },
  iconAndTextContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTitle: {
    marginTop: windowHeight(1),
    fontFamily: appFonts.medium,
    fontSize: windowHeight(1.7),
  },
  arrowButton: {
    width: windowWidth(8),
    height: windowWidth(8),
    borderRadius: windowWidth(4),
    backgroundColor: appColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    position: 'absolute',
    zIndex: 10,
    marginHorizontal: windowWidth(-2),
    top: windowHeight(3.5)
  },
})

export default styles
