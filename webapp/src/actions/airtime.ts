'use server';

import {
  createRedemptionRequestAdmin,
  updateRedemptionStatusAdmin,
  addTransactionAdmin,
  getUserAdmin,
  updateUserAdmin,
} from '@/lib/firebase/admin-firestore';
import {
  burnPointsForUser,
  getUserPointsFromBlockchain,
} from '@/lib/base/server-points';
import { verifyRecyclerToken } from '@/lib/firebase/verified-user';
import { detectNetwork, formatPhoneNumber, isValidNigerianPhone } from '@/lib/utils/phone';
import { FieldValue } from 'firebase-admin/firestore';

export interface AirtimeRedemptionRequest {
  idToken: string;
  userId?: string; // Deprecated client hint; must match the verified token if supplied.
  phone: string;
  amount: number;
  network?: string;
}

export interface AirtimeRedemptionResult {
  success: boolean;
  message: string;
  redemptionId?: string;
  transactionId?: string;
  error?: string;
  failureReason?: string;
  detectedNetwork?: string;
  apiResponse?: {
    reference?: string;
    responseCode?: number;
    responseMsg?: string;
    status?: string;
    recipient?: string;
    provider?: string;
  };
}

interface TeqillaAPIResponse {
  reference?: string;
  responseCode?: number;
  responseMsg?: string;
  status?: string;
  recipient?: string;
}

function generateReference(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `TEQ_${timestamp}_${random}`;
}

function validateRedemptionRequest(request: AirtimeRedemptionRequest): {
  valid: boolean;
  error?: string;
} {
  const { phone, amount, network } = request;

  if (typeof request.idToken !== 'string' || !request.idToken) {
    return { valid: false, error: 'Authentication required' };
  }
  if (!phone) return { valid: false, error: 'Phone number is required' };
  if (!isValidNigerianPhone(phone)) {
    return { valid: false, error: 'Invalid Nigerian phone number' };
  }
  if (!Number.isSafeInteger(amount) || amount < 50 || amount > 5000) {
    return { valid: false, error: 'Amount must be between ₦50 and ₦5000' };
  }

  if (network) {
    const validNetworks = ['MTN', 'GLO', 'AIRTEL', '9MOBILE', 'NTEL'];
    if (!validNetworks.includes(network.toUpperCase())) {
      return { valid: false, error: 'Invalid network selected' };
    }
  }

  return { valid: true };
}

