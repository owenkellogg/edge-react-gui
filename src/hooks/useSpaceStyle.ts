import { ViewStyle } from 'react-native'

import { useTheme } from '../components/services/ThemeContext'

export type SpaceProps = {
  // Compond space adjectives:
  around?: boolean | number
  horizontal?: boolean | number
  vertical?: boolean | number
  inset?: boolean | number
  isFill?: boolean
  // Unit space adjectives:
  top?: boolean | number
  right?: boolean | number
  bottom?: boolean | number
  left?: boolean | number
  // Direction:
  isSideways?: boolean
  // Alignment:
  isGroupStart?: boolean
  isGroupCenter?: boolean
  isGroupEnd?: boolean
  isItemStart?: boolean
  isItemCenter?: boolean
  isItemEnd?: boolean
}

export const useSpaceStyle = (props: SpaceProps): ViewStyle => {
  const theme = useTheme()
  const { around, horizontal, vertical } = props
  let { inset } = props

  inset = inset != null ? (typeof inset === 'boolean' ? 1 : inset) : 0

  const flex = props.isFill ? 1 : undefined

  const top = numberify(around ?? vertical ?? props.top ?? 0) - inset
  const bottom = numberify(around ?? vertical ?? props.bottom ?? 0) - inset
  const left = numberify(around ?? horizontal ?? props.left ?? 0) - inset
  const right = numberify(around ?? horizontal ?? props.right ?? 0) - inset

  const paddingTop = theme.rem(typeof top === 'number' ? top : top ? 1 : 0)
  const paddingBottom = theme.rem(typeof bottom === 'number' ? bottom : bottom ? 1 : 0)
  const paddingLeft = theme.rem(typeof left === 'number' ? left : left ? 1 : 0)
  const paddingRight = theme.rem(typeof right === 'number' ? right : right ? 1 : 0)

  const marginTop = theme.rem(inset)
  const marginBottom = theme.rem(inset)
  const marginLeft = theme.rem(inset)
  const marginRight = theme.rem(inset)

  // Direction:
  const { isSideways: sideways = false } = props
  const flexDirection = sideways ? 'row' : 'column'

  // Alignment:
  const { isItemStart = false, isItemCenter = false, isItemEnd = false, isGroupStart = false, isGroupCenter = false, isGroupEnd = false } = props
  const alignItems = isItemStart ? 'flex-start' : isItemCenter ? 'center' : isItemEnd ? 'flex-end' : undefined
  const justifyContent = isGroupStart ? 'flex-start' : isGroupCenter ? 'center' : isGroupEnd ? 'flex-end' : undefined

  return {
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    flex,
    flexDirection,
    alignItems,
    justifyContent
  }
}

const numberify = (thing: boolean | number): number => (typeof thing === 'number' ? thing : thing ? 1 : 0)
