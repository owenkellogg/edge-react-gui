import {
  asMaybeNoAmountSpecifiedError,
  EdgeAccount,
  EdgeCurrencyWallet,
  EdgeDenomination,
  EdgeMetadata,
  EdgeParsedUri,
  EdgeSpendTarget,
  EdgeTransaction
} from 'edge-core-js'
import * as React from 'react'
import { TextInput, View } from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'
import { sprintf } from 'sprintf-js'

import { FioSenderInfo, sendConfirmationUpdateTx, signBroadcastAndSave } from '../../actions/SendConfirmationActions'
import { selectWallet } from '../../actions/WalletActions'
import { FIO_STR, getSpecialCurrencyInfo } from '../../constants/WalletAndCurrencyConstants'
import s from '../../locales/strings'
import { checkRecordSendFee, FIO_NO_BUNDLED_ERR_CODE } from '../../modules/FioAddress/util'
import { getDisplayDenominationFromState, getExchangeDenominationFromState } from '../../selectors/DenominationSelectors'
import { connect } from '../../types/reactRedux'
import { NavigationProp, RouteProp } from '../../types/routerTypes'
import { GuiExchangeRates, GuiMakeSpendInfo } from '../../types/types'
import { getWalletName } from '../../util/CurrencyWalletHelpers'
import { convertTransactionFeeToDisplayFee } from '../../util/utils'
import { ScamWarningCard } from '../cards/ScamWarningCard'
import { SceneWrapper } from '../common/SceneWrapper'
import { ButtonsModal } from '../modals/ButtonsModal'
import { FlipInputModal, FlipInputModalResult } from '../modals/FlipInputModal'
import { TextInputModal } from '../modals/TextInputModal'
import { WalletListModal, WalletListResult } from '../modals/WalletListModal'
import { Airship, showError } from '../services/AirshipInstance'
import { cacheStyles, Theme, ThemeProps, withTheme } from '../services/ThemeContext'
import { EdgeText } from '../themed/EdgeText'
import { PinDots } from '../themed/PinDots'
import { SafeSlider } from '../themed/SafeSlider'
import { SelectFioAddress } from '../themed/SelectFioAddress'
import { AddressTile, AddressTileRef } from '../tiles/AddressTile'
import { EditableAmountTile } from '../tiles/EditableAmountTile'
import { ErrorTile } from '../tiles/ErrorTile'
import { Tile } from '../tiles/Tile'

const PIN_MAX_LENGTH = 4

type StateProps = {
  account: EdgeAccount
  authRequired: 'pin' | 'none'
  defaultSelectedWalletId: string
  defaultSelectedWalletCurrencyCode: string
  error: Error | null
  exchangeRates: GuiExchangeRates
  nativeAmount: string | null
  pin: string
  sliderDisabled: boolean
  transaction: EdgeTransaction | null
  transactionMetadata: EdgeMetadata | null
  isSendUsingFioAddress?: boolean
  guiMakeSpendInfo: GuiMakeSpendInfo
  maxSpendSet: boolean
  currencyWallets: { [walletId: string]: EdgeCurrencyWallet }
}

type DispatchProps = {
  reset: () => void
  sendConfirmationUpdateTx: (guiMakeSpendInfo: GuiMakeSpendInfo, selectedWalletId?: string, selectedCurrencyCode?: string, isFeeChanged?: boolean) => void
  signBroadcastAndSave: (
    fioSender: FioSenderInfo | undefined,
    selectedWalletId: string | undefined,
    selectedCurrencyCode: string | undefined,
    resetSlider: () => void
  ) => Promise<void>
  onChangePin: (pin: string) => void
  selectWallet: (walletId: string, currencyCode: string) => void
  getExchangeDenomination: (pluginId: string, currencyCode: string) => EdgeDenomination
  getDisplayDenomination: (pluginId: string, currencyCode: string) => EdgeDenomination
}

type OwnProps = {
  navigation: NavigationProp<'send'>
  route: RouteProp<'send'>
}
type Props = OwnProps & StateProps & DispatchProps & ThemeProps

type WalletStates = {
  selectedWalletId: string
  selectedCurrencyCode: string
  wallet: EdgeCurrencyWallet
  coreWallet?: EdgeCurrencyWallet
}

type State = {
  recipientAddress: string
  fioSender: FioSenderInfo
} & WalletStates

