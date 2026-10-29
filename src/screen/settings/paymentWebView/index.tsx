import React, { useState } from 'react';
import { WebView } from 'react-native-webview';
import { useDispatch, useSelector } from 'react-redux';
import { paymentVerify, selfDriverData } from '../../../api/store/action';
import { PaymentVerifyInterface } from '../../../api/interface/walletInterface';
import { URL as API_URL } from '../../../api/config';
import styles from './styles';
import { useNavigation } from '@react-navigation/native';
import { notificationHelper } from '../../../commonComponents';
import { AppDispatch } from '../../../api/store';
import { Alert } from 'react-native';

export function PaymentWebView({ route }: any) {
  const [hasVerified, setHasVerified] = useState<boolean>(false);
  const { reset } = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const { url, selectedPaymentMethod, dataValue } = route.params || {};
  const { translateData } = useSelector((state: any) => state.setting)
  const navigation = useNavigation();


  const handleResponse = async (navState: any) => {
    if (!navState?.url) {
      return;
    }

    if (selectedPaymentMethod == 'paystack') {
      verifyPaystackPayment(navState);
      return;
    }

    if (hasVerified) {
      return;
    }

    const { token, payerID } = parseQueryParams(navState.url);

    if (token && payerID) {
      setHasVerified(true);
      await fetchPaymentData(token, payerID);
      return;
    }

    if (
      navState.url.includes('/status') ||
      navState.url.includes('/payment-success') ||
      navState.url.includes('/p/success')
    ) {
      setHasVerified(true);
      await fetchPaymentData(null, null);
      return;
    }

  };

  const parseQueryParams = (urlString: string) => {
    try {
      const parsed = new URL(urlString);
      const params = Object.fromEntries(parsed.searchParams.entries());
      return {
        token: params?.token || null,
        payerID: params?.PayerID || null,
      };
    } catch (error) {
      return { token: null, payerID: null };
    }
  };


  const verifyPaystackPayment = async (navState) => {
    if (!navState?.url) return;
    if (hasVerified.current) return;

    if (
      navState.url.includes('trxref') ||
      navState.url.includes('reference') ||
      navState.url.includes('/payment-success') ||
      navState.url.includes('/status') ||
      navState.url.includes('/p/success')
    ) {
      hasVerified.current = true;
      const payload: PaymentVerifyInterface = {
        item_id: dataValue?.item_id,
        type: dataValue?.type,
        transaction_id: dataValue?.transaction_id,
      };

      try {
        const res = await dispatch(paymentVerify(payload)).unwrap();

        dispatch(allRides());
        dispatch(walletTopUpData());
        notificationHelper("", translateData.topUpCompleted, 'success');
        navigation.reset({
          index: 0,
          routes: [{ name: 'TabNav' }],
        });
      } catch (error) {
        console.error('Paystack verification error:', error);
        navigation.goBack();
      }
      return;
    }

    if (navState.url.includes('/payment-failed') || navState.url.includes('/cancel')) {
      hasVerified.current = true;
      Alert.alert(translateData.paymentFailed, translateData.paymentFailedDescription);
      navigation.goBack();
      return;
    }
  }



  const fetchPaymentData: any = async (token?: string, payerID?: string) => {
    try {
      const fetchUrl = `${API_URL}/${selectedPaymentMethod}/status${token && payerID ? `?token=${token}&PayerID=${payerID}` : ''
        }`;

      const payload: PaymentVerifyInterface = {
        item_id: dataValue.item_id,
        type: dataValue.type,
        transaction_id: payerID ?? '',
      };

      await dispatch(paymentVerify(payload))
        .unwrap()
        .then(async (res: any) => {
          const selfData = await dispatch(selfDriverData()).unwrap();

          if (selfData) {
            notificationHelper('', translateData?.topupsuccess, 'success');
            reset({
              index: 0,
              routes: [{ name: 'TabNav' }],
            });
          } else {
            notificationHelper('Warning', translateData?.error, 'warning');
          }
        });
    } catch (error: any) {
      notificationHelper('Error', translateData?.tryagin, 'danger');
    }
  };


  return (
    <WebView
      style={styles.modalview}
      startInLoadingState
      incognito
      androidLayerType="hardware"
      cacheEnabled={false}
      cacheMode={'LOAD_NO_CACHE'}
      source={{ uri: url }}
      onNavigationStateChange={handleResponse}
    />
  );
}
