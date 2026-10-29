import {
  login,
  register,
  verifyOtp,
  mailLogin,

  fleetLogin,
  fleetRegister,
  fleetVerifyOtp,
  socialLogin as socialLoginEndpoint,
} from '../endpoints/authEndPoints'
import {
  DriverLoginInterface,
  DriverRegistrationPayload,
  VerifyOtpInterface,
  UserLoginEmailInterface,

  FleetLoginInterface,
  FleetVerifyOtpInterface,
  FleetRegistrationPayload,
  SocialLoginInterface,
} from '../interface/authInterface'
import { GET_API, POST_API } from '../methods'

// POST_API returns transport errors as values. On a phone, a DNS/TLS/network
// failure has no `response`, so returning `e?.response` silently turns it into
// `undefined` and the login screen can only show a misleading generic message.
const throwIfTransportFailed = (res: any) => {
  if (!res || (!res.status && !res.data)) {
    throw new Error(
      res?.message || 'Unable to reach the server. Check your internet connection and try again.',
    )
  }
  return res
}

export const userLogin = async (data: DriverLoginInterface) => {
  return throwIfTransportFailed(await POST_API(data, login))
}

export const socialLogin = async (data: SocialLoginInterface) => {
  return throwIfTransportFailed(await POST_API(data, socialLoginEndpoint))
}

export const fleetsLogin = async (data: FleetLoginInterface) => {
  return throwIfTransportFailed(await POST_API(data, fleetLogin))
}

export const userVerifyOtp = async (data: VerifyOtpInterface) => {
  return throwIfTransportFailed(await POST_API(data, verifyOtp))
}

export const fleetsVerifyOtp = async (data: FleetVerifyOtpInterface) => {
  return throwIfTransportFailed(await POST_API(data, fleetVerifyOtp))
}

export const userRegistration = async (data: DriverRegistrationPayload) => {
  return throwIfTransportFailed(await POST_API(data, register))
}

export const fleetRegistration = async (data: FleetRegistrationPayload) => {
  return throwIfTransportFailed(await POST_API(data, fleetRegister))
}

export const userMailLogin = async (data: UserLoginEmailInterface) => {
  const res = await POST_API(
    { email_or_phone: data.email, fcm_token: data.fcm_token ?? null },
    mailLogin,
  )

  // POST_API returns transport errors as values; rethrow them so callers can
  // show a connection error instead of treating the request as successful.
  if (!res?.data) {
    throw res
  }

  return res
}



const authServices = {
  userLogin,
  socialLogin,
  userRegistration,
  userVerifyOtp,
  userMailLogin,

  fleetsLogin,
  fleetsVerifyOtp,
  fleetRegistration,
}

export default authServices