class SendComponent extends React.PureComponent<Props, State> {
  addressTile: AddressTileRef | null = null
  pinInput: { current: TextInput | null } = React.createRef()

  constructor(props: Props) {
    super(props)
    const { route } = props
    const { selectedWalletId, selectedCurrencyCode, guiMakeSpendInfo } = route.params
    const fioPendingRequest = guiMakeSpendInfo?.fioPendingRequest
    this.state = {
      recipientAddress: '',
      fioSender: {
        fioAddress: fioPendingRequest?.payer_fio_address ?? '',
        fioWallet: null,
        fioError: '',
        memo: fioPendingRequest?.content.memo ?? '',
        memoError: ''
      },
      ...this.setWallets(props, selectedWalletId, selectedCurrencyCode)
    }
  }

  setWallets(props: Props, selectedWalletId?: string, selectedCurrencyCode?: string): WalletStates {
    const { account, defaultSelectedWalletId, defaultSelectedWalletCurrencyCode, currencyWallets } = this.props
    const walletId = selectedWalletId || defaultSelectedWalletId
    const currencyCode = selectedCurrencyCode || defaultSelectedWalletCurrencyCode
    return {
      selectedWalletId: walletId,
      selectedCurrencyCode: currencyCode,
      wallet: currencyWallets[walletId],
      coreWallet: account && account.currencyWallets ? account.currencyWallets[walletId] : undefined
    }
  }

  componentDidMount(): void {
    const { route } = this.props
    const { guiMakeSpendInfo } = route.params
    if (guiMakeSpendInfo != null) {
      this.updateSendConfirmationTx(guiMakeSpendInfo)
    }
  }

  componentWillUnmount() {
    this.props.reset()
    const { route } = this.props
    const { guiMakeSpendInfo } = route.params
    if (guiMakeSpendInfo && guiMakeSpendInfo.onBack) {
      guiMakeSpendInfo.onBack()
    }
  }

  componentDidUpdate(prevProps: Props): void {
    if (prevProps.route.params.guiMakeSpendInfo == null && this.props.route.params.guiMakeSpendInfo != null) {
      this.updateSendConfirmationTx(this.props.route.params.guiMakeSpendInfo)
    }
  }

  updateSendConfirmationTx = (guiMakeSpendInfo: GuiMakeSpendInfo) => {
    this.props.sendConfirmationUpdateTx(guiMakeSpendInfo, this.state.selectedWalletId, this.state.selectedCurrencyCode)
    const recipientAddress =
      guiMakeSpendInfo && guiMakeSpendInfo.publicAddress
        ? guiMakeSpendInfo.publicAddress
        : guiMakeSpendInfo.spendTargets && guiMakeSpendInfo.spendTargets[0].publicAddress
        ? guiMakeSpendInfo.spendTargets[0].publicAddress
        : ''
    this.setState({ recipientAddress })
  }

  resetSendTransaction = () => {
    this.props.reset()
    this.setState({ recipientAddress: '' })
  }

  handleWalletPress = () => {
    const { selectWallet, route } = this.props
    const prevCurrencyCode = this.state.selectedCurrencyCode

    Airship.show<WalletListResult>(bridge => (
      <WalletListModal bridge={bridge} headerTitle={s.strings.fio_src_wallet} allowedCurrencyCodes={route.params.allowedCurrencyCodes} />
    ))
      .then(({ walletId, currencyCode }: WalletListResult) => {
        if (walletId == null || currencyCode == null) return
        selectWallet(walletId, currencyCode)
        this.setState({
          ...this.state,
          ...this.setWallets(this.props, walletId, currencyCode),
          recipientAddress: ''
        })

        if (this.addressTile == null) return
        if (currencyCode !== prevCurrencyCode) return this.resetSendTransaction()
        this.addressTile.onChangeAddress(this.state.recipientAddress)
      })
      .catch(error => console.log(error))
  }

