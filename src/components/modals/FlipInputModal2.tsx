// import * as React from 'react'
// import { TouchableWithoutFeedback, View } from 'react-native'
// import { AirshipBridge } from 'react-native-airship'
// import { cacheStyles } from 'react-native-patina'

// import { MINIMUM_DEVICE_HEIGHT } from '../../constants/constantSettings'
// import { deviceHeight } from '../../theme/variables/platform'
// import { Theme } from '../services/ThemeContext'
// import { ThemedModal } from '../themed/ThemedModal'

// export type FlipInputModalResult = {
//   nativeAmount: string
//   exchangeAmount: string
// }

// interface Props {
//   bridge: AirshipBridge<FlipInputModalResult>
//   walletId: string
//   currencyCode: string
//   onFeesChange?: () => void
//   onMaxSet?: () => void
//   onAmountChanged?: (nativeAmount: string, exchangeAmount: string) => void
//   headerText?: string
//   hideMaxButton?: boolean
// }

// const FlipInputModalComponent = (props: Props) => {
//   const { theme } = this.props
//   const styles = getStyles(theme)
//   return (
//     <ThemedModal bridge={props.bridge} onCancel={handleCloseModal}>
//       {/* Extra view needed here to fullscreen the modal on small devices */}
//       <View style={styles.hackContainer}>
//         <View style={styles.flipInput}>{renderFlipInput()}</View>
//         <TouchableWithoutFeedback onPress={handleFeesChange} style={styles.content}>
//           <View>
//             {renderFees()}
//             {renderExchangeRates()}
//             {renderBalance()}
//             {renderErrorMessge()}
//           </View>
//         </TouchableWithoutFeedback>
//       </View>
//     </ThemedModal>
//   )
// }

// export const FlipInputModal2 = React.memo(FlipInputModalComponent)

// const getStyles = cacheStyles((theme: Theme) => ({
//   hackContainer: {
//     flex: deviceHeight <= MINIMUM_DEVICE_HEIGHT ? 1 : 0
//   },
//   flipInput: {
//     justifyContent: 'flex-start'
//   },
//   content: {
//     justifyContent: 'flex-end'
//   },
//   headerContainer: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center'
//   },
//   headerMaxAmountText: {
//     color: theme.textLink
//   },
//   primaryTitle: {
//     color: theme.secondaryText
//   },
//   secondaryTitle: {
//     flex: 1,
//     fontSize: theme.rem(0.75),
//     color: theme.secondaryText
//   },
//   rateBalanceContainer: {
//     flexDirection: 'row'
//   },
//   exchangeRateErrorText: {
//     fontSize: theme.rem(0.75),
//     color: theme.dangerText
//   },
//   rateBalanceText: {
//     fontSize: theme.rem(0.75)
//   },
//   feeContainer: {
//     flexDirection: 'row',
//     marginTop: theme.rem(0.5),
//     marginBottom: theme.rem(1)
//   },
//   feeTitleContainer: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center'
//   },
//   feeTextDefault: {
//     color: theme.primaryText
//   },
//   feeTextWarning: {
//     color: theme.warningText
//   },
//   feeTextDanger: {
//     color: theme.dangerText
//   },
//   feeIcon: {
//     color: theme.iconTappable,
//     marginLeft: theme.rem(0.5)
//   }
// }))