async function callTeqillaAPI(
  provider: string,
  reference: string,
  recipient: string,
  amount: number,
  userMetadata: { uid: string; name: string },
): Promise<{
  success: boolean;
  data?: TeqillaAPIResponse;
  error?: string;
}> {
  const apiKey = process.env.TERMII_API_KEY;
  const apiBaseUrl = process.env.TERMII_API_BASE_URL || 'https://teqilla.com/api/v1';

  if (!apiKey) {
    return { success: false, error: 'Teqilla API key not configured' };
  }

  try {
    const response = await fetch(`${apiBaseUrl}/bills/airtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        provider: provider.toUpperCase(),
        reference,
        recipient,
        amount,
        meta: userMetadata,
      }),
    });

    const data = await response.json();
    if (response.ok && data.success) {
      return { success: true, data: data.data };
    }

    return {
      success: false,
      error: data.message || data.data || 'Airtime purchase failed',
    };
  } catch (error) {
    console.error('Teqilla API call failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export async function redeemAirtime(
  request: AirtimeRedemptionRequest,
): Promise<AirtimeRedemptionResult> {
  try {
    const validation = validateRedemptionRequest(request);
    if (!validation.valid) {
      return {
        success: false,
        message: 'Invalid redemption request',
        error: validation.error,
      };
    }

    const userId = await verifyRecyclerToken(request.idToken);
    if (!userId || (request.userId && request.userId !== userId)) {
      return {
        success: false,
        message: 'Authentication required',
        error: 'Invalid or mismatched account credentials',
      };
    }

    if (process.env.GREENAFRICA_ENABLE_LIVE_REDEMPTION !== 'true') {
      return {
        success: false,
        message: 'Airtime fulfilment is temporarily disabled pending Base settlement testing',
        error: 'Reward fulfilment is not available during the pilot migration',
      };
    }

    const { phone, amount, network: manualNetwork } = request;
    const formattedPhone = formatPhoneNumber(phone);
    const detectedNetwork = detectNetwork(formattedPhone);

    let finalNetwork: string;
    if (manualNetwork) {
      finalNetwork = manualNetwork.toUpperCase();
    } else if (detectedNetwork) {
      finalNetwork = detectedNetwork.code;
    } else {
      return {
        success: false,
        message: 'Unable to detect network. Please select network manually.',
        error: 'Network detection failed',
      };
    }

    const user = await getUserAdmin(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
        error: 'User does not exist',
      };
    }

    const requiredPoints = amount;
    const blockchainBalance = await getUserPointsFromBlockchain(userId);
    if (!blockchainBalance.success || blockchainBalance.balance === undefined) {
      return {
        success: false,
        message: 'Unable to verify Green Points balance on Base',
        error: blockchainBalance.error || 'Base balance unavailable',
      };
    }

    if (BigInt(blockchainBalance.balance) < BigInt(requiredPoints)) {
      return {
        success: false,
        message: 'Insufficient points',
        error: `You need ${requiredPoints} points but only have ${blockchainBalance.balance}`,
      };
    }

    const redemptionData = {
      userId,
      type: 'airtime' as const,
      amount: `₦${amount}`,
      points: requiredPoints,
      phone: formattedPhone,
      network: finalNetwork,
      detectedNetwork: detectedNetwork?.name,
      status: 'processing' as const,
    };

    const redemptionId = await createRedemptionRequestAdmin(redemptionData);

    // Reserve the value on the authoritative Base balance before asking
    // the external airtime provider to fulfill the purchase.
    const burnResult = await burnPointsForUser(
      userId,
      requiredPoints,
      'airtime',
      formattedPhone,
      redemptionId,
    );

    if (!burnResult.success) {
      await updateRedemptionStatusAdmin(redemptionId, 'failed', {
        failureReason: burnResult.error || 'Base redemption failed',
      });
      return {
        success: false,
        message: 'Unable to reserve Green Points on Base',
        error: burnResult.error,
        redemptionId,
      };
    }

    const reference = generateReference();
    const apiResult = await callTeqillaAPI(
      finalNetwork,
      reference,
      formattedPhone,
      amount,
      { uid: user.uid, name: user.displayName },
    );

    if (apiResult.success && apiResult.data) {
      await updateRedemptionStatusAdmin(redemptionId, 'completed', {
        transactionId: apiResult.data.reference,
        apiResponse: {
          reference: apiResult.data.reference,
          responseCode: apiResult.data.responseCode,
          responseMsg: apiResult.data.responseMsg,
          status: apiResult.data.status,
          recipient: apiResult.data.recipient,
          provider: finalNetwork,
        },
      });

      // Firestore mirrors the authoritative Base balance for UI speed.
      await updateUserAdmin(userId, {
        totalPoints: FieldValue.increment(-requiredPoints),
      });

      await addTransactionAdmin({
        userId,
        type: 'redeemed',
        amount: -requiredPoints,
        description: `${amount} ${finalNetwork} airtime redeemed`,
        phone: formattedPhone,
        metadata: {
          redemptionId,
          network: finalNetwork,
          apiReference: apiResult.data.reference,
          baseTransactionId: burnResult.transactionHash,
        },
      });

      return {
        success: true,
        message: 'Airtime redemption successful',
        redemptionId,
        transactionId: apiResult.data.reference,
        detectedNetwork: detectedNetwork?.name,
        apiResponse: {
          reference: apiResult.data.reference,
          responseCode: apiResult.data.responseCode,
          responseMsg: apiResult.data.responseMsg,
          status: apiResult.data.status,
          recipient: apiResult.data.recipient,
          provider: finalNetwork,
        },
      };
    }

    const failureReason = apiResult.error || 'Provider did not confirm fulfilment';

    // Provider transport failures/timeouts may have fulfilled airtime despite a
    // missing confirmation. Never automatically refund or retry an ambiguous
    // request: retain the debit and mark it for audited manual reconciliation.
    await updateRedemptionStatusAdmin(redemptionId, 'processing', {
      failureReason: 'Manual reconciliation required: ' + failureReason,
    });

    return {
      success: false,
      message: 'Redemption pending provider reconciliation',
      error: 'The provider response was inconclusive. Do not retry until support verifies the transaction.',
      failureReason,
      redemptionId,
      detectedNetwork: detectedNetwork?.name,
    };
  } catch (error) {
    console.error('Unexpected error in airtime redemption:', error);
    return {
      success: false,
      message: 'Unexpected error during redemption',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
