// @flow

import { Platform } from 'react-native'
import { CustomTabs } from 'react-native-custom-tabs'
import SafariView from 'react-native-safari-view'

export const useUrlHandler = (url: string): (() => void) => {
  return () => {
    if (Platform.OS === 'ios') SafariView.show({ url })
    else CustomTabs.openURL(url)
  }
}
