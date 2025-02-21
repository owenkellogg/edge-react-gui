import * as React from 'react'
import { StyleSheet, ViewStyle } from 'react-native'
import { AirshipBridge, AirshipModal } from 'react-native-airship'
import { BlurView } from 'rn-id-blurview'

import { fixSides } from '../../util/sides'
import { useTheme } from '../services/ThemeContext'

type Props<T> = {
  bridge: AirshipBridge<T>
  children?: React.ReactNode
  onCancel: () => void

  // Use this to create space at the top for an icon circle:
  iconRem?: number

  // Control over the content area:
  flexDirection?: ViewStyle['flexDirection']
  justifyContent?: ViewStyle['justifyContent']
  paddingRem?: number[] | number

  // Gives the box a border:
  warning?: boolean
}

/**
 * The Airship modal, but connected to our theming system.
 */
export function ThemedModal<T>(props: Props<T>) {
  const { bridge, children, flexDirection, iconRem = 0, justifyContent, warning = false, onCancel } = props
  const paddingRem = fixSides(props.paddingRem, 1)
  const theme = useTheme()

  paddingRem[0] += iconRem / 2

  // TODO: The warning styles are incorrectly hard-coded:
  const borderColor = warning ? theme.warningText : theme.modalBorderColor
  const borderWidth = warning ? 4 : theme.modalBorderWidth

  return (
    <AirshipModal
      bridge={bridge}
      backgroundColor={theme.modal}
      borderRadius={theme.rem(theme.modalBorderRadiusRem)}
      borderColor={borderColor}
      borderWidth={borderWidth}
      flexDirection={flexDirection}
      justifyContent={justifyContent}
      margin={[theme.rem(iconRem / 2), 0, 0]}
      onCancel={onCancel}
      padding={paddingRem.map(theme.rem)}
      underlay={<BlurView blurType={theme.isDark ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />}
    >
      {children}
    </AirshipModal>
  )
}
