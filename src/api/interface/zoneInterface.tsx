export interface ZoneUpdatePayload {
  success?: boolean
  locations?: locationDataPayload
  rentalZones?: rentalZoneInterface
  zoneValue?: currentZoneInterface
  driverStatus?: driverStatusPayload
  loading?: boolean
  is_online?: number | string
  location?: locationDataPayload
}

export interface locationDataPayload {
  lat: number
  lng: number
}

export interface rentalZoneInterface { }

export interface currentZoneInterface { }

export interface driverStatusPayload {
}