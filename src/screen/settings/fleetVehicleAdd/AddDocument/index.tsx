import { View, Text, ScrollView, Platform, TouchableOpacity } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { Button, Header, notificationHelper } from '../../../../commonComponents'
import { useDispatch, useSelector } from 'react-redux'
import { useTheme } from '@react-navigation/native'
import { useValues } from '../../../../utils/context'
import appColors from '../../../../theme/appColors'
import { TitleView } from '../../../auth/component'
import styles from './styles'
import RenderDocumentUpload from './component'
import { documentGet, fleetVehicleList } from '../../../../api/store/action'
import DateTimePicker from '@react-native-community/datetimepicker'
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView } from '@gorhom/bottom-sheet'
import appFonts from '../../../../theme/appFonts'
import Icons from '../../../../utils/icons/icons'
import { fontSizes, windowHeight, windowWidth } from '../../../../theme/appConstant'
import { launchCamera, launchImageLibrary, Asset as ImagePickerAsset } from 'react-native-image-picker'
import { URL } from '../../../../api/config'
import { getValue } from '../../../../utils/localstorage'
import { useAppNavigation } from '../../../../utils/navigation'
import { AppDispatch } from '../../../../api/store'
import { RouteProp } from '@react-navigation/native'

interface VehicleDocument {
    document?: { slug: string };
    document_image_url?: string;
    expired_at?: string;
}

interface VehicleData {
    id?: string;
    documents?: VehicleDocument[];
}

interface FormData {
    vehicleName: string;
    selectedVehicleID: string;
    vehicleColor: string;
    vehicleModel: string;
    vehicleModelYear: string;
    vehicleNumber: string;
}

interface AddDocumentRouteParams {
    formDatas: FormData;
    vehicleData?: VehicleData;
    type: 'add' | 'edit';
}

type AddDocumentRouteProp = RouteProp<Record<string, AddDocumentRouteParams>, string>;

interface DocumentItem {
    id: string;
    slug: string;
    name: string;
    need_expired_date: 0 | 1;
}

interface SettingState {
    translateData: Record<string, string>;
}

interface DocumentsState {
    documentData: {
        data: DocumentItem[];
    };
}

interface RootState {
    setting: SettingState;
    documents: DocumentsState;
}