  handleChangeAddress = async (newGuiMakeSpendInfo: GuiMakeSpendInfo, parsedUri?: EdgeParsedUri) => {
    const { sendConfirmationUpdateTx, route } = this.props
    const { guiMakeSpendInfo } = route.params
    const { spendTargets } = newGuiMakeSpendInfo
    const recipientAddress = parsedUri ? parsedUri.publicAddress : spendTargets && spendTargets[0].publicAddress ? spendTargets[0].publicAddress : ''

    if (parsedUri) {
      const nativeAmount = parsedUri.nativeAmount || ''
      const otherParams = {}
      if (newGuiMakeSpendInfo.fioAddress != null) {
        // @ts-expect-error
        otherParams.fioAddress = newGuiMakeSpendInfo.fioAddress
        // @ts-expect-error
        otherParams.isSendUsingFioAddress = newGuiMakeSpendInfo.isSendUsingFioAddress
      }
      const spendTargets: EdgeSpendTarget[] = [
        {
          publicAddress: parsedUri.publicAddress,
          nativeAmount,
          otherParams
        }
      ]
      newGuiMakeSpendInfo = {
        ...guiMakeSpendInfo,
        spendTargets,
        lockInputs: false,
        metadata: parsedUri.metadata,
        uniqueIdentifier: parsedUri.uniqueIdentifier,
        nativeAmount,
        ...newGuiMakeSpendInfo
      }
    }
    sendConfirmationUpdateTx(newGuiMakeSpendInfo, this.state.selectedWalletId, this.state.selectedCurrencyCode)
    // @ts-expect-error
    this.setState({ recipientAddress })
  }

  handleFlipInputModal = () => {
    Airship.show<FlipInputModalResult>(bridge => (
      <FlipInputModal
        bridge={bridge}
        onFeesChange={this.handleFeesChange}
        walletId={this.state.selectedWalletId}
        currencyCode={this.state.selectedCurrencyCode}
      />
    )).catch(error => console.log(error))
  }

  handleFeesChange = () => {
    const { navigation, sendConfirmationUpdateTx, guiMakeSpendInfo, maxSpendSet } = this.props
    if (this.state.coreWallet == null) return
    navigation.navigate('changeMiningFee', {
      guiMakeSpendInfo,
      maxSpendSet,
      wallet: this.state.coreWallet,
      onSubmit: (networkFeeOption, customNetworkFee) => {
        sendConfirmationUpdateTx(
          { ...guiMakeSpendInfo, customNetworkFee, networkFeeOption },
          this.state.selectedWalletId,
          this.state.selectedCurrencyCode,
          true
        )
      }
    })
  }

  handleFioAddressSelect = (fioAddress: string, fioWallet: EdgeCurrencyWallet, fioError: string) => {
    this.setState({
      fioSender: {
        ...this.state.fioSender,
        fioAddress,
        fioWallet,
        fioError
      }
    })
  }

  handleMemoChange = (memo: string, memoError: string) => {
    this.setState({
      fioSender: {
        ...this.state.fioSender,
        memo,
        memoError
      }
    })
  }

  handleFocusPin = () => {
    if (this.pinInput && this.pinInput.current) {
      this.pinInput.current.focus()
    }
  }

  handleChangePin = (pin: string) => {
    this.props.onChangePin(pin)
    if (pin.length >= PIN_MAX_LENGTH && this.pinInput.current != null) {
      this.pinInput.current.blur()
    }
  }

  submitFio = async (isFioPendingRequest: boolean, resetSlider: () => void) => {
    const { fioSender } = this.state
    const { signBroadcastAndSave } = this.props
    const { selectedWalletId, selectedCurrencyCode } = this.state

    try {
      if (fioSender?.fioWallet != null && fioSender?.fioAddress != null && !isFioPendingRequest) {
        await checkRecordSendFee(fioSender.fioWallet, fioSender.fioAddress)
      }
      await signBroadcastAndSave(fioSender, selectedWalletId, selectedCurrencyCode, resetSlider)
    } catch (e: any) {
      if (e.code && e.code === FIO_NO_BUNDLED_ERR_CODE && selectedCurrencyCode !== FIO_STR) {
        const answer = await Airship.show<'ok' | 'cancel' | undefined>(bridge => (
          <ButtonsModal
            bridge={bridge}
            title={s.strings.fio_no_bundled_err_msg}
            message={`${s.strings.fio_no_bundled_non_fio_err_msg} ${s.strings.fio_no_bundled_add_err_msg}`}
            buttons={{
              ok: { label: s.strings.legacy_address_modal_continue },
              cancel: { label: s.strings.string_cancel_cap }
            }}
          />
        ))
        if (answer === 'ok') {
          fioSender.skipRecord = true
          await signBroadcastAndSave(fioSender, selectedWalletId, selectedCurrencyCode, resetSlider)
        }
      } else {
        showError(e)
      }
    }
  }

