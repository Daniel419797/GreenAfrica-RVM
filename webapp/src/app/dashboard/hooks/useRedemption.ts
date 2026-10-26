'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { redeemAirtime } from '@/actions/airtime';

export interface RedeemData {
  type: string;
  phone: string;
  amount: string;
  points: number;
  network?: string;
  detectedNetwork?: string;
}

export interface RedemptionResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  message?: string;
}

export function useRedemption() {
  const [showRedeem, setShowRedeem] = useState(false);
  const [showRedeemSuccess, setShowRedeemSuccess] = useState(false);
  const [showRedeemError, setShowRedeemError] = useState(false);
  const [redeemStep, setRedeemStep] = useState(1);
  const [redeemData, setRedeemData] = useState<RedeemData>({
    type: '',
    phone: '',
    amount: '',
    points: 0
  });
  const [redemptionResult, setRedemptionResult] = useState<RedemptionResult | null>(null);
  const [redemptionError, setRedemptionError] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);

  const { user } = useAuth();

  // Phone network detection utility
  const detectNetwork = (phone: string): string | null => {
    const cleaned = phone.replace(/\D/g, '');
    const formatted = cleaned.startsWith('234') && cleaned.length === 13 
      ? '0' + cleaned.substring(3) 
      : cleaned.length === 10 && !cleaned.startsWith('0') 
      ? '0' + cleaned 
      : cleaned;

    if (formatted.length !== 11 || !formatted.startsWith('0')) return null;

    const prefix = formatted.substring(0, 4);
    const networks = {
      'MTN': ['0703', '0706', '0803', '0806', '0810', '0813', '0814', '0816', '0903', '0906', '0913', '0916'],
      'GLO': ['0705', '0805', '0807', '0811', '0815', '0905', '0915'],
      'AIRTEL': ['0701', '0708', '0802', '0808', '0812', '0901', '0902', '0904', '0907', '0912'],
      '9MOBILE': ['0809', '0817', '0818', '0908', '0909'],
      'NTEL': ['0804']
    };

    for (const [network, prefixes] of Object.entries(networks)) {
      if (prefixes.includes(prefix)) return network;
    }
    return null;
  };

  const handleRedeemSubmit = async (step: number, data: Partial<RedeemData>) => {
    if (step === 3 && (data.type || redeemData.type) === 'airtime' && user?.uid) {
      // Final submission - process airtime redemption
      setIsRedeeming(true);
      try {
        const idToken = await user.getIdToken();
        const result = await redeemAirtime({
          idToken,
          userId: user.uid,
          phone: data.phone || redeemData.phone,
          amount: parseInt(data.amount || redeemData.amount),
          network: data.network || data.detectedNetwork || redeemData.network || redeemData.detectedNetwork || ''
        });

        if (result.success) {
          setRedemptionResult(result);
          setShowRedeem(false);
          setShowRedeemSuccess(true);
          resetRedemption();
        } else {
          setRedemptionError(result.error || result.message || 'Unknown error occurred');
          setShowRedeem(false);
          setShowRedeemError(true);
          resetRedemption();
        }
      } catch (error) {
        console.error('Airtime redemption error:', error);
        setRedemptionError(error instanceof Error ? error.message : 'Unknown error occurred');
        setShowRedeem(false);
        setShowRedeemError(true);
        resetRedemption();
      } finally {
        setIsRedeeming(false);
      }
    } else {
      setRedeemStep(step + 1);
      setRedeemData({ ...redeemData, ...data });
    }
  };

  const resetRedemption = () => {
    setRedeemStep(1);
    setRedeemData({ type: '', phone: '', amount: '', points: 0 });
  };

  const closeRedeemModal = () => {
    setShowRedeem(false);
    resetRedemption();
  };

  const closeErrorModal = () => {
    setShowRedeemError(false);
    setRedemptionError('');
  };

  return {
    // State
    showRedeem,
    showRedeemSuccess,
    showRedeemError,
    redeemStep,
    redeemData,
    redemptionResult,
    redemptionError,
    isRedeeming,

    // Actions
    setShowRedeem,
    setShowRedeemSuccess,
    setShowRedeemError,
    handleRedeemSubmit,
    closeRedeemModal,
    closeErrorModal,
    detectNetwork
  };
}
