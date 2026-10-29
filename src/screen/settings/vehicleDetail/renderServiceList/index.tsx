import React, { useEffect, useRef } from 'react';
import { Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { SvgUri } from 'react-native-svg';
import { useTheme } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import appColors from '../../../../theme/appColors';
import { serviceDataGet } from '../../../../api/store/action/serviceAction';
import { useValues } from '../../../../utils/context';
import styles from './styles';
import { AppDispatch } from '../../../../api/store';

interface RenderItemsProps {
  selectedItemIndex: number | null
  handleItemPress: (
    index: number,
    slug: string,
    id: number,
    name: string,
  ) => void
  serviceId: number,
  setSelectedItemIndex: any
}

export function RenderServiceList({
  selectedItemIndex,
  handleItemPress,
  serviceId,
  setSelectedItemIndex
}: RenderItemsProps) {
  const { serviceData } = useSelector((state: any) => state.service);
  const dispatch = useDispatch<AppDispatch>();
  const { viewRtlStyle, isDark } = useValues();
  const { colors } = useTheme();
  const initialSelectedSet = useRef(false);

  useEffect(() => {
    dispatch(serviceDataGet());
  }, []);

  useEffect(() => {
    if (!initialSelectedSet.current && serviceData?.data?.length > 0 && serviceId) {
      const index = serviceData.data.findIndex((item: any) => Number(item.id) === Number(serviceId));
      if (index !== -1) {
        setSelectedItemIndex(index);
        initialSelectedSet.current = true;
      }
    }
  }, [serviceData, serviceId]);


  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ flexDirection: viewRtlStyle }}
      contentContainerStyle={{ paddingHorizontal: 5 }}
    >
      {serviceData?.data
        ?.filter((item: any, index: number) => {
          if (selectedItemIndex === 3) {
            return index === 3;
          }
          if (selectedItemIndex === null) {
            return true;
          }
          return index !== 3;
        })
        .map((item: any, idx: number) => {
          const isSelected = Number(item.id) === Number(serviceId);
          return (
            <View
              key={item.id}
              style={[
                styles.listView,
                {
                  width: 120,
                  borderColor: isSelected ? appColors.subPrimary : isDark
                    ? colors.border
                    : appColors.white,
                  backgroundColor: isSelected ? appColors.subPrimary : isDark
                    ? colors.card
                    : appColors.white,
                },
              ]}
            >
              <View
                style={[
                  styles.iconAndTextContainer,
                  { flexDirection: viewRtlStyle },
                ]}
              >
                <SvgUri
                  width={34}
                  height={34}
                  uri={item?.service_icon_url}
                  stroke={'none'}
                  fill={isDark && !isSelected ? appColors.white : 'transparent'}
                />
              </View>
              <Text
                style={[
                  styles.serviceTitle,
                  {
                    color: isSelected ? appColors.black : colors.text,
                  },
                ]}
              >
                {item?.name}
              </Text>
            </View>
          );
        })}
    </ScrollView>
  );
}