  submit = async (resetSlider: () => void) => {
    const { isSendUsingFioAddress, signBroadcastAndSave, route } = this.props
    const { guiMakeSpendInfo } = route.params
    const { selectedWalletId, selectedCurrencyCode } = this.state

    const isFioPendingRequest = !!guiMakeSpendInfo?.fioPendingRequest

    if (isSendUsingFioAddress || isFioPendingRequest) {
      await this.submitFio(isFioPendingRequest, resetSlider)
    } else {
      await signBroadcastAndSave(undefined, selectedWalletId, selectedCurrencyCode, resetSlider)
    }
  }

  renderSelectedWallet() {
    const {
      guiMakeSpendInfo: { lockInputs },
      route
    } = this.props
    const { lockTilesMap = {} } = route.params

    const { wallet, selectedCurrencyCode } = this.state
    const name = wallet == null ? '' : getWalletName(wallet)

    return (
      <Tile
        type={lockInputs || lockTilesMap.wallet ? 'static' : 'editable'}
        title={s.strings.send_scene_send_from_wallet}
        onPress={lockInputs || lockTilesMap.wallet ? undefined : this.handleWalletPress}
        body={`${name} (${selectedCurrencyCode})`}
      />
    )
  }

  renderAddressTile() {
    const {
      route,
      guiMakeSpendInfo: { lockInputs }
    } = this.props
    const { isCameraOpen, lockTilesMap = {}, hiddenTilesMap = {} } = route.params
    const { recipientAddress, coreWallet, selectedCurrencyCode } = this.state

    if (coreWallet && !hiddenTilesMap.address) {
      return (
        <AddressTile
          title={s.strings.send_scene_send_to_address}
          recipientAddress={recipientAddress}
          coreWallet={coreWallet}
          currencyCode={selectedCurrencyCode}
          onChangeAddress={this.handleChangeAddress}
          resetSendTransaction={this.resetSendTransaction}
          lockInputs={lockInputs || lockTilesMap.address}
          isCameraOpen={!!isCameraOpen}
          ref={ref => (this.addressTile = ref)}
        />
      )
    }

    return null
  }

  renderScamWarning() {
    const { recipientAddress } = this.state
    if (recipientAddress === '') {
      return <ScamWarningCard marginRem={[1.5, 1]} />
    }
    return null
  }

  renderAmount() {
    const {
      exchangeRates,
      guiMakeSpendInfo: { lockInputs },
      nativeAmount,
      route,
      currencyWallets,
      getExchangeDenomination,
      getDisplayDenomination
    } = this.props
    const { lockTilesMap = {}, hiddenTilesMap = {} } = route.params
    const { selectedCurrencyCode, recipientAddress } = this.state

    if (recipientAddress && !hiddenTilesMap.amount) {
      const cryptoDisplayDenomination = getDisplayDenomination(currencyWallets[this.state.selectedWalletId].currencyInfo.pluginId, selectedCurrencyCode)
      const cryptoExchangeDenomination = getExchangeDenomination(currencyWallets[this.state.selectedWalletId].currencyInfo.pluginId, selectedCurrencyCode)

      return (
        <EditableAmountTile
          title={s.strings.fio_request_amount}
          exchangeRates={exchangeRates}
          nativeAmount={nativeAmount ?? '0'}
          wallet={currencyWallets[this.state.selectedWalletId]}
          currencyCode={selectedCurrencyCode}
          exchangeDenomination={cryptoExchangeDenomination}
          displayDenomination={cryptoDisplayDenomination}
          lockInputs={lockInputs || (lockTilesMap.amount ?? false)}
          onPress={this.handleFlipInputModal}
        />
      )
    }

    return null
  }

  renderError() {
    const { error } = this.props
    if (error && asMaybeNoAmountSpecifiedError(error) == null) {
      return <ErrorTile message={error.message} />
    }
    return null
  }

