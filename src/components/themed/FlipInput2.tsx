// import * as React from 'react'
// import { Image, Platform, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
// import IonIcon from 'react-native-vector-icons/Ionicons'
// import { useHandler } from '../../hooks/useHandler'

// import { Card } from '../cards/Card'
// import { SceneWrapper } from '../common/SceneWrapper'
// import { cacheStyles, Theme, useTheme } from '../services/ThemeContext'
// import { MainButton } from './MainButton'
// import { OutlinedTextInput } from './OutlinedTextInput'
// import { SceneHeader } from './SceneHeader'

// export interface FlipInputGetMethodsResponse {
//   setValue1: (value: string) => void
//   setValue2: (value: string) => void
// }

// interface Props {
//   currencyCodes: string[]
//   onChangeText: (fieldNum: number, value: string) => Promise<void>
//   convertValue: (sourceFieldNum: number, value: string) => Promise<string | undefined>
//   getMethods?: (methods: FlipInputGetMethodsResponse) => void
//   initialAmount1?: string
// }

// export const FlipInput2 = React.memo((props: Props) => {
//   const theme = useTheme()
//   const styles = getStyles(theme)
//   const { currencyCodes } = props
//   if (currencyCodes.length !== 2) throw new Error('Must have 2 currency codes')

//   const bottomRow = useHandler((isFront: boolean) => {
//     return (
//       <TouchableWithoutFeedback onPress={onPress}>
//         <View style={styles.bottomContainer} key="bottom">
//           {displayAmount === '' ? (
//             <View style={styles.valueContainer}>
//               <BlinkingCursor showCursor={showCursor} />
//               <EdgeText style={displayAmountStyle}>{displayAmountString}</EdgeText>
//             </View>
//           ) : (
//             <View style={styles.valueContainer}>
//               <EdgeText style={displayAmountStyle}>{displayAmountString}</EdgeText>
//               <BlinkingCursor showCursor={showCursor} />
//             </View>
//           )}
//           <EdgeText style={currencyNameStyle}>{currencyName}</EdgeText>
//           <TextInput
//             style={styles.hiddenTextInput}
//             value=""
//             onChangeText={onChangeText}
//             onKeyPress={onKeyPress}
//             autoCorrect={false}
//             keyboardType="numeric"
//             returnKeyType={topReturnKeyType}
//             ref={ref}
//             onFocus={onFocus}
//             onBlur={onBlur}
//             editable={isEditable}
//             onSubmitEditing={onNext}
//             inputAccessoryViewID={inputAccessoryViewID}
//           />
//         </View>
//       </TouchableWithoutFeedback>
//     )
//   })

//   const topRow = useHandler((fieldInfo: FlipInputFieldInfo, amount: string) => {
//     const bottomText = `${amount} ${fieldInfo.currencyName}`
//     return (
//       <TouchableWithoutFeedback onPress={this.onToggleFlipInput} key="bottom">
//         <EdgeText>{bottomText}</EdgeText>
//       </TouchableWithoutFeedback>
//     )
//   })

