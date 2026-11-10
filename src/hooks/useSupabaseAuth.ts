import { useEffect, useState, useCallback } from 'react';
import {
  supabase,
  fetchProfile,
  mapProfileToUser,
  fetchWallet,
  fetchWalletTransactions,
  fetchActiveBroadcast,
  signInWithEmail,
  signUpWithEmail,
  signUpWithPhone,
  verifyPhoneOtp,
  signOut,
  upsertProfile,
} from '../services/supabase';
import type { UserProfile, UserWallet, AdminSystemBroadcast } from '../types';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  currentUser: UserProfile | null;
  wallet: UserWallet | null;
  systemBroadcast: AdminSystemBroadcast | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const FALLBACK_USER: UserProfile = {
  id: 'guest',
  fullName: 'Guest User',
  username: 'guest',
  phoneNumber: '',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest',
  bio: '',
  location: '',
  about: 'Available · AfriChat User',
  createdAt: new Date().toISOString(),
  lastSeen: 'Just now',
  isPhoneVerified: false,
  isCelebrityVerified: false,
  role: 'user',
  isAdmin: false,
  isOnline: false,
};

const FALLBACK_WALLET: UserWallet = {
  availableBalance: 0,
  escrowLockedBalance: 0,
  currency: 'NGN',
  transactions: [],
};

export function useSupabaseAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    currentUser: null,
    wallet: null,
    systemBroadcast: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Load profile + wallet for a given user id
  const loadUserData = useCallback(async (userId: string) => {
    try {
      const [profileRes, walletRes, walletTxRes, broadcastRes] = await Promise.all([
        fetchProfile(userId),
        fetchWallet(userId),
        fetchWalletTransactions(userId),
        fetchActiveBroadcast(),
      ]);

      const user: UserProfile = profileRes.data
        ? mapProfileToUser(profileRes.data)
        : { ...FALLBACK_USER, id: userId };

      const wallet: UserWallet = {
        availableBalance: walletRes.data?.available_balance ?? 0,
        escrowLockedBalance: walletRes.data?.escrow_locked_balance ?? 0,
        currency: (walletRes.data?.currency as UserWallet['currency']) ?? 'NGN',
        transactions: (walletTxRes.data ?? []).map((tx) => ({
          id: tx.id as string,
          type: tx.type as UserWallet['transactions'][0]['type'],
          title: (tx.title as string) || tx.type as string,
          amount: tx.amount as number,
          currency: (tx.currency as UserWallet['currency']) ?? 'NGN',
          timestamp: tx.created_at as string,
          status: (tx.status as 'completed' | 'pending') ?? 'completed',
          reference: tx.reference as string | undefined,
          channel: (tx.channel as 'paystack' | 'wallet' | 'bank_transfer') ?? 'wallet',
        })),
      };

      const broadcast: AdminSystemBroadcast | null = broadcastRes.data
        ? {
            id: broadcastRes.data.id as string,
            title: broadcastRes.data.title as string,
            message: broadcastRes.data.message as string,
            level: (broadcastRes.data.level as AdminSystemBroadcast['level']) ?? 'info',
            createdAt: broadcastRes.data.created_at as string,
            active: Boolean(broadcastRes.data.is_active),
          }
        : null;

      setState((prev) => ({
        ...prev,
        currentUser: user,
        wallet,
        systemBroadcast: broadcast,
        isLoading: false,
        isAuthenticated: true,
      }));
    } catch (err) {
      console.error('useSupabaseAuth: loadUserData failed', err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Bootstrap: check existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      if (session?.user) {
        setState((prev) => ({ ...prev, session }));
        loadUserData(session.user.id);
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    });

    // Listen for auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({ ...prev, session }));
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setState((prev) => ({
          ...prev,
          currentUser: null,
          wallet: null,
          isAuthenticated: false,
          isLoading: false,
        }));
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadUserData]);

  // ── Auth actions ──────────────────────────────────────────────────────────

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    const { data, error } = await signInWithEmail(email, password);
    if (error) return { success: false, message: error.message };
    return { success: true, session: data.session };
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await signUpWithEmail(email, password, fullName);
    if (error) return { success: false, message: error.message };
    return { success: true, session: data.session };
  }, []);

  const sendPhoneOtp = useCallback(async (phone: string) => {
    const { error } = await signUpWithPhone(phone);
    if (error) return { success: false, message: error.message };
    return { success: true };
  }, []);

  const verifyPhone = useCallback(async (phone: string, token: string) => {
    const { data, error } = await verifyPhoneOtp(phone, token);
    if (error) return { success: false, message: error.message };
    return { success: true, session: data.session };
  }, []);

  const logout = useCallback(async () => {
    await signOut();
  }, []);

  const updateProfile = useCallback(async (updates: Parameters<typeof upsertProfile>[1]) => {
    if (!state.session?.user?.id) return { success: false, message: 'Not logged in' };
    const { error } = await upsertProfile(state.session.user.id, updates);
    if (error) return { success: false, message: error.message };
    // Refresh user data
    await loadUserData(state.session.user.id);
    return { success: true };
  }, [state.session, loadUserData]);

  return {
    ...state,
    // Fallbacks for when not authenticated (keeps app usable in mock mode)
    currentUser: state.currentUser ?? FALLBACK_USER,
    wallet: state.wallet ?? FALLBACK_WALLET,
    // Actions
    loginWithEmail,
    registerWithEmail,
    sendPhoneOtp,
    verifyPhone,
    logout,
    updateProfile,
    refreshUserData: () => state.session?.user?.id ? loadUserData(state.session.user.id) : Promise.resolve(),
  };
}