export function AddDocument({ route }: { route: AddDocumentRouteProp }) {
    const dispatch = useDispatch<AppDispatch>()
    const { formDatas, vehicleData, type } = route.params;
    const { colors } = useTheme()
    const { translateData } = useSelector((state: RootState) => state.setting)
    const { textRtlStyle, setDocumentDetail, isDark, viewRtlStyle, rtl } = useValues()
    const { documentData } = useSelector((state: RootState) => state.documents)
    const [uploadedDocuments, setUploadedDocuments] = useState<Record<string, ImagePickerAsset[]>>({})
    const [expiryDates, setExpiryDates] = useState<Record<string, string | Date | null>>({})
    const [showWarning, setShowWarning] = useState<Record<string, boolean>>({})
    const [showDatePicker, setShowDatePicker] = useState<{ visible: boolean; slug: string | null }>({ visible: false, slug: null })
    const bars = Array(2).fill(0)
    const bottomSheetModalRef = useRef<BottomSheetModal>(null)
    const [selectedDocSlug, setSelectedDocSlug] = useState<string | null>(null)
    const snapPoints = ['30%']
    const [loading, setLoading] = useState(false)
    const navigation = useAppNavigation()

    useEffect(() => {
        getDocument()
    }, [])

    const getDocument = () => {
        dispatch(documentGet({ type: 'vehicle' }))
    }


    useEffect(() => {
        const prefillDocs: Record<string, ImagePickerAsset[]> = {}
        const prefillDates: Record<string, string | Date | null> = {}

        documentData?.data?.forEach((doc: DocumentItem) => {
            const existing = vehicleData?.documents?.find(
                (v: VehicleDocument) => v.document?.slug === doc.slug
            )

            if (existing) {
                if (existing.document_image_url) {
                    prefillDocs[doc.slug] = [
                        {
                            uri: existing.document_image_url,
                            fileName: `${doc.slug}.jpg`,
                            type: 'image/jpeg',
                            fileSize: 0,
                            width: 0,
                            height: 0,
                        },
                    ]
                }


                if (existing.expired_at) {
                    prefillDates[doc.slug] = new Date(existing.expired_at)
                        .toISOString()
                        .split('T')[0]
                }
            }
        })

        setUploadedDocuments(prefillDocs)
        setExpiryDates(prefillDates)
    }, [vehicleData, documentData])


    const gotoDocument = () => {
        let warnings: Record<string, boolean> = {}
        let hasEmptyDocument = false
        let hasMissingExpiryDate = false

        documentData?.data?.forEach((doc: DocumentItem) => {
            const isDocUploaded = uploadedDocuments[doc.slug] && uploadedDocuments[doc.slug].length > 0
            const requiresExpiryDate = doc.need_expired_date === 1
            const expiryDateValue = expiryDates[doc.slug]

            if (!isDocUploaded) {
                warnings[doc.slug] = true
                hasEmptyDocument = true
            }

            if (isDocUploaded && requiresExpiryDate && !expiryDateValue) {
                warnings[doc.slug] = true
                hasMissingExpiryDate = true
            }
        })

        setShowWarning(warnings)

        if (hasEmptyDocument || hasMissingExpiryDate) {
            return
        }

        const result = Object.keys(uploadedDocuments).reduce((acc, key) => {
            acc[key] = {
                file: uploadedDocuments[key] ? uploadedDocuments[key][0] : null, // Assuming single file upload
                expiryDate: documentData?.data?.find((d: DocumentItem) => d.slug === key)?.need_expired_date === 1
                    ? expiryDates[key] || null
                    : null,
            }
            return acc
        }, {} as Record<string, { file: ImagePickerAsset | null; expiryDate: string | Date | null }>)

        setDocumentDetail(result)
        addVehicle()
    }

    const openBottomSheet = (documentType: string) => {
        setSelectedDocSlug(documentType)
        bottomSheetModalRef.current?.present()
    }
    const handleImageSelection = async (type: 'gallery' | 'camera') => {
        try {
            let res
            if (type === 'gallery') {
                res = await launchImageLibrary({
                    mediaType: 'photo',
                    quality: 1,
                })
            } else {
                res = await launchCamera({
                    mediaType: 'photo',
                    quality: 1,
                })
            }
            if (res?.assets && selectedDocSlug) {
                const file = res.assets[0]
                setUploadedDocuments((prevDocs: Record<string, ImagePickerAsset[]>) => ({
                    ...prevDocs,
                    [selectedDocSlug]: [file],
                }))

                setShowWarning((prevWarnings) => ({
                    ...prevWarnings,
                    [selectedDocSlug]: false,
                }))
            }

        } catch (err) {
        } finally {
            bottomSheetModalRef.current?.dismiss()
        }
    }

    const onDateChange = (event: any, selectedDate: Date | undefined) => {
        const currentSlug = showDatePicker.slug
        if (event.type === 'set' && selectedDate && currentSlug) {
            const formattedDate = new Date(selectedDate).toISOString().split('T')[0]
            const updatedDates = { ...expiryDates, [currentSlug]: formattedDate }
            setExpiryDates(updatedDates)
        }
        setShowDatePicker({ visible: false, slug: null })
    }

    const getValidDate = (value: string | Date | null | undefined) => {
        const date = new Date(value || '')
        return isNaN(date.getTime()) ? new Date() : date
    }



    const addVehicle = async () => {
        setLoading(true);
        const token = await getValue('token');

        try {
            const formData = new FormData();
            formData.append('name', formDatas.vehicleName);
            formData.append('vehicle_type_id', formDatas.selectedVehicleID);
            formData.append('color', formDatas.vehicleColor);
            formData.append('model', formDatas.vehicleModel);
            formData.append('model_year', formDatas.vehicleModelYear);
            formData.append('plate_number', formDatas.vehicleNumber);

            Object.keys(uploadedDocuments).forEach((key, index) => {
                const docsArray = uploadedDocuments[key]; // this is an array
                const expiryDate = expiryDates[key];      // expiry date

                if (docsArray && docsArray?.length > 0) {
                    docsArray.forEach((doc: ImagePickerAsset) => {
                        if (doc.uri && doc.type && doc.fileName) {
                            formData.append(`documents[${index}][file]`, {
                                uri: doc.uri,
                                type: doc.type,
                                name: doc.fileName,
                            } as any); // Cast to any for FormData.append compatibility
                            formData.append(`documents[${index}][slug]`, key);
                            if (expiryDate) {
                                formData.append(`documents[${index}][expired_at]`, expiryDate);
                            }
                        }
                    });
                }
            });

            const response = await fetch(`${URL}/api/fleet/vehicleInfo`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();


            if (data?.id) {
                notificationHelper('', translateData?.vehicleAddsucess, 'success');
                await dispatch(fleetVehicleList());

                navigation.replace('ManageVehicle');

            } else {
                notificationHelper('', data?.message ?? 'Something went wrong', 'error');
                setLoading(false);

            }
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    const updateVehicle = async () => {
        setLoading(true);
        const token = await getValue('token');

        try {
            const formData = new FormData();
            formData.append('name', formDatas.vehicleName);
            formData.append('vehicle_type_id', formDatas.selectedVehicleID);
            formData.append('color', formDatas.vehicleColor);
            formData.append('model', formDatas.vehicleModel);
            formData.append('model_year', formDatas.vehicleModelYear);
            formData.append('plate_number', formDatas.vehicleNumber);
            formData.append('_method', 'PUT');

            Object.keys(uploadedDocuments).forEach((key, index) => {
                const docs = uploadedDocuments[key];   // array of files
                const expiryDate = expiryDates[key];

                if (docs && docs?.length > 0) {
                    docs.forEach((doc: ImagePickerAsset) => {
                        if (doc.uri && doc.type && doc.fileName) {
                            formData.append(`documents[${index}][file]`, {
                                uri: doc.uri,
                                type: doc.type,
                                name: doc.fileName,
                            } as any); // Cast to any for FormData.append compatibility
                            formData.append(`documents[${index}][slug]`, key);
                            if (expiryDate) {
                                formData.append(`documents[${index}][expired_at]`, expiryDate);
                            }
                        }
                    });
                }
            });


            const response = await fetch(`${URL}/api/fleet/vehicleInfo/${vehicleData?.id}`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
            const data = await response.json();


            if (data?.id) {
                notificationHelper('', translateData?.vehicleupdatesucess, 'success');
                await dispatch(fleetVehicleList());
                navigation.replace('ManageVehicle');
            } else {
                notificationHelper('', data?.message ?? 'Something went wrong', 'error');
                setLoading(false);
            }
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };


    return (
        <BottomSheetModalProvider>
            <View>
                <Header title={translateData?.addVehicle} backgroundColor={isDark ? colors.card : appColors.white} />
                <View style={{ backgroundColor: isDark ? colors.card : appColors.white }}>
                    <View style={[styles.container, { flexDirection: viewRtlStyle }]}>
                        {bars?.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    index < 2
                                        ? styles.filledBar
                                        : [
                                            styles.emptyBar,
                                            {
                                                backgroundColor: isDark
                                                    ? appColors.darkFillBar
                                                    : appColors.subPrimary,
                                            },
                                        ],
                                ]}
                            />
                        ))}
                    </View>
                </View>
                <ScrollView>
                    <View style={styles.space}>
                        <TitleView title={translateData?.addVehicleDetails} subTitle={translateData?.addVehicleDetailssetup} />
                        {documentData?.data?.map((doc: DocumentItem) => (
                            <View key={doc.id} style={styles.dateContainer}>
                                <RenderDocumentUpload
                                    uploadedDocuments={uploadedDocuments}
                                    handleDocumentUpload={(slug) => {
                                        openBottomSheet(slug)
                                    }}
                                    documentType={doc.slug}
                                    label={`Upload ${doc.name}`}
                                    expiryDate={expiryDates[doc.slug]?.toString()}
                                    needExpiryDate={doc.need_expired_date === 1}
                                    onPressDate={(slug) => setShowDatePicker({ visible: true, slug })}
                                />

                                {showWarning[doc.slug] && (
                                    <Text
                                        style={[
                                            styles.titleText,
                                            {
                                                textAlign: textRtlStyle,
                                                color: appColors.red,
                                                marginTop: 5,
                                            },
                                        ]}
                                    >
                                        {uploadedDocuments[doc.slug] && doc.need_expired_date === 1 && !expiryDates[doc.slug]
                                            ? translateData.expiryDateRequired
                                            : `${doc.name} ${translateData.isRequired}`}
                                    </Text>
                                )}
                            </View>
                        ))}
                    </View>
                </ScrollView>
                {type === 'edit' ?
                    <Button onPress={updateVehicle} title={translateData?.uploadBytes} backgroundColor={appColors.primary} color={appColors.white} loading={loading} />
                    :
                    <Button onPress={gotoDocument} title={translateData?.submit} backgroundColor={appColors.primary} color={appColors.white} loading={loading} />
                }
                {showDatePicker.visible && showDatePicker.slug && (
                    <DateTimePicker
                        value={getValidDate(expiryDates[showDatePicker.slug])}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onDateChange}
                        minimumDate={new Date()}
                    />
                )}

                <BottomSheetModal
                    ref={bottomSheetModalRef}
                    snapPoints={snapPoints}
                    handleIndicatorStyle={{ backgroundColor: appColors.primary, width: '13%' }}
                    backgroundStyle={{
                        backgroundColor: isDark ? appColors.bgDark : appColors.white,
                    }}
                >
                    <BottomSheetView style={{ padding: windowHeight(2) }}>
                        <Text style={{ fontFamily: appFonts.medium, fontSize: fontSizes.FONT4HALF, color: isDark ? appColors.white : appColors.black, marginBottom: windowHeight(2) }}>
                            {translateData.selectOne}
                        </Text>

                        <TouchableOpacity
                            onPress={() => handleImageSelection('gallery')}
                            style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: windowHeight(2) }}
                        >
                            <View style={{ backgroundColor: isDark ? appColors.dotDark : appColors.cardicon, height: windowHeight(5), width: windowHeight(5), borderRadius: windowHeight(3), justifyContent: 'center', alignItems: 'center' }}>
                                <Icons.Gallery />
                            </View>
                            <Text style={{ fontSize: fontSizes.FONT3HALF, fontFamily: appFonts.medium, marginLeft: windowWidth(3), color: isDark ? appColors.darkText : appColors.black }}>
                                {translateData.chooseFromGallery}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => handleImageSelection('camera')}
                            style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', marginBottom: windowHeight(2) }}
                        >
                            <View style={{ backgroundColor: isDark ? appColors.dotDark : appColors.cardicon, height: windowHeight(5), width: windowHeight(5), borderRadius: windowHeight(3), justifyContent: 'center', alignItems: 'center' }}>
                                <Icons.Camera1 />
                            </View>
                            <Text style={{ fontSize: fontSizes.FONT3HALF, fontFamily: appFonts.medium, marginLeft: windowWidth(3), color: isDark ? appColors.darkText : appColors.black }}>
                                {translateData.openCamera}
                            </Text>
                        </TouchableOpacity>
                    </BottomSheetView>
                </BottomSheetModal>
            </View>
        </BottomSheetModalProvider>
    )
}
