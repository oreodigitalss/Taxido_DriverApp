import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  BackHandler,
  ActivityIndicator,
  ScrollView,
  Modal,
  Pressable,
  Platform,
  RefreshControl,
} from 'react-native'
import appColors from '../../../theme/appColors'
import { getValue } from '../../../utils/localstorage'
import { URL } from '../../../api/config'
import { useValues } from '../../../utils/context'
import { styles } from './styles'
import { useNavigation, useRoute } from '@react-navigation/native'
import Icons from '../../../utils/icons/icons'
import { useTheme } from '@react-navigation/native'
import Images from '../../../utils/images/images'
import { useSelector } from 'react-redux'
import { useAppNavigation } from '../../../utils/navigation'
import getEchoInstance from '../../../utils/echo'
import { api } from '../../../api/appClient'
import { launchImageLibrary } from 'react-native-image-picker'

export function Chat() {
  const route = useRoute()
  const { driverId, riderId, rideId, riderName, riderImage, from }: any =
    route.params || {}
  const { goBack } = useAppNavigation()
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState<boolean>(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedImages, setSelectedImages] = useState<any[]>([])
  const flatListRef = React.useRef<FlatList>(null)
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null)
  const { colors } = useTheme()
  const { viewRtlStyle, textRtlStyle, rtl, isDark } = useValues()
  const { translateData } = useSelector((state: any) => state.setting)
  const navigation = useNavigation()

  useEffect(() => {
    const backAction = () => {
      if (navigation.canGoBack()) {
        navigation.goBack()
        return true
      }
      return false
    }
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    )
    return () => backHandler.remove()
  }, [navigation])

  const ride_Id = `${rideId}`
  const currentUserId = `${driverId}`
  const chatWithUserId = from === 'help' ? '1' : `${riderId}`
  const adminId = '1'

  // roomId convention for the backend
  const roomId =
    from === 'help'
      ? [parseInt(adminId), parseInt(currentUserId)]
          .sort((a, b) => a - b)
          .join('_')
      : [parseInt(ride_Id), parseInt(currentUserId), parseInt(chatWithUserId)]
          .sort((a, b) => a - b)
          .join('_')

  // Real-time Chat Listener
  useEffect(() => {
    let echo: any

    const setupEcho = async () => {
      echo = await getEchoInstance()
      if (!echo) return

      const pusher = echo.connector.pusher

      if (pusher && pusher.connection) {
        // Detailed Connection Logging
        pusher.connection.bind('state_change', (states: any) => {
          console.log(' Reverb Connection State:', states.current)
        })

        pusher.connection.bind('error', (err: any) => {
          console.log('❌ Reverb Connection Error:', err)
        })

        pusher.connection.bind('connected', () => {
          console.log('✅ Reverb Connected Successfully!')
        })
      }


      echo
        .private(`chat.room.${roomId}`)
        .subscribed(() => {
          console.log('✅ Reverb: Subscribed to room:', roomId)
        })
        .listen('.chat.message.sent', (e: any) => {
          const data = e.data || e
          if (data && data.sender_id?.toString() !== currentUserId) {
            const newMessage = {
              ...data,
              id: data.id || data.created_at || `msg_${Date.now()}_${Math.random()}`,
            }
            setMessages(prev => {
              const exists = prev.some(m => m.id === newMessage.id)
              if (exists) return prev
              return [newMessage, ...prev]
            })
          }
        })
        .listen('ChatMessageSent', (e: any) => {
          const data = e.data || e
          if (data && data.sender_id?.toString() !== currentUserId) {
            const newMessage = {
              ...data,
              id: data.id || data.created_at || `msg_${Date.now()}_${Math.random()}`,
            }
            setMessages(prev => {
              const exists = prev.some(m => m.id === newMessage.id)
              if (exists) return prev
              return [newMessage, ...prev]
            })
          }
        })
    }

    setupEcho()

    return () => {
      if (echo) {
        echo.leave(`chat.room.${roomId}`)
      }
    }
  }, [roomId])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const response = await api.get('chat/messages', {
        params: { room_id: roomId },
      })
      if (response.data?.status && Array.isArray(response.data?.data)) {
        // Ensure every fetched message has an ID for FlatList stability
        const fetchedMessages = response.data.data.map((m: any) => ({
          ...m,
          id: m.id || m.created_at || `msg_fetched_${Math.random()}`,
        }))
        // Backend history order: newest first for FlatList inverted
        setMessages([...fetchedMessages].reverse())
      }
      setLoading(false)
    } catch (e) {
      console.log('fetchMessages error', e)
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchMessages()
    setRefreshing(false)
  }

  // Initial Message Fetch
  useEffect(() => {
    fetchMessages()
  }, [roomId])

  const pickImages = async () => {
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 5 }, response => {
      if (response.didCancel) {
        return
      }
      if (response.errorMessage) {
        setError(response.errorMessage)
        return
      }
      if (response.assets && response.assets?.length > 0) {
        setSelectedImages(prev => [...prev, ...response.assets!])
      }
    })
  }

  const scrollToBottom = () => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
  }

  const sendMessage = async () => {
    if (!input.trim() && selectedImages.length === 0) return

    const messageText = input.trim()
    const imagesToSend = [...selectedImages]
    const tempId = `temp_${Date.now()}`

    // 1. Optimistic Update: Add message immediately
    const optimisticMessage = {
      id: tempId,
      message: messageText,
      images: imagesToSend.map(asset => ({ url: asset.uri })), // Format for UI
      sender_id: currentUserId,
      receiver_id: from === 'help' ? '1' : riderId,
      created_at: new Date().toISOString(),
      isOptimistic: true, // Tag to identify pending messages
    }

    setMessages(prev => [optimisticMessage, ...prev])
    setInput('')
    setSelectedImages([])

    try {
      const receiverId = from === 'help' ? adminId : riderId
      const token = await getValue('token')
      const language = await getValue('selectedLanguage')
      const defaultLng = await getValue('defaultLanguage')
      const currentLng = language || defaultLng

      let body
      let headers: any = {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        'Accept-Lang': currentLng,
      }

      if (imagesToSend.length > 0) {
        const formData = new FormData()
        formData.append('room_id', roomId)
        formData.append('receiver_id', receiverId.toString())

        if (messageText) {
          formData.append('message', messageText)
        }

        imagesToSend.forEach((image, index) => {
          formData.append(`images[${index}]`, {
            uri:
              Platform.OS === 'android'
                ? image.uri
                : image.uri.replace('file://', ''),
            type: image.type || 'image/jpeg',
            name: image.fileName || `image_${index}.jpg`,
          } as any)
        })
        body = formData
        // Fetch in RN often needs this explicitly for multipart
        headers['Content-Type'] = 'multipart/form-data'
      } else {
        body = JSON.stringify({
          room_id: roomId,
          receiver_id: parseInt(receiverId),
          message: messageText,
        })
        headers['Content-Type'] = 'application/json'
      }

      const response = await fetch(`${URL}/api/chat/send`, {
        method: 'POST',
        body: body,
        headers: headers,
      })

      const responseData = await response.json()

      if (responseData?.status && responseData?.data) {
        const data = responseData.data
        const sentMessage = {
          ...data,
          id: data.id || data.created_at || `msg_send_${Date.now()}`,
        }

        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== tempId)
          const exists = filtered.some(m => m.id === sentMessage.id)
          if (exists) return filtered
          return [sentMessage, ...filtered]
        })
        scrollToBottom()
      }
    } catch (err) {
      console.log('send error', err)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setError('Failed to send message')
    }
  }


  return (
    <View style={styles.containerMain}>
      {/* Header */}
      <View
        style={[
          styles.view_Main,
          { backgroundColor: colors.card, flexDirection: viewRtlStyle },
        ]}
      >
        <View style={{ flexDirection: viewRtlStyle }}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.backButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={goBack}
          >
            <Icons.Back color={colors.text} />
          </TouchableOpacity>
          <View style={styles.riderContainer}>
            <Text
              style={[
                styles.templetionStyle,
                { textAlign: textRtlStyle, color: colors.text },
              ]}
            >
              {from && from === 'help' ? 'Administrator' : riderName}
            </Text>
            <Text style={[styles.onlineText, { textAlign: textRtlStyle }]}>
              {translateData.online}
            </Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        inverted
        data={messages}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        style={styles.listContainer}
        renderItem={({ item }) => {
          const isMe = item.sender_id?.toString() === currentUserId
          const timestamp = item.created_at
            ? new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
            : `${translateData.sending}`

          return (
            <View
              style={[
                styles.mainContainer,
                {
                  flexDirection: isMe ? 'row-reverse' : 'row',
                },
              ]}
            >
              {!isMe && (
                <Image
                  source={
                    riderImage ? { uri: riderImage } : Images.ProfileDefault
                  }
                  style={[styles.image, { borderColor: colors.border }]}
                />
              )}

              <View
                style={[
                  styles.messageContainer,
                  isMe
                    ? styles.senderMessage
                    : [
                      styles.receiverMessage,
                      {
                        backgroundColor: isDark
                          ? appColors.darkThemeSub
                          : appColors.white,
                      },
                    ],
                ]}
              >
                {item.message && (
                  <Text
                    style={[
                      styles.messageText,
                      !isMe
                        ? [
                          styles.senderMessageText,
                          {
                            color: isDark
                              ? appColors.darkText
                              : appColors.primaryFont,
                          },
                          { textAlign: rtl ? 'right' : 'left' },
                        ]
                        : [
                          styles.receiverMessageText,
                          {
                            color: isDark
                              ? appColors.white
                              : appColors.graybackground,
                          },
                        ],
                    ]}
                  >
                    {item.message}
                  </Text>
                )}

                {/* multiple images with tap for full screen */}
                {item.images && (
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      marginTop: 5,
                    }}
                  >
                    {(Array.isArray(item.images)
                      ? item.images
                      : [item.images]
                    ).map((img: any, idx: number) => {
                      const imgUri = typeof img === 'string' ? img : img.url;
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => setFullScreenImage(imgUri)}
                        >
                          <Image
                            source={{ uri: imgUri }}
                            style={{
                              width: 120,
                              height: 120,
                              borderRadius: 8,
                              margin: 3,
                            }}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Text
                  style={[
                    styles.messageText,
                    !isMe
                      ? [
                        styles.senderMessageTime,
                        { textAlign: rtl ? 'right' : 'left' },
                      ]
                      : [
                        styles.receiverMessageTime,
                        { textAlign: rtl ? 'left' : 'right' },
                      ],
                  ]}
                >
                  {timestamp}
                </Text>
              </View>
            </View>
          )
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[appColors.primary]}
            tintColor={appColors.primary}
          />
        }
      />

      {/* Selected image previews before sending */}
      {selectedImages?.length > 0 && (
        <ScrollView horizontal style={{ padding: 5 }}>
          {selectedImages.map((asset, idx) => (
            <Image
              key={idx}
              source={{ uri: asset.uri }}
              style={{ width: 70, height: 70, borderRadius: 8, marginRight: 5 }}
            />
          ))}
        </ScrollView>
      )}

      {/* Input */}
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.background, flexDirection: viewRtlStyle },
        ]}
      >
        <View
          style={[
            styles.textInputView,
            { backgroundColor: colors.card, flexDirection: viewRtlStyle },
          ]}
        >
          <TouchableOpacity activeOpacity={0.7} onPress={pickImages}>
            <Icons.clip />
          </TouchableOpacity>
          <TextInput
            style={[
              styles.input,
              { textAlign: textRtlStyle, color: colors.text },
            ]}
            value={input}
            onChangeText={setInput}
            placeholder={`${translateData.typeHere}`}
            multiline
            placeholderTextColor={appColors.secondaryFont}
          />
          <TouchableOpacity
            style={styles.sendButton}
            onPress={sendMessage}
            activeOpacity={0.7}
          >
            <Icons.SendChat />
          </TouchableOpacity>
        </View>
      </View>

      {uploading && (
        <ActivityIndicator
          size="small"
          color={appColors.primary}
          style={{ marginVertical: 10 }}
        />
      )}

      {/* Fullscreen modal */}
      <Modal
        visible={!!fullScreenImage}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenImage(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.9)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setFullScreenImage(null)}
        >
          {fullScreenImage && (
            <Image
              source={{ uri: fullScreenImage }}
              style={{
                width: '95%',
                height: '80%',
                resizeMode: 'contain',
                borderRadius: 10,
              }}
            />
          )}
        </Pressable>
      </Modal>
    </View>
  )
}
