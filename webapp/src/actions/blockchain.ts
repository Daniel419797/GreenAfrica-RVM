'use server';

import {
  checkUserExists,
  registerUserOnBlockchain,
} from '@/lib/base/client';
import { getUserAdmin, getUserByReferralCodeAdmin } from '@/lib/firebase/admin-firestore';
import { verifyRecyclerToken } from '@/lib/firebase/verified-user';

export interface BlockchainRegistrationResult {
  success: boolean;
  message: string;
  transactionId?: string;
  userExists?: boolean;
  error?: string;
}

/**
 * Register a recycler in the GreenAfrica Base application.
 * Firebase remains the identity/profile store; Base holds the auditable
 * recycling and reward state keyed by Green ID.
 */
export async function registerUserOnBase(
  greenId: string,
  referralCode: string,
  referredByCode?: string,
  idToken?: string,
): Promise<BlockchainRegistrationResult> {
  try {
    if (!greenId || !referralCode) {
      return {
        success: false,
        message: 'Missing required parameters: greenId and referralCode',
        error: 'Invalid parameters',
      };
    }

    const uid = await verifyRecyclerToken(idToken);
    if (!uid) {
      return { success: false, message: 'Authentication required', error: 'Invalid Firebase token' };
    }
    const profile = await getUserAdmin(uid);
    if (!profile || profile.greenId !== greenId || profile.referralCode !== referralCode) {
      return { success: false, message: 'Profile mismatch', error: 'Registration must match your verified account' };
    }

    let validatedReferredByCode: string | undefined = referredByCode;
    if (referredByCode) {
      const referrer = await getUserByReferralCodeAdmin(referredByCode);
      if (!referrer) {
        console.warn(`Referral code ${referredByCode} not found; registering without referrer`);
        validatedReferredByCode = undefined;
      }
    }

    // Referral tracking remains off-chain; only the opaque Green ID is registered.
    void validatedReferredByCode;
    const result = await registerUserOnBlockchain(greenId);

    if (!result.success) {
      return {
        success: false,
        message: 'Failed to register recycler on Base',
        error: result.error,
      };
    }

    if (result.userExists) {
      return {
        success: true,
        message: 'Recycler already registered on Base',
        userExists: true,
      };
    }

    return {
      success: true,
      message: 'Recycler successfully registered on Base',
      transactionId: result.transactionId,
      userExists: false,
    };
  } catch (error) {
    console.error('Unexpected Base recycler registration error:', error);
    return {
      success: false,
      message: 'Unexpected error during Base recycler registration',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Register an RVM in the GreenAfrica Base application.
 * Location and descriptive metadata remain off-chain; the application stores
 * the machine identifier and activation state used to authorize deposits.
 */
/**
 * Machine registration is an operator-only action. The public Server Action
 * intentionally never signs an RVM transaction based on browser input.
 * Provision verified machines through the server-side operator tooling.
 */
export async function registerRVMOnBase(
  _rvmId: string,
  _lat: number,
  _lng: number,
  _name: string,
  _metaURI?: string,
): Promise<BlockchainRegistrationResult> {
  return {
    success: false,
    message: 'RVM provisioning is restricted to authorised operators',
    error: 'Public RVM registration is disabled',
  };
}

export async function checkUserExistsOnBase(greenId: string): Promise<{
  exists: boolean;
  error?: string;
}> {
  try {
    if (!greenId) {
      return { exists: false, error: 'Green ID is required' };
    }

    return { exists: await checkUserExists(greenId) };
  } catch (error) {
    console.error('Error checking recycler existence on Base:', error);
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
