import { div, gt, mul } from 'biggystring'
import { EdgeCurrencyWallet } from 'edge-core-js'
import * as React from 'react'
import { AirshipBridge } from 'react-native-airship'
import { cacheStyles } from 'react-native-patina'
import { sprintf } from 'sprintf-js'

import { guiPlugins } from '../../../constants/plugins/GuiPlugins'
import { makeActionProgram } from '../../../controllers/action-queue/ActionProgram'
import { ActionOp } from '../../../controllers/action-queue/types'
import { makeWyreClient, PaymentMethodsMap } from '../../../controllers/action-queue/WyreClient'
import { runLoanActionProgram } from '../../../controllers/loan-manager/redux/actions'
import { LoanAccount } from '../../../controllers/loan-manager/types'
import { useAsyncEffect } from '../../../hooks/useAsyncEffect'
import { useAsyncValue } from '../../../hooks/useAsyncValue'
import { useHandler } from '../../../hooks/useHandler'
import { useWatch } from '../../../hooks/useWatch'
import { toPercentString } from '../../../locales/intl'
import s from '../../../locales/strings'
import { ApprovableAction } from '../../../plugins/borrow-plugins/types'
import { useDispatch, useSelector } from '../../../types/reactRedux'
import { Actions, NavigationProp, ParamList } from '../../../types/routerTypes'
import { makeAaveDepositAction } from '../../../util/ActionProgramUtils'
import { useTotalFiatAmount } from '../../../util/borrowUtils'
import { getBorrowPluginIconUri } from '../../../util/CdnUris'
import { guessFromCurrencyCode } from '../../../util/CurrencyInfoHelpers'
import { DECIMAL_PRECISION, zeroString } from '../../../util/utils'
import { FiatAmountInputCard } from '../../cards/FiatAmountInputCard'
import { SelectableAsset, TappableAccountCard } from '../../cards/TappableAccountCard'
import { Space } from '../../layout/Space'
import { WalletListModal, WalletListResult } from '../../modals/WalletListModal'
import { FillLoader } from '../../progress-indicators/FillLoader'
import { Airship, showError } from '../../services/AirshipInstance'
import { Theme, useTheme } from '../../services/ThemeContext'
import { Alert } from '../../themed/Alert'
import { EdgeText } from '../../themed/EdgeText'
import { AprCard } from '../../tiles/AprCard'
import { InterestRateChangeTile } from '../../tiles/InterestRateChangeTile'
import { LtvRatioTile } from '../../tiles/LtvRatioTile'
import { NetworkFeeTile } from '../../tiles/NetworkFeeTile'
import { TotalDebtCollateralTile } from '../../tiles/TotalDebtCollateralTile'
import { FormScene } from '../FormScene'

type ManageCollateralRequest =
  | {
      tokenId?: string
      fromWallet: EdgeCurrencyWallet
      nativeAmount: string
    }
  | {
      tokenId?: string
      toWallet: EdgeCurrencyWallet
      nativeAmount: string
    }

type ActionOpType = 'loan-borrow' | 'loan-deposit' | 'loan-repay' | 'loan-withdraw'

type Props<T extends keyof ParamList> = {
  // TODO: Remove use of ApprovableAction to calculate fees. Update ActionQueue to handle fee calcs
  action: (request: ManageCollateralRequest) => Promise<ApprovableAction>
  actionOpType: ActionOpType
  actionWallet: 'fromWallet' | 'toWallet'
  amountChange?: 'increase' | 'decrease'
  loanAccount: LoanAccount

  showAprChange?: boolean

  headerText: string
  navigation: NavigationProp<T>
}

