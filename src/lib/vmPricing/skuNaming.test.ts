import { describe, it, expect } from 'vitest';
import { parseVmSize, getVmCategory, stripSkuTier } from './skuNaming';

describe('stripSkuTier', () => {
  it('removes the tier prefix', () => {
    expect(stripSkuTier('Standard_D4s_v5')).toBe('D4s_v5');
    expect(stripSkuTier('Basic_A2')).toBe('A2');
  });

  it('removes the Experimental infix and trims stray whitespace', () => {
    expect(stripSkuTier('Standard_Experimental_A2arm_v2')).toBe('A2arm_v2');
    expect(stripSkuTier('Standard_NM16ads_MA35D  ')).toBe('NM16ads_MA35D');
  });
});

describe('parseVmSize', () => {
  it('derives the series for a plain size', () => {
    expect(parseVmSize('Standard_D4s_v5')).toMatchObject({
      prefix: 'D',
      cores: 4,
      constrainedCores: null,
      suffix: 's',
      version: 'v5',
      series: 'Dsv5'
    });
  });

  it('reads constrained cores written before the feature letters', () => {
    expect(parseVmSize('Standard_E16-4as_v6')).toMatchObject({
      prefix: 'E',
      cores: 16,
      constrainedCores: 4,
      suffix: 'as',
      series: 'Easv6'
    });
  });

  it('reads constrained cores written after the feature letters', () => {
    expect(parseVmSize('Standard_M176ds-44_3_v3')).toMatchObject({
      prefix: 'M',
      cores: 176,
      constrainedCores: 44,
      suffix: 'ds',
      series: 'Mdsv3'
    });
  });

  it('keeps the accelerator model in the series for GPU sizes', () => {
    expect(parseVmSize('Standard_ND96isr_H100_v5').series).toBe('NDisrH100v5');
    expect(parseVmSize('Standard_NC24ads_A100_v4').series).toBe('NCadsA100v4');
  });

  it('drops numeric memory-tier discriminators from the series', () => {
    expect(parseVmSize('Standard_M416s_10_v3').series).toBe('Msv3');
  });

  it('marks legacy promo sizes', () => {
    expect(parseVmSize('Standard_D2_v2_Promo').series).toBe('Dv2 Promo');
  });

  it('handles sizes with no feature letters or version', () => {
    expect(parseVmSize('Standard_A4').series).toBe('A');
    expect(parseVmSize('Standard_B2s').series).toBe('Bs');
  });

  it('falls back to the bare size when the name does not parse', () => {
    expect(parseVmSize('Standard_Weird').series).toBe('Weird');
  });
});

describe('getVmCategory', () => {
  it('prefers the longest matching prefix', () => {
    expect(getVmCategory('Standard_D4s_v5')).toBe('General purpose');
    expect(getVmCategory('Standard_DC4es_v5')).toBe('Confidential computing');
    expect(getVmCategory('Standard_E4s_v5')).toBe('Memory optimized');
    expect(getVmCategory('Standard_EC4as_v5')).toBe('Confidential computing');
    expect(getVmCategory('Standard_NC24ads_A100_v4')).toBe('GPU accelerated');
  });

  it('classifies the remaining families', () => {
    expect(getVmCategory('Standard_F4s_v2')).toBe('Compute optimized');
    expect(getVmCategory('Standard_L8s_v3')).toBe('Storage optimized');
    expect(getVmCategory('Standard_HB120rs_v3')).toBe('High performance compute');
    expect(getVmCategory('Standard_M128s')).toBe('Memory optimized');
  });
});
