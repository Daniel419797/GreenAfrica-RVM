'use client';

import { Suspense } from 'react';
import ReferralCard from '@/components/shared/ReferralCard';
import { useDashboard } from './hooks/useDashboard';
import { useRedemption } from './hooks/useRedemption';
import { useRewardHandler } from './hooks/useRewardHandler';
import { DashboardHeader } from './components/DashboardHeader';
import { PointsOverview } from './components/PointsOverview';
import { ActivityHistory } from './components/ActivityHistory';
import { WelcomeModal } from './components/modals/WelcomeModal';
import { RedeemPointsModal } from './components/modals/RedeemPointsModal';
import { 
  ProfileModal, 
  PointsEarnedModal, 
  SuccessModal, 
  ErrorModal 
} from './components/modals/NotificationModals';

// Browser QR links show pending verification but never award points.
function RewardHandler() {
  const notice = useRewardHandler();
  return notice ? (
    <p role="status" aria-live="polite" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
      {notice}
    </p>
  ) : null;
}

// Dashboard content component that doesn't use useSearchParams
function DashboardContent() {
  // Dashboard state and logic
  const {
    // State
    showWelcome,
    showProfile,
    showProfileSuccess,
    showPointsEarned,
    earnedPoints,
    rewardCode,
    profileData,
    rewardProcessing,
    
    // Auth data
    user,
    greenAfricaUser,
    loading,
    
    // Firestore data
    transactions,
    transactionsLoading,
    totalReferrals,
    totalReferralPoints,
    addingPoints,
    
    // Actions
    setShowWelcome,
    setShowProfile,
    setShowProfileSuccess,
    setShowPointsEarned,
    handleWelcomeComplete,
    handleProfileSubmit,
    handleLogout
  } = useDashboard();

  // Redemption state and logic
  const {
    showRedeem,
    showRedeemSuccess,
    showRedeemError,
    redeemStep,
    redeemData,
    redemptionResult,
    redemptionError,
    isRedeeming,
    setShowRedeem,
    setShowRedeemSuccess,
    setShowRedeemError,
    handleRedeemSubmit,
    closeRedeemModal,
    closeErrorModal,
    detectNetwork
  } = useRedemption();

  // Show loading while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <DashboardHeader
        userName={greenAfricaUser?.displayName}
        greenId={greenAfricaUser?.greenId}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Points Overview */}
        <PointsOverview
          totalPoints={greenAfricaUser?.totalPoints || 0}
          onRedeemClick={() => setShowRedeem(true)}
          onProfileClick={() => setShowProfile(true)}
        />

        {/* Referral Section */}
        {greenAfricaUser && (
          <ReferralCard
            referralCode={greenAfricaUser.referralCode}
            totalReferrals={totalReferrals}
            referralPoints={totalReferralPoints}
          />
        )}

        {/* Activity History */}
        <ActivityHistory
          transactions={transactions}
          loading={transactionsLoading}
          onLearnHowItWorks={() => setShowWelcome(true)}
        />
      </main>

      {/* Modals */}
      <WelcomeModal 
        isOpen={showWelcome} 
        onClose={handleWelcomeComplete} 
      />
      
      <RedeemPointsModal 
        isOpen={showRedeem} 
        onClose={closeRedeemModal}
        step={redeemStep}
        data={redeemData}
        userPoints={greenAfricaUser?.totalPoints || 0}
        onSubmit={handleRedeemSubmit}
        isRedeeming={isRedeeming}
        detectNetwork={detectNetwork}
      />
      
      <ProfileModal 
        isOpen={showProfile} 
        onClose={() => setShowProfile(false)}
        data={profileData}
        onSubmit={handleProfileSubmit}
      />
      
      <SuccessModal 
        isOpen={showRedeemSuccess}
        onClose={() => setShowRedeemSuccess(false)}
        title="Redemption Successful!"
        message="Your airtime has been sent successfully."
        details={redemptionResult?.transactionId ? `Transaction ID: ${redemptionResult.transactionId}` : undefined}
      />

      <ErrorModal 
        isOpen={showRedeemError}
        onClose={closeErrorModal}
        title="Redemption Failed"
        message={redemptionError}
      />
      
      <SuccessModal 
        isOpen={showProfileSuccess}
        onClose={() => setShowProfileSuccess(false)}
        title="Profile Updated!"
        message="Your profile information has been updated successfully."
      />

      <PointsEarnedModal 
        isOpen={showPointsEarned}
        onClose={() => setShowPointsEarned(false)}
        points={earnedPoints}
        rewardCode={rewardCode}
        isLoading={rewardProcessing}
      />

      {/* RewardHandler wrapped in Suspense */}
      <Suspense fallback={null}>
        <RewardHandler />
      </Suspense>
    </div>
  );
}

// Main Dashboard Page component with Suspense wrapper
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
