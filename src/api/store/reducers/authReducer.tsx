import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  userLogin,
  userRegistration,
  userVerifyOtp,
  userMailLogin,
  socialLogin,

  fleetRegistration,
  fleetsLogin,
  fleetsVerifyOtp
} from '../action/authActions'
import { AuthInterface } from '../../interface/authInterface'

const initialState: AuthInterface = {
  user: {},
  token: '',
  loading: false,
  success: false,
  fcmToken: '',
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    updateToken(state, action: PayloadAction<string>) {
      state.fcmToken = action.payload
    },
    updateLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
  },
  extraReducers: builder => {
    //Login Cases
    builder.addCase(userLogin.pending, (state, action) => {
      state.loading = true
    })
    builder.addCase(userLogin.fulfilled, (state, action) => {
      state.loading = false
    })
    builder.addCase(socialLogin.pending, state => {
      state.loading = true
    })
    builder.addCase(socialLogin.fulfilled, (state, action) => {
      state.loading = false
      state.user = action.payload?.data || action.payload || {}
    })
    builder.addCase(socialLogin.rejected, state => {
      state.loading = false
    })

    //Register Cases
    builder.addCase(userRegistration.pending, (state, action) => {
      state.loading = true
    })
    builder.addCase(userRegistration.fulfilled, (state, action) => {
      state.loading = false
    })

    //verify OTP
    builder.addCase(userVerifyOtp.pending, (state, action) => {
      state.loading = true
    })
    builder.addCase(userVerifyOtp.fulfilled, (state, action) => {
      state.loading = false
    })
    builder.addCase(userVerifyOtp.rejected, (state, action) => {
      state.loading = false
    })

    //fleet login
    builder.addCase(fleetsLogin.pending, (state, action) => {
      state.loading = true
    })
    builder.addCase(fleetsLogin.fulfilled, (state, action) => {
      state.loading = false
    })

    //fleet Register Cases
    builder.addCase(fleetRegistration.pending, (state, action) => {
      state.loading = true
    })
    builder.addCase(fleetRegistration.fulfilled, (state, action) => {
      state.loading = false
    })

    //fleet verify OTP
    builder.addCase(fleetsVerifyOtp.pending, (state, action) => {
      state.loading = true
    })
    builder.addCase(fleetsVerifyOtp.fulfilled, (state, action) => {
      state.loading = false
    })
    builder.addCase(fleetsVerifyOtp.rejected, (state, action) => {
      state.loading = false
    })






    //LoginWithmail Cases
    builder.addCase(userMailLogin.pending, (state, action) => {
      state.loading = true
    })
    builder.addCase(userMailLogin.fulfilled, (state, action) => {
      state.loading = false
    })
    builder.addCase(userMailLogin.rejected, state => {
      state.loading = false
    })
  },
})
export const { updateToken, updateLoading } = authSlice.actions
export default authSlice.reducer
