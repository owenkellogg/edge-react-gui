import * as React from 'react'
import { useRef } from 'react'
import { TextInput, TextInputProps } from 'react-native'

import { useHandler } from '../../hooks/useHandler'
import { formatNumberInput, formatToNativeNumber, isValidInput } from '../../locales/intl'
import { useState } from '../../types/reactHooks'

type Props = {
  minDecimals?: number
  maxDecimals?: number
} & TextInputProps

export const NumericInput = React.forwardRef<TextInput, Props>((props: Props, ref) => {
  const { onChangeText, minDecimals, maxDecimals, value, ...rest } = props
  const [innerValue, setInnerValue] = useState<string>(props.value ?? '')
  const propValue = useRef(props.value ?? '')

  const onChangeTextInner = useHandler(text => {
    if (isValidInput(text)) {
      const nativeNum = text === '' ? '' : formatToNativeNumber(text)
      const displayNum = text === '' ? '' : formatNumberInput(nativeNum, { minDecimals, maxDecimals })
      if (displayNum !== innerValue) {
        if (onChangeText != null) onChangeText(nativeNum)
        setInnerValue(displayNum)
      }
    }
  })

  if (props.value !== propValue.current) {
    propValue.current = props.value ?? ''
    const displayNum = props.value === '' ? '' : formatNumberInput(propValue.current, { minDecimals, maxDecimals })
    setInnerValue(displayNum)
  }

  return <TextInput ref={ref} onChangeText={onChangeTextInner} keyboardType="decimal-pad" value={innerValue} {...rest} />
})
