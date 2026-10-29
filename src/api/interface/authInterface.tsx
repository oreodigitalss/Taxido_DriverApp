export interface AuthInterface {
  user: Record<string, unknown>
  token: string
  loading: boolean
  success: boolean
  fcmToken: string
}

export interface DriverLoginInterface {
  email_or_phone?: string
  country_code?: string
  fcm_token: string | null
}

export interface FleetLoginInterface {
  email_or_phone?: string
  country_code?: string
  fcm_token: string | null
}

export interface VerifyOtpInterface {
  email_or_phone?: string | null
  country_code?: string | null
  token: number | null | string
  email?: string | null
  fcm_token?: string | null
  phone?: string | number | null
}

export interface FleetVerifyOtpInterface {
  email_or_phone: string | null
  country_code: string | null
  token: number | null | string
  email: string | null
  fcm_token: string | null
}
export interface UserLoginEmailInterface {
  email?: string
  fcm_token?: string | null
}

export interface DriverRegistrationPayload { }

export interface FleetRegistrationPayload { }

export interface UserLoginInterface { }

export interface SocialLoginInterface {
  user?: {
    email?: string | null
    name?: string | null
    photo?: string | null
  }
  login_type?: string
  fcm_token?: string | null
  id_token?: string | null
}



