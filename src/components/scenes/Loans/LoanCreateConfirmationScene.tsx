import { add, gt, mul, sub } from 'biggystring'
import * as React from 'react'

import { makeActionProgram } from '../../../controllers/action-queue/ActionProgram'
import { dryrunActionProgram } from '../../../controllers/action-queue/runtime'
import { ActionOp, SwapActionOp } from '../../../controllers/action-queue/types'
import { makeLoanAccount } from '../../../controllers/loan-manager/LoanAccount'
import { runLoanActionProgram, updateLoanAccount } from '../../../controllers/loan-manager/redux/actions'
import { useAsyncValue } from '../../../hooks/useAsyncValue'
import { useWalletBalance } from '../../../hooks/useWalletBalance'
import s from '../../../locales/strings'
import { useDispatch, useSelector } from '../../../types/reactRedux'
import { Actions, NavigationProp, RouteProp } from '../../../types/routerTypes'
import { LoanAsset, makeAaveCreateAction } from '../../../util/ActionProgramUtils'
import { translateError } from '../../../util/translateError'
import { SceneWrapper } from '../../common/SceneWrapper'
import { CryptoFiatAmountRow } from '../../data/row/CryptoFiatAmountRow'
import { CurrencyRow } from '../../data/row/CurrencyRow'
import { PaymentMethodRow } from '../../data/row/PaymentMethodRow'
import { FillLoader } from '../../progress-indicators/FillLoader'
import { showError } from '../../services/AirshipInstance'
import { FiatText } from '../../text/FiatText'
import { Alert } from '../../themed/Alert'
import { EdgeText } from '../../themed/EdgeText'
import { ErrorTile } from '../../tiles/ErrorTile'
import { NetworkFeeTile } from '../../tiles/NetworkFeeTile'
import { Tile } from '../../tiles/Tile'
import { FormScene } from '../FormScene'

type Props = {
  navigation: NavigationProp<'loanCreateConfirmation'>
  route: RouteProp<'loanCreateConfirmation'>
}

