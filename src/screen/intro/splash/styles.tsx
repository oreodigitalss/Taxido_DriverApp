import { StyleSheet, Dimensions } from 'react-native'
import appColors from '../../../theme/appColors'
import { fontSizes, windowHeight } from '../../../theme/appConstant'
import appFonts from '../../../theme/appFonts'
const { width, height } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: appColors.white,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  img: {
    width: width,
    height: height,
    resizeMode: 'contain',
  },
  modalContent: {
    alignItems: 'center',
    padding: windowHeight(0.5),
  },
  modalImageContainer: {
    padding: windowHeight(0.7),
    backgroundColor: '#E8F4F1',
    borderRadius: windowHeight(10),
  },
  modalImage: {
    width: windowHeight(6),
    height: windowHeight(6),
    resizeMode: 'contain',
  },
  modalTitle: {
    fontSize: fontSizes.FONT4HALF,
    fontWeight: 'bold',
    color: appColors.primaryFont,
    marginTop: windowHeight(1),
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: fontSizes.FONT3HALF,
    color: appColors.secondaryFont,
    marginTop: windowHeight(1),
    textAlign: 'center',
  },
  modalButton: {
    backgroundColor: appColors.primary,
    height: windowHeight(5),
    width: '100%',
    borderRadius: windowHeight(0.7),
    marginTop: windowHeight(3.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    color: appColors.white,
    fontSize: fontSizes.FONT4,
    fontFamily: appFonts.medium
  },
})
export default styles
