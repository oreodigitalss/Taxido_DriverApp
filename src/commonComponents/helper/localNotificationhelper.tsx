import notifee, { AndroidImportance } from '@notifee/react-native';
import { Platform, PermissionsAndroid } from 'react-native';

class NotificationHelper {
    static configure() {
        notifee.createChannel({
            id: 'default-channel-id',
            name: 'Default Channel',
            importance: AndroidImportance.HIGH,
            vibration: true,
        }).then((created) => console.log(`createChannel returned '${created}'`));

        if (Platform.OS === 'android' && Platform.Version >= 33) {
            PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            ).then((result) => {
                if (result === PermissionsAndroid.RESULTS.GRANTED) {
                } else {
                }
            });
        }
    }

    static showNotification({ title, message }: { title: string; message: string }) {
        notifee.displayNotification({
            title,
            body: message,
            android: {
                channelId: 'default-channel-id',
                smallIcon: 'ic_launcher',
                importance: AndroidImportance.HIGH,
                sound: 'default',
                pressAction: {
                    id: 'default',
                },
            },
        });
    }
}

export default NotificationHelper;