export const LoanCreateConfirmationScene = (props: Props) => {
  const { navigation, route } = props
  const { borrowPlugin, borrowEngine, destWallet, destTokenId, nativeDestAmount, nativeSrcAmount, paymentMethod, srcTokenId, srcWallet } = route.params
  const { currencyWallet: borrowEngineWallet } = borrowEngine

  const clientId = useSelector(state => state.core.context.clientId)
  const account = useSelector(state => state.core.account)

  const borrowWalletNativeBalance = useWalletBalance(borrowEngineWallet)

  const [loanAccount, loanAccountError] = useAsyncValue(async () => makeLoanAccount(borrowPlugin, borrowEngine.currencyWallet), [borrowPlugin, borrowEngine])

  const dispatch = useDispatch()

  const [[actionProgram, networkFeeAmountAggregate = '0'] = [], actionProgramError] = useAsyncValue(async () => {
    const borrowPluginId = borrowPlugin.borrowInfo.borrowPluginId
    const source: LoanAsset = {
      wallet: srcWallet,
      nativeAmount: nativeSrcAmount,
      ...(srcTokenId != null ? { tokenId: srcTokenId } : {})
    }

    const destination: LoanAsset = {
      wallet: destWallet,
      tokenId: destTokenId,
      nativeAmount: nativeDestAmount,
      ...(paymentMethod != null ? { paymentMethodId: paymentMethod.id } : {}),
      ...(destTokenId != null ? { tokenId: destTokenId } : {})
    }

    const actionOp = await makeAaveCreateAction({
      borrowEngineWallet,
      borrowPluginId,
      source,
      destination
    })

    const actionProgram = await makeActionProgram(actionOp)

    const actionProgramState = {
      clientId,
      programId: actionProgram.programId,
      effective: false,
      executing: false,
      lastExecutionTime: 0,
      nextExecutionTime: 0
    }
    const executionContext = { account, clientId }
    const executionOutputs = await dryrunActionProgram(executionContext, actionProgram, actionProgramState, false)

    // Map: currencyCode -> nativeAmount
    const networkFeeAmountMap: { [currencyCode: string]: string | undefined } = {}
    for (const output of executionOutputs ?? []) {
      for (const tx of output.broadcastTxs) {
        const { currencyCode, nativeAmount } = tx.networkFee
        const currentFeeAmount = networkFeeAmountMap[currencyCode] ?? '0'
        networkFeeAmountMap[currencyCode] = add(currentFeeAmount, nativeAmount)
      }
    }

    // TODO: Show fees for swaps and other transactions that aren't on the main loan account wallet
    const networkFeeAmountAggregate = networkFeeAmountMap[borrowEngineWallet.currencyInfo.currencyCode]

    // Add an extra swap for mainnet native currency to cover transaction fees.
    const seq = actionProgram.actionOp.type === 'seq' ? actionProgram.actionOp : null
    if (
      srcWallet.id !== borrowEngineWallet.id && // Source of funds is not the same wallet as the "main-chain wallet"
      networkFeeAmountAggregate != null && // Mainnet native currency fee must exist
      gt(networkFeeAmountAggregate, borrowWalletNativeBalance) && // Fee must be larger than available balance
      seq != null // type assertion
    ) {
      // Collect all initial swap actions (if any)
      const swapActions: SwapActionOp[] = []
      for (const action of seq.actions) {
        if (action.type !== 'swap') {
          break
        }
        swapActions.push(action)
      }
      // Get the rest of the actions which are not swap actions
      const otherActions: ActionOp[] = seq.actions.slice(swapActions.length)

      // Target mainnet native balance should be double the fees estimate to be
      // extra generous when accounting for fee volatility.
      const nativeAmount = sub(mul(networkFeeAmountAggregate, '2'), borrowWalletNativeBalance)
      // Create a new fee swap action for mainnet fees
      const feesSwap: SwapActionOp = {
        type: 'swap',
        fromWalletId: srcWallet.id,
        fromTokenId: srcTokenId,
        toWalletId: borrowEngineWallet.id,
        nativeAmount,
        amountFor: 'to'
      }
      // Include new fee swap action in swapActions
      swapActions.push(feesSwap)

      // Redefine actions in sequence
      seq.actions = [
        {
          type: 'par',
          actions: swapActions
        },
        ...otherActions
      ]
    }

    return [actionProgram, networkFeeAmountAggregate] as const
  }, [destTokenId, nativeDestAmount, borrowEngine, borrowWalletNativeBalance])

  const handleSliderComplete = async (resetSlider: () => void) => {
    if (actionProgram != null && loanAccount != null) {
      try {
        await dispatch(updateLoanAccount(loanAccount))
        await dispatch(runLoanActionProgram(loanAccount, actionProgram, 'loan-create'))

        // HACK: Until Main.ui fully deprecates Actions usage, use this hack to handle back button routing.
        Actions.pop()
        Actions.replace('loanDetails', { loanAccountId: loanAccount.id })

        navigation.navigate('loanStatus', { actionQueueId: actionProgram.programId, loanAccountId: loanAccount.id })
      } catch (e: any) {
        showError(e)
      } finally {
        resetSlider()
      }
    }
  }

  if (loanAccountError != null) return <Alert title={s.strings.error_unexpected_title} type="error" message={translateError(loanAccountError)} />

  return loanAccount == null ? (
    <SceneWrapper background="theme">
      <FillLoader />
    </SceneWrapper>
  ) : (
    <FormScene headerText={s.strings.loan_create_confirmation_title} sliderDisabled={actionProgram == null} onSliderComplete={handleSliderComplete}>
      <Tile type="static" title={s.strings.loan_amount_borrow}>
        <EdgeText>
          <FiatText appendFiatCurrencyCode autoPrecision hideFiatSymbol nativeCryptoAmount={nativeDestAmount} tokenId={destTokenId} wallet={destWallet} />
        </EdgeText>
      </Tile>
      <Tile type="static" title={s.strings.loan_collateral_amount}>
        <CryptoFiatAmountRow nativeAmount={nativeSrcAmount} tokenId={srcTokenId} wallet={srcWallet} marginRem={[0.25, 0, 0, 0]} />
      </Tile>

      <Tile type="static" title={s.strings.loan_collateral_source}>
        <CurrencyRow tokenId={srcTokenId} wallet={srcWallet} marginRem={0} />
      </Tile>

      <Tile type="static" title={s.strings.loan_debt_destination}>
        {paymentMethod != null ? (
          <PaymentMethodRow paymentMethod={paymentMethod} pluginId="wyre" marginRem={0} />
        ) : (
          <CurrencyRow tokenId={destTokenId} wallet={destWallet} marginRem={0} />
        )}
      </Tile>
      {actionProgramError != null ? <ErrorTile message={actionProgramError.message} /> : null}
      <NetworkFeeTile wallet={borrowEngineWallet} nativeAmount={networkFeeAmountAggregate} />
    </FormScene>
  )
}