  renderFees() {
    const { exchangeRates, transaction, theme, currencyWallets, getDisplayDenomination, getExchangeDenomination } = this.props
    const { selectedWalletId, recipientAddress } = this.state

    if (recipientAddress) {
      const wallet = currencyWallets[selectedWalletId]
      const { noChangeMiningFee } = getSpecialCurrencyInfo(wallet.currencyInfo.pluginId)
      const feeDisplayDenomination = getDisplayDenomination(wallet.currencyInfo.pluginId, wallet.currencyInfo.currencyCode)
      const feeDefaultDenomination = getExchangeDenomination(wallet.currencyInfo.pluginId, wallet.currencyInfo.currencyCode)
      const transactionFee = convertTransactionFeeToDisplayFee(wallet, exchangeRates, transaction, feeDisplayDenomination, feeDefaultDenomination)

      const fiatAmount = transactionFee.fiatAmount === '0' ? '0' : ` ${transactionFee.fiatAmount}`
      const feeSyntax = `${transactionFee.cryptoSymbol ?? ''} ${transactionFee.cryptoAmount} (${transactionFee.fiatSymbol ?? ''}${fiatAmount})`
      const feeSyntaxStyle = transactionFee.fiatStyle

      return (
        <Tile type={noChangeMiningFee ? 'static' : 'touchable'} title={`${s.strings.string_fee}:`} onPress={this.handleFeesChange}>
          <EdgeText
            style={{
              // @ts-expect-error
              color: feeSyntaxStyle ? theme[feeSyntaxStyle] : theme.primaryText
            }}
          >
            {feeSyntax}
          </EdgeText>
        </Tile>
      )
    }

    return null
  }

  renderMetadataNotes() {
    const { transactionMetadata } = this.props

    if (transactionMetadata && transactionMetadata.notes) {
      return (
        <Tile type="static" title={s.strings.send_scene_metadata_name_title}>
          <EdgeText>{transactionMetadata.notes}</EdgeText>
        </Tile>
      )
    }

    return null
  }

  renderSelectFioAddress() {
    const { isSendUsingFioAddress, route } = this.props
    const { fioSender } = this.state
    const { hiddenTilesMap = {}, guiMakeSpendInfo } = route.params
    const fioPendingRequest = guiMakeSpendInfo?.fioPendingRequest

    if (hiddenTilesMap.fioAddressSelect) return null
    return (
      <View>
        <SelectFioAddress
          selected={fioSender.fioAddress}
          memo={fioSender.memo}
          memoError={fioSender.memoError}
          onSelect={this.handleFioAddressSelect}
          onMemoChange={this.handleMemoChange}
          fioRequest={fioPendingRequest}
          isSendUsingFioAddress={isSendUsingFioAddress}
        />
      </View>
    )
  }

  renderUniqueIdentifier() {
    const {
      guiMakeSpendInfo: { uniqueIdentifier },
      currencyWallets
    } = this.props
    const { recipientAddress, selectedWalletId } = this.state
    const edgeWallet = currencyWallets[selectedWalletId]
    const { uniqueIdentifierInfo } = getSpecialCurrencyInfo(edgeWallet.currencyInfo.pluginId)

    if (recipientAddress && uniqueIdentifierInfo != null) {
      const { addButtonText, identifierName, keyboardType } = uniqueIdentifierInfo

      const handleUniqueIdentifier = () => {
        Airship.show<string | undefined>(bridge => (
          <TextInputModal
            bridge={bridge}
            inputLabel={identifierName}
            keyboardType={keyboardType}
            message={sprintf(s.strings.unique_identifier_modal_description, identifierName)}
            submitLabel={s.strings.unique_identifier_modal_confirm}
            title={identifierName}
            maxLength={this.state.coreWallet?.currencyInfo?.memoMaxLength}
          />
        )).then(uniqueIdentifier => {
          if (uniqueIdentifier == null) return
          this.props.sendConfirmationUpdateTx({ uniqueIdentifier })
        })
      }

      return (
        <Tile type="touchable" title={identifierName} onPress={handleUniqueIdentifier}>
          <EdgeText>{uniqueIdentifier ?? addButtonText}</EdgeText>
        </Tile>
      )
    }

    return null
  }

  renderInfoTiles() {
    const { route } = this.props
    const { infoTiles } = route.params

    if (!infoTiles || !infoTiles.length) return null
    return infoTiles.map(({ label, value }) => <Tile key={label} type="static" title={label} body={value} />)
  }

  renderAuthentication() {
    const { authRequired, pin, theme } = this.props
    const styles = getStyles(theme)

    if (authRequired === 'pin') {
      return (
        <Tile type="touchable" title={s.strings.four_digit_pin} onPress={this.handleFocusPin}>
          <View style={styles.pinContainer}>
            <PinDots pinLength={pin.length} maxLength={PIN_MAX_LENGTH} />
          </View>
          <TextInput
            ref={this.pinInput}
            maxLength={PIN_MAX_LENGTH}
            onChangeText={this.handleChangePin}
            keyboardType="numeric"
            returnKeyType="done"
            placeholder="Enter PIN"
            placeholderTextColor={theme.textLink}
            style={styles.pinInput}
            value={pin}
            secureTextEntry
          />
        </Tile>
      )
    }

    return null
  }

