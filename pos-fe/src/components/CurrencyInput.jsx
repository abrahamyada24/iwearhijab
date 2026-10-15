"use client";

import React from 'react';
import { formatNumberId, normalizeNumericInput } from '@/utils/currency';

export default function CurrencyInput({ value, onChange, max, ...props }) {
  const normalizedValue = normalizeNumericInput(value);
  const displayValue = normalizedValue ? formatNumberId(normalizedValue) : '';

  const handleChange = (event) => {
    let nextValue = normalizeNumericInput(event.target.value);
    if (max !== undefined && nextValue && Number(nextValue) > Number(max)) {
      nextValue = String(max);
    }
    onChange?.(nextValue);
  };

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
    />
  );
}