export const ManageCollateralScene = <T extends keyof ParamList>(props: Props<T>) => {
  // -----------------------------------------------------------------------------
  // #region Constants
  // -----------------------------------------------------------------------------
  const { action, actionOpType, actionWallet, amountChange = 'increase', loanAccount, showAprChange = false, headerText, navigation } = props

  const theme = useTheme()
  const styles = getStyles(theme)
  const dispatch = useDispatch()
  const account = useSelector(state => state.core.account)

  const { borrowEngine, borrowPlugin } = loanAccount
  const { currencyWallet: borrowEngineWallet } = loanAccount.borrowEngine
  const { fiatCurrencyCode: isoFiatCurrencyCode, currencyInfo: borrowEngineCurrencyInfo } = borrowEngineWallet
  const collaterals = useWatch(borrowEngine, 'collaterals')
  const debts = useWatch(borrowEngine, 'debts')
  const borrowEnginePluginId = borrowEngineCurrencyInfo.pluginId
  const borrowPluginInfo = borrowPlugin.borrowInfo
  const borrowPluginId = borrowPluginInfo.borrowPluginId

  // Src/dest Wallet Picker
  const wallets = useWatch(account, 'currencyWallets')
  const { tokenId: hardDebtAddr } = React.useMemo(
    () => guessFromCurrencyCode(account, { currencyCode: 'USDC', pluginId: borrowEnginePluginId }),
    [account, borrowEnginePluginId]
  )
  const { tokenId: hardCollateralAddr } = React.useMemo(
    () => guessFromCurrencyCode(account, { currencyCode: 'WBTC', pluginId: borrowEnginePluginId }),
    [account, borrowEnginePluginId]
  )
  const excludeWalletIds = Object.keys(wallets).filter(walletId => walletId !== borrowEngineWallet.id)
  const hardAllowedCollateralAsset = [{ pluginId: borrowEnginePluginId, tokenId: hardCollateralAddr }, { pluginId: 'bitcoin' }]
  const hardAllowedDebtAsset = [{ pluginId: borrowEnginePluginId, tokenId: hardDebtAddr }]

  // Selected debt/collateral
  const sceneType = ['loan-borrow', 'loan-repay'].includes(actionOpType) ? 'debts' : 'collaterals'
  const isSceneTypeDebts = sceneType === 'debts'
  const defaultTokenId = isSceneTypeDebts ? hardDebtAddr : hardCollateralAddr

  // Amount card
  const iconUri = getBorrowPluginIconUri(borrowPluginInfo)
  const fiatCurrencyCode = isoFiatCurrencyCode.replace('iso:', '')

  // User input display strings
  const opTypeStringMap = {
    'loan-borrow': { amountCard: s.strings.loan_fragment_loan, srcDestCard: s.strings.loan_fund_destination },
    'loan-deposit': { amountCard: s.strings.loan_fragment_deposit, srcDestCard: s.strings.loan_fund_source },
    'loan-repay': { amountCard: s.strings.loan_fragment_repay, srcDestCard: s.strings.loan_fund_source },
    'loan-withdraw': { amountCard: s.strings.loan_fragment_withdraw, srcDestCard: s.strings.loan_fund_destination }
  }

  // #endregion Constants

  // -----------------------------------------------------------------------------
  // #region State
  // -----------------------------------------------------------------------------

  const [approvalAction, setApprovalAction] = React.useState<ApprovableAction | null>(null)
  const [actionNativeCryptoAmount, setActionNativeCryptoAmount] = React.useState('0')
  const [newDebtApr, setNewDebtApr] = React.useState(0)
  const [actionOp, setActionOp] = React.useState<ActionOp | undefined>(undefined)

  const [bankAccountsMap] = useAsyncValue<PaymentMethodsMap>(async (): Promise<PaymentMethodsMap> => {
    if (account == null) return {}
    const wyreClient = await makeWyreClient({ account })
    if (!wyreClient.isAccountSetup) return {}
    return await wyreClient.getPaymentMethods()
  }, [account])

  const [selectedAsset, setSelectedAsset] = React.useState<SelectableAsset>({ wallet: borrowEngineWallet, tokenId: defaultTokenId })

  // New debt/collateral amount
  const actionAmountChange = amountChange === 'increase' ? '1' : '-1'
  const pendingDebtOrCollateral = { nativeAmount: mul(actionNativeCryptoAmount, actionAmountChange), tokenId: selectedAsset.tokenId, apr: 0 }

  // Fees
  const feeNativeAmount = approvalAction != null ? approvalAction.networkFee.nativeAmount : '0'

  // APR change
  const newDebt = { nativeAmount: actionNativeCryptoAmount, tokenId: selectedAsset.tokenId, apr: newDebtApr }

  // LTV exceeded checks
  const pendingDebts = isSceneTypeDebts ? [...debts, pendingDebtOrCollateral] : debts
  const pendingDebtsFiatValue = useTotalFiatAmount(borrowEngineWallet, pendingDebts)
  const pendingCollaterals = isSceneTypeDebts ? collaterals : [...collaterals, pendingDebtOrCollateral]
  const pendingCollateralsFiatValue = useTotalFiatAmount(borrowEngineWallet, pendingCollaterals)

  // TODO: When new asset support is added, we need to implement calculation of aggregated liquidation thresholds
  const hardLtvRatio = '0.74'
  const isLtvExceeded =
    (actionOpType === 'loan-borrow' || actionOpType === 'loan-withdraw') &&
    (zeroString(pendingCollateralsFiatValue) || gt(div(pendingDebtsFiatValue, pendingCollateralsFiatValue, DECIMAL_PRECISION), hardLtvRatio))

  // #endregion State

  // -----------------------------------------------------------------------------
  // #region Hooks
  // -----------------------------------------------------------------------------

  // @ts-expect-error
  useAsyncEffect(async () => {
    const actionOp: ActionOp = {
      type: 'seq',
      actions: []
    }

    // Build the sequence ops:
    if (actionOpType === 'loan-deposit') {
      actionOp.actions = await makeAaveDepositAction({
        borrowPluginId,
        depositTokenId: hardAllowedCollateralAsset[0].tokenId,
        nativeAmount: actionNativeCryptoAmount,
        borrowEngineWallet: borrowEngineWallet,
        srcTokenId: selectedAsset.tokenId,
        srcWallet: borrowEngineWallet
      })
    } else {
      actionOp.actions = [
        {
          type: actionOpType,
          borrowPluginId,
          nativeAmount: actionNativeCryptoAmount,
          walletId: borrowEngineWallet.id,
          tokenId: selectedAsset.tokenId
        }
      ]
    }

    setActionOp(actionOp)
  }, [actionNativeCryptoAmount, actionOpType, borrowEngineWallet, borrowPluginId, selectedAsset])

  // @ts-expect-error
  useAsyncEffect(async () => {
    if (zeroString(actionNativeCryptoAmount) || isLtvExceeded) {
      setApprovalAction(null)
      return
    }

    const request: ManageCollateralRequest =
      actionWallet === 'fromWallet'
        ? {
            nativeAmount: actionNativeCryptoAmount,
            fromWallet: borrowEngineWallet,
            tokenId: selectedAsset.tokenId
          }
        : {
            nativeAmount: actionNativeCryptoAmount,
            toWallet: borrowEngineWallet,
            tokenId: selectedAsset.tokenId
          }

    const approvalAction = await action(request)
    setApprovalAction(approvalAction)

    if (showAprChange) {
      const apr = await borrowEngine.getAprQuote(selectedAsset.tokenId)
      setNewDebtApr(apr)
    }
  }, [action, actionNativeCryptoAmount, actionWallet, borrowEngine, borrowEngineWallet, selectedAsset, showAprChange])

  // #endregion Hooks

  // -----------------------------------------------------------------------------
  // #region Handlers
  // -----------------------------------------------------------------------------

  const handleFiatAmountChanged = useHandler((fiatAmount, nativeCryptoAmount) => {
    setActionNativeCryptoAmount(nativeCryptoAmount)
  })

  const handleSliderComplete = useHandler(async (resetSlider: () => void) => {
    if (actionOp != null) {
      const actionProgram = await makeActionProgram(actionOp)
      try {
        await dispatch(runLoanActionProgram(loanAccount, actionProgram, actionOpType))

        // HACK: Until Main.ui fully deprecates Actions usage, use this hack to handle back button routing.
        Actions.replace('loanStatus', { actionQueueId: actionProgram.programId, loanAccountId: loanAccount.id })
      } catch (e: any) {
        showError(e)
      } finally {
        resetSlider()
      }
    }
  })

  const handleShowWalletPickerModal = useHandler(() => {
    if (bankAccountsMap == null) return

    Airship.show((bridge: AirshipBridge<WalletListResult>) => (
      <WalletListModal
        bridge={bridge}
        headerTitle={s.strings.select_wallet}
        showCreateWallet={isSceneTypeDebts}
        createWalletId={isSceneTypeDebts ? borrowEngineWallet.id : undefined}
        showBankOptions={actionOpType === 'loan-borrow'}
        excludeWalletIds={isSceneTypeDebts ? excludeWalletIds : undefined}
        allowedAssets={isSceneTypeDebts ? hardAllowedDebtAsset : hardAllowedCollateralAsset}
        filterActivation
      />
    ))
      .then(async ({ walletId, currencyCode, isBankSignupRequest, wyreAccountId }) => {
        if (isBankSignupRequest) {
          // Open bank plugin for new user signup
          navigation.navigate('pluginView', {
            plugin: guiPlugins.wyre,
            deepPath: '',
            deepQuery: {}
          })
        } else if (wyreAccountId != null) {
          const paymentMethod = bankAccountsMap[wyreAccountId]
          // Set a hard-coded intermediate AAVE loan destination asset (USDC) to
          // use for the bank sell step that comes after the initial loan
          setSelectedAsset({ wallet: borrowEngineWallet, tokenId: hardDebtAddr, paymentMethod })
        } else if (walletId != null && currencyCode != null) {
          const selectedWallet = wallets[walletId]
          const { tokenId } = guessFromCurrencyCode(account, { currencyCode, pluginId: selectedWallet.currencyInfo.pluginId })
          setSelectedAsset({ wallet: selectedWallet, tokenId })
        }
      })
      .catch(e => showError(e.message))
  })

  // #endregion Handlers

  return (
    <FormScene headerText={headerText} onSliderComplete={handleSliderComplete} sliderDisabled={approvalAction == null}>
      <Space vertical around={0.5}>
        <FiatAmountInputCard
          wallet={borrowEngineWallet}
          iconUri={iconUri}
          inputModalMessage={sprintf(s.strings.loan_must_be_s_or_less)}
          title={sprintf(s.strings.loan_enter_s_amount_s, opTypeStringMap[actionOpType].amountCard, fiatCurrencyCode)}
          tokenId={selectedAsset.tokenId}
          onAmountChanged={handleFiatAmountChanged}
        />
        {showAprChange ? <AprCard apr={newDebtApr} key="apr" /> : null}
        <EdgeText style={styles.textTitle}>{opTypeStringMap[actionOpType].srcDestCard}</EdgeText>
        {bankAccountsMap != null ? (
          <TappableAccountCard emptyLabel={s.strings.loan_select_receiving_wallet} selectedAsset={selectedAsset} onPress={handleShowWalletPickerModal} />
        ) : (
          <FillLoader />
        )}
      </Space>
      <Space vertical around={0.25}>
        <TotalDebtCollateralTile
          title={isSceneTypeDebts ? s.strings.loan_current_principal : s.strings.loan_current_collateral}
          wallet={borrowEngineWallet}
          debtsOrCollaterals={isSceneTypeDebts ? debts : collaterals}
          key="currentAmount"
        />
        <TotalDebtCollateralTile
          title={isSceneTypeDebts ? s.strings.loan_new_principal : s.strings.loan_new_collateral}
          wallet={borrowEngineWallet}
          debtsOrCollaterals={isSceneTypeDebts ? pendingDebts : pendingCollaterals}
          key="newAmount"
        />
        <TotalDebtCollateralTile
          title={isSceneTypeDebts ? s.strings.loan_collateral_value : s.strings.loan_principal_value}
          wallet={borrowEngineWallet}
          debtsOrCollaterals={isSceneTypeDebts ? collaterals : debts}
          key="counterAsset"
        />
        <NetworkFeeTile wallet={borrowEngineWallet} nativeAmount={feeNativeAmount} key="fee" />
        {showAprChange ? <InterestRateChangeTile borrowEngine={borrowEngine} newDebt={newDebt} key="interestRate" /> : null}
        <LtvRatioTile
          borrowEngine={borrowEngine}
          tokenId={selectedAsset.tokenId}
          nativeAmount={actionNativeCryptoAmount}
          type={sceneType}
          direction={amountChange}
          key="ltv"
        />
        {isLtvExceeded && (
          <Alert
            numberOfLines={0}
            marginRem={[1.5, 0.5, -0.75, 0.5]}
            title={s.strings.exchange_insufficient_funds_title}
            message={sprintf(s.strings.loan_amount_exceeds_s_collateral, toPercentString(hardLtvRatio))}
            type="error"
          />
        )}
      </Space>
    </FormScene>
  )
}

const getStyles = cacheStyles((theme: Theme) => {
  return {
    textTitle: {
      alignSelf: 'flex-start',
      color: theme.secondaryText,
      fontFamily: theme.fontFaceBold,
      fontSize: theme.rem(0.75),
      marginLeft: theme.rem(0.75),
      marginBottom: theme.rem(0.5),
      marginTop: theme.rem(1),
      textAlign: 'left'
    }
  }
})