  // Render
  render() {
    const { sliderDisabled, theme } = this.props
    const { recipientAddress } = this.state
    const styles = getStyles(theme)

    return (
      <SceneWrapper background="theme">
        <KeyboardAwareScrollView extraScrollHeight={theme.rem(2.75)} enableOnAndroid>
          {this.renderSelectedWallet()}
          {this.renderAddressTile()}
          {this.renderScamWarning()}
          {this.renderAmount()}
          {this.renderError()}
          {this.renderFees()}
          {this.renderMetadataNotes()}
          {this.renderSelectFioAddress()}
          {this.renderUniqueIdentifier()}
          {this.renderInfoTiles()}
          {this.renderAuthentication()}
          <View style={styles.footer}>{!!recipientAddress && <SafeSlider onSlidingComplete={this.submit} disabled={sliderDisabled} />}</View>
        </KeyboardAwareScrollView>
      </SceneWrapper>
    )
  }
}

const getStyles = cacheStyles((theme: Theme) => ({
  footer: {
    margin: theme.rem(2),
    justifyContent: 'center',
    alignItems: 'center'
  },
  pinContainer: {
    marginTop: theme.rem(0.25)
  },
  pinInput: {
    fontFamily: theme.fontFaceDefault,
    fontSize: theme.rem(1),
    color: theme.primaryText,
    position: 'absolute',
    width: 0,
    height: 0
  },

  amountText: {
    fontSize: theme.rem(2)
  },
  amountTextMuted: {
    color: theme.deactivatedText
  }
}))

export const SendScene = connect<StateProps, DispatchProps, OwnProps>(
  state => {
    const { nativeAmount, transaction, transactionMetadata, error, guiMakeSpendInfo, isSendUsingFioAddress } = state.ui.scenes.sendConfirmation

    return {
      account: state.core.account,
      authRequired: state.ui.scenes.sendConfirmation.authRequired,
      defaultSelectedWalletId: state.ui.wallets.selectedWalletId,
      defaultSelectedWalletCurrencyCode: state.ui.wallets.selectedCurrencyCode,
      error,
      exchangeRates: state.exchangeRates,
      nativeAmount,
      pin: state.ui.scenes.sendConfirmation.pin,
      sliderDisabled: !transaction,
      transaction,
      transactionMetadata,
      isSendUsingFioAddress,
      guiMakeSpendInfo,
      maxSpendSet: state.ui.scenes.sendConfirmation.maxSpendSet,
      currencyWallets: state.core.account.currencyWallets
    }
  },
  dispatch => ({
    reset() {
      dispatch({ type: 'UI/SEND_CONFIRMATION/RESET' })
    },
    sendConfirmationUpdateTx(guiMakeSpendInfo: GuiMakeSpendInfo, selectedWalletId?: string, selectedCurrencyCode?: string, isFeeChanged = false) {
      dispatch(sendConfirmationUpdateTx(guiMakeSpendInfo, true, selectedWalletId, selectedCurrencyCode, isFeeChanged))
    },
    async signBroadcastAndSave(
      fioSender: FioSenderInfo | undefined,
      selectedWalletId: string | undefined,
      selectedCurrencyCode: string | undefined,
      resetSlider: () => void
    ) {
      await dispatch(signBroadcastAndSave(fioSender, selectedWalletId, selectedCurrencyCode, resetSlider))
    },
    onChangePin(pin: string) {
      dispatch({ type: 'UI/SEND_CONFIRMATION/NEW_PIN', data: { pin } })
    },
    selectWallet(walletId: string, currencyCode: string) {
      dispatch(selectWallet(walletId, currencyCode))
    },
    getExchangeDenomination(pluginId: string, currencyCode: string) {
      return dispatch(getExchangeDenominationFromState(pluginId, currencyCode))
    },
    getDisplayDenomination(pluginId: string, currencyCode: string) {
      return dispatch(getDisplayDenominationFromState(pluginId, currencyCode))
    }
  })
)(withTheme(SendComponent))
