import type { TempoApi } from '../../shared/types'

declare global {
  interface Window {
    tempo?: TempoApi
  }
}
