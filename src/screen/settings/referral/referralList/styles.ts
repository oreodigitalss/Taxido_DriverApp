import appColors from "../../../../theme/appColors";
import appFonts from "../../../../theme/appFonts";
import { fontSizes, windowHeight, windowWidth } from "../../../../theme/appConstant";
import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: windowHeight(2),
        borderRadius: windowHeight(0.8),
        borderWidth: windowHeight(0.1),
    },
    userImage: {
        height: windowHeight(6),
        width: windowHeight(6),
        borderRadius: windowHeight(7),
    },
    userImage1: {
        height: windowHeight(6),
        width: windowHeight(6),
        borderRadius: windowHeight(6),
        backgroundColor: appColors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
        marginLeft: windowWidth(3),
    },
    nameText: {
        fontSize: fontSizes.FONT4,
        color: appColors.primary,
        fontFamily: appFonts.medium,
    },
    amountText: {
        fontSize: fontSizes.FONT3HALF,
        color: appColors.primary,
        fontFamily: appFonts.regular,
        marginTop: 2,
    },
    statusContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusText: {
        fontSize: fontSizes.FONT3HALF,
        fontFamily: appFonts.medium,
    },
})

export default styles
