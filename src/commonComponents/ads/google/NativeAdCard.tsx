import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Image, Platform } from "react-native";
import {
    NativeAd,
    NativeAdView,
    NativeAsset,
    NativeMediaView,
    NativeAssetType,
    TestIds,
} from "react-native-google-mobile-ads";
import appFonts from "../../../theme/appFonts";
import appColors from "../../../theme/appColors";
import { windowHeight } from "../../../theme/appConstant";
import { fontSizes } from "../../../screen/settings/chat/context";
import { useSelector } from 'react-redux'


type Props = {
    heights?: number;
    adsHeight?: number;
};

const NativeAdComponent = ({ heights = windowHeight(40), adsHeight }: Props) => {
    const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);
    const { translateData, taxidoSettingData } = useSelector((state: any) => state.setting)

    // Get the appropriate ad unit ID based on platform
    const getAdUnitId = () => {
        if (__DEV__) {
            return TestIds.NATIVE;
        }

        const androidId = taxidoSettingData?.cabbooking_values?.ads?.native_android_unit_id;
        const iosId = taxidoSettingData?.cabbooking_values?.ads?.native_ios_unit_id;

        if (androidId && Platform.OS === 'android') {
            return androidId;
        } else if (iosId && Platform.OS === 'ios') {
            return iosId;
        }

        // Fallback to test IDs if no IDs are configured
        return TestIds.NATIVE;
    };

    useEffect(() => {
        let removeListener: Function | null = null;
        const adUnitId = getAdUnitId();

        NativeAd.createForAdRequest(adUnitId)
            .then(ad => {
                setNativeAd(ad);

                // Listen to ad events
                // No event listener needed as the ad will automatically update when loaded

                // Clean up function
                return () => {
                    ad.destroy();
                };
            })
            .catch(error => console.error("Error loading native ad:", error));

        return () => {
            if (nativeAd) {
                nativeAd.destroy();
            }
        };
    }, []);

    if (!nativeAd) {
        return (
            <View style={[styles.placeholder, { height: heights }]}>
                <Text>{translateData?.loadingAd || "Loading ad..."}</Text>
            </View>
        );
    }

    return (
        <NativeAdView nativeAd={nativeAd} style={[styles.adView, { height: heights }]}>
            {/* Icon / App Logo */}
            {nativeAd.icon && (
                <NativeAsset assetType={NativeAssetType.ICON}>
                    <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
                </NativeAsset>
            )}

            {/* Headline */}
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
                <Text style={styles.headline}>{nativeAd.headline}</Text>
            </NativeAsset>

            {/* Media (image / video) */}
            <NativeMediaView style={[styles.media, { height: adsHeight }]} />

            {/* Body text */}
            <NativeAsset assetType={NativeAssetType.BODY}>
                <Text style={styles.tagline}>{nativeAd.body}</Text>
            </NativeAsset>

            {/* Advertiser name */}
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                <Text style={styles.advertiser}>{nativeAd.advertiser}</Text>
            </NativeAsset>

            {/* Call to Action button */}
            <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <View style={styles.ctaButton}>
                    <Text style={styles.ctaText}>{nativeAd.callToAction}</Text>
                </View>
            </NativeAsset>
        </NativeAdView>
    );
};

export default NativeAdComponent;

const styles = StyleSheet.create({
    placeholder: {
        width: "92%",
        alignSelf: "center",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#eee",
        borderRadius: windowHeight(3),
        marginVertical: windowHeight(3),
    },
    adView: {
        width: "100%",
        alignSelf: "center",
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: windowHeight(3),
        padding: windowHeight(3),
        overflow: "hidden",
        alignItems: 'center',
        alignContent: 'center'
    },
    icon: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginBottom: 8
    },
    headline: {
        fontSize: fontSizes.FONT22,
        fontFamily: appFonts.medium,
        marginBottom: windowHeight(1)
    },
    tagline: {
        fontSize: fontSizes.FONT16,
        fontFamily: appFonts.regular,
        color: "#555",
        marginTop: windowHeight(0.5)
    },
    advertiser: {
        fontSize: fontSizes.FONT14,
        fontFamily: appFonts.medium,
        color: "#777",
        marginTop: windowHeight(0.5)
    },
    media: {
        width: "100%",
        marginVertical: windowHeight(0.5)
    },
    ctaButton: {
        width: "100%",
        marginTop: windowHeight(1),
        paddingVertical: windowHeight(1),
        paddingHorizontal: windowHeight(3),
        borderRadius: windowHeight(1),
        backgroundColor: "#007bff",
        alignSelf: "flex-start",
    },
    ctaText: {
        textAlign: "center",
        color: appColors.white,
        fontSize: fontSizes.FONT20,
        fontFamily: appFonts.medium,
    },
});