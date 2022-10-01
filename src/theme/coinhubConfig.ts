import { AppConfig } from '../types/types'
import { coinhubDark } from './variables/coinhubDark'
import { edgeLight } from './variables/edgeLight'

export const coinhubConfig: AppConfig = {
  appId: 'coinhub',
  appName: 'Coinhub Wallet',
  appNameShort: 'Coinhub',
  appStore: 'https://itunes.apple.com/app/id1344400091',
  configName: 'coinhub',
  darkTheme: coinhubDark,
  defaultWallets: ['BTC', 'ETH', 'LTC', 'BCH', 'DASH'],
  knowledgeBase: 'https://support.edge.app/support/home',
  lightTheme: edgeLight,
  notificationServers: ['https://notif1.edge.app'],
  phoneNumber: '+1-702-530-1530',
  referralServers: ['https://referral1.edge.app'],
  supportsEdgeLogin: false,
  supportEmail: 'support@coinhubatm.app',
  supportSite: 'https://coinhubatm.app/contactus',
  termsOfServiceSite: 'https://coinhubatm.app/tcs/',
  website: 'https://coinhubatm.app',
  extraTab: {
    webviewUrl: 'https://coinhubatm.app',
    tabTitleKey: 'title_map',
    extraTabBarIconFont: 'Feather',
    extraTabBarIconName: 'map-pin'
  }
}
