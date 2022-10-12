import { eq } from 'biggystring'
import React, { useEffect } from 'react'
import { Platform, TextInput, TouchableWithoutFeedback, View } from 'react-native'
import Animated, { AnimationCallback, Easing, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { Fontello } from '../../assets/vector'
import { useHandler } from '../../hooks/useHandler'
import { formatNumberInput, isValidInput } from '../../locales/intl'
import s from '../../locales/strings'
import { useState } from '../../types/reactHooks'
import { NumericInput } from '../modals/NumericInput'
import { cacheStyles, Theme, useTheme } from '../services/ThemeContext'
import { EdgeText } from './EdgeText'
import { ButtonBox } from './ThemedButtons'

export interface FlipInputGetMethodsResponse {
  setAmounts: (value: string[]) => void
}

export type FlipInputFieldInfo = {
  currencyName: string

  // Maximum number of decimals to allow the user to enter. FlipInput will automatically truncate use input to this
  // number of decimals as the user types.
  maxEntryDecimals: number
}

export interface FlipInputProps {
  onNext?: () => void
  convertValue: (sourceFieldNum: number, value: string) => Promise<string | undefined>
  getMethods?: (methods: FlipInputGetMethodsResponse) => void
  startAmounts: string[]
  inputAccessoryViewID?: string
  fieldInfos: FlipInputFieldInfo[]
  topReturnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send'
}

const FLIP_DURATION = 500

export const FlipInput2 = React.memo((props: FlipInputProps) => {
  const theme = useTheme()
  const styles = getStyles(theme)
  const inputRefs = [React.useRef<TextInput>(null), React.useRef<TextInput>(null)]

  const { startAmounts, fieldInfos, topReturnKeyType = 'done', onNext, inputAccessoryViewID, getMethods, convertValue } = props
  const animatedValue = useSharedValue(0)

  // `amounts` is always a 2-tuple
  const [amounts, setAmounts] = useState<string[]>(startAmounts)

  // primaryField is the index into the 2-tuple, 0 or 1
  const [primaryField, setPrimaryField] = useState<number>(0)

  const frontAnimatedStyle = useAnimatedStyle(() => {
    const degrees = interpolate(animatedValue.value, [0, 0.5, 1], [0, 90, 90])
    return {
      transform: [{ rotateX: `${degrees}deg` }]
    }
  })
  const backAnimatedStyle = useAnimatedStyle(() => {
    const degrees = interpolate(animatedValue.value, [0, 0.5, 1], [90, 90, 0])
    return {
      transform: [{ rotateX: `${degrees}deg` }]
    }
  })

  const onToggleFlipInput = useHandler(() => {
    const jsCallback: AnimationCallback = done => {
      'worklet'
      if (done) runOnJS(setPrimaryField)(Number(!primaryField))
    }
    inputRefs[primaryField].current?.blur()
    inputRefs[Number(!primaryField)].current?.focus()

    if (primaryField) {
      console.log('animating to 0')
      animatedValue.value = withTiming(
        0,
        {
          duration: FLIP_DURATION,
          easing: Easing.inOut(Easing.ease)
        },
        jsCallback
      )
    }
    if (!primaryField) {
      console.log('animating to 1')
      animatedValue.value = withTiming(
        1,
        {
          duration: FLIP_DURATION,
          easing: Easing.inOut(Easing.ease)
        },
        jsCallback
      )
    }
  })

  const onNumericInputChange = useHandler((text: string) => {
    convertValue(primaryField, text)
      .then(amount => {
        if (amount != null) {
          const otherField = Number(!primaryField)
          const newAmounts = []
          newAmounts[primaryField] = text
          newAmounts[otherField] = amount
          setAmounts(newAmounts)
        }
      })
      .catch(e => console.log(e.message))
  })

  const bottomRow = useHandler((fieldNum: number) => {
    const primaryAmount = amounts[fieldNum]
    const amountBlank = eq(primaryAmount, '0')
    const currencyNameStyle = amountBlank ? styles.bottomCurrencyMuted : styles.bottomCurrency
    const currencyName = fieldInfos[fieldNum].currencyName

    return (
      <View style={styles.bottomContainer} key="bottom">
        <View style={styles.valueContainer}>
          <NumericInput
            style={styles.bottomAmount}
            value={primaryAmount}
            maxDecimals={fieldInfos[fieldNum].maxEntryDecimals}
            placeholder={s.strings.string_amount}
            placeholderTextColor={theme.deactivatedText}
            onChangeText={onNumericInputChange}
            autoCorrect={false}
            returnKeyType={topReturnKeyType}
            ref={inputRefs[fieldNum]}
            onSubmitEditing={onNext}
            inputAccessoryViewID={inputAccessoryViewID}
          />
          <EdgeText style={currencyNameStyle}>{' ' + currencyName}</EdgeText>
        </View>
      </View>
    )
  })

  const topRow = useHandler((fieldNum: number) => {
    let topText = amounts[fieldNum]
    if (isValidInput(topText)) {
      topText = formatNumberInput(topText, { minDecimals: 0, maxDecimals: fieldInfos[fieldNum].maxEntryDecimals })
    }

    const fieldInfo = fieldInfos[fieldNum]
    topText = `${topText} ${fieldInfo.currencyName}`
    return (
      <TouchableWithoutFeedback onPress={onToggleFlipInput} key="top">
        <EdgeText>{topText}</EdgeText>
      </TouchableWithoutFeedback>
    )
  })

  if (startAmounts.length !== 2 || fieldInfos.length !== 2) throw new Error('Invalid number of startAmounts or fieldInfos')

  useEffect(() => {
    if (getMethods != null)
      getMethods({
        setAmounts: amounts => {
          setAmounts([amounts[0], amounts[1]])
        }
      })
  }, [])

  return (
    <>
      <View style={styles.flipInputContainer}>
        <View style={styles.flipInput}>
          <Animated.View style={[styles.flipInputFront, frontAnimatedStyle]} pointerEvents={!primaryField ? 'auto' : 'none'}>
            {topRow(1)}
            {bottomRow(0)}
          </Animated.View>
          <Animated.View style={[styles.flipInputFront, styles.flipContainerBack, backAnimatedStyle]} pointerEvents={primaryField ? 'auto' : 'none'}>
            {topRow(0)}
            {bottomRow(1)}
          </Animated.View>
        </View>
        <ButtonBox onPress={onToggleFlipInput} paddingRem={[0.5, 0, 0.5, 1]}>
          <Fontello style={styles.flipIcon} name="exchange" color={theme.iconTappable} size={theme.rem(1.5)} />
        </ButtonBox>
      </View>
    </>
  )
})

const getStyles = cacheStyles((theme: Theme) => ({
  // Header
  headerContainer: {
    marginRight: Platform.OS === 'ios' ? theme.rem(3.5) : theme.rem(1.5), // Different because adjustsFontSizeToFit behaves differently on android vs ios
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.rem(1)
  },
  headerText: {
    fontWeight: '600',
    fontSize: theme.rem(1.0)
  },

  // Flip Input
  flipInputContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  flipInput: {
    flex: 1,
    paddingRight: theme.rem(0.5)
  },
  flipInputFront: {
    backfaceVisibility: 'hidden'
  },
  flipContainerBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0
  },
  flipIcon: {
    marginRight: -theme.rem(0.125)
  },

  // Top Amount
  bottomContainer: {
    flexDirection: 'row',
    marginRight: theme.rem(1.5),
    minHeight: theme.rem(2)
  },
  valueContainer: {
    flexDirection: 'row',
    marginRight: theme.rem(0.5)
  },
  bottomAmount: {
    color: theme.primaryText,
    includeFontPadding: false,
    fontFamily: theme.fontFaceMedium,
    fontSize: theme.rem(1.5),
    minHeight: theme.rem(1.5)
  },
  bottomCurrency: {
    paddingTop: theme.rem(0.125)
  },
  bottomCurrencyMuted: {
    paddingTop: theme.rem(0.125),
    color: theme.deactivatedText
  }
}))