//   return (
//     <>
//       <TouchableOpacity onPress={headerCallback} style={styles.headerContainer}>
//         <CryptoIcon pluginId={primaryInfo.pluginId} currencyCode={primaryInfo.currencyCode} marginRem={[0, 1, 0, 0]} sizeRem={1.5} />
//         {headerCallback ? <RightChevronButton text={headerText} onPress={headerCallback} /> : <EdgeText style={styles.headerText}>{headerText}</EdgeText>}
//       </TouchableOpacity>
//       <View style={styles.clipboardContainer}>
//         {/* @ts-expect-error */}
//         <Menu onSelect={this.handlePasteClipboard} ref={this.clipboardRef} renderer={renderers.Popover} rendererProps={{ placement: 'top' }}>
//           <MenuTrigger />
//           <MenuOptions>
//             <MenuOption>
//               <EdgeText style={styles.clipboardText}>{s.strings.string_paste}</EdgeText>
//             </MenuOption>
//           </MenuOptions>
//         </Menu>
//       </View>
//       <View style={styles.flipInputContainer}>
//         <View style={styles.flipInput}>
//           <Animated.View
//             style={[styles.flipInputFront, frontAnimatedStyle, { opacity: this.androidFrontOpacityInterpolate }]}
//             pointerEvents={isToggled ? 'none' : 'auto'}
//           >
//             {topRow(secondaryInfo, this.state.secondaryDisplayAmount)}
//             {bottomRow(true)}
//           </Animated.View>
//           <Animated.View
//             style={[styles.flipInputFront, styles.flipContainerBack, backAnimatedStyle, { opacity: this.androidBackOpacityInterpolate }]}
//             pointerEvents={isToggled ? 'auto' : 'none'}
//           >
//             {topRow(primaryInfo, this.state.primaryDisplayAmount)}
//             {bottomRow(false)}
//           </Animated.View>
//         </View>
//         <ButtonBox onPress={this.onToggleFlipInput} paddingRem={[0.5, 0, 0.5, 1]}>
//           <Fontello style={styles.flipIcon} name="exchange" color={theme.iconTappable} size={theme.rem(1.75)} />
//         </ButtonBox>
//       </View>
//     </>
//   )
//   )
// })

// const getStyles = cacheStyles((theme: Theme) => ({
//   // Header
//   headerContainer: {
//     marginRight: Platform.OS === 'ios' ? theme.rem(3.5) : theme.rem(1.5), // Different because adjustsFontSizeToFit behaves differently on android vs ios
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: theme.rem(1)
//   },
//   headerText: {
//     fontWeight: '600',
//     fontSize: theme.rem(1.0)
//   },

//   // Flip Input
//   flipInputContainer: {
//     flexDirection: 'row',
//     alignItems: 'center'
//   },
//   flipInput: {
//     flex: 1,
//     paddingRight: theme.rem(0.5)
//   },
//   flipInputFront: {
//     backfaceVisibility: 'hidden'
//   },
//   flipContainerBack: {
//     position: 'absolute',
//     top: 0,
//     bottom: 0,
//     left: 0,
//     right: 0
//   },
//   flipIcon: {
//     marginRight: -theme.rem(0.125)
//   },

//   // Top Amount
//   bottomContainer: {
//     flexDirection: 'row',
//     marginRight: theme.rem(1.5),
//     minHeight: theme.rem(2)
//   },
//   valueContainer: {
//     flexDirection: 'row',
//     marginRight: theme.rem(0.5)
//   },
//   bottomAmount: {
//     fontFamily: theme.fontFaceMedium,
//     fontSize: theme.rem(1.5),
//     minHeight: theme.rem(1.5)
//   },
//   bottomAmountMuted: {
//     fontFamily: theme.fontFaceMedium,
//     fontSize: theme.rem(1.5),
//     marginLeft: theme.rem(-0.1), // Hack because of amount being bigger font size not aligning to the rest of the text on justified left
//     color: theme.deactivatedText
//   },
//   bottomCurrency: {
//     paddingTop: theme.rem(0.125)
//   },
//   bottomCurrencyMuted: {
//     paddingTop: theme.rem(0.125),
//     color: theme.deactivatedText
//   },
//   blinkingCursor: {
//     color: theme.deactivatedText,
//     includeFontPadding: false
//   },
//   blinkingCursorandroidAdjust: {
//     top: -1
//   },
//   hiddenTextInput: {
//     position: 'absolute',
//     width: 0,
//     height: 0
//   },

//   // Clipboard Popup
//   clipboardContainer: {
//     height: 0,
//     width: '8%',
//     top: theme.rem(0.5),
//     alignItems: 'flex-end'
//   },
//   clipboardText: {
//     color: theme.clipboardPopupText,
//     padding: theme.rem(0.25)
//   }
// }))
