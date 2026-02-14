import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  email: string;
  tokens_balance: number;
  subscription: string | null;
  referral_code: string;
  referred_by: string | null;
  last_daily_bonus: string | null;
  created_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data as Profile);
    setLoading(false);
  }, [user]);

  const checkAdmin = useCallback(async () => {
    if (!user) { setIsAdmin(false); return; }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    setIsAdmin(!!(data && data.length > 0));
  }, [user]);

  useEffect(() => {
    fetchProfile();
    checkAdmin();
  }, [fetchProfile, checkAdmin]);

  const claimDailyBonus = async (): Promise<boolean> => {
    if (!user) return false;
    const { data } = await supabase.rpc("claim_daily_bonus", { _user_id: user.id });
    if (data) { await fetchProfile(); return true; }
    return false;
  };

  const spendTokens = async (amount: number, description: string): Promise<boolean> => {
    if (!user) return false;
    const { data } = await supabase.rpc("spend_tokens", {
      _user_id: user.id, _amount: amount, _description: description,
    });
    if (data) { await fetchProfile(); return true; }
    return false;
  };

  const addTokens = async (amount: number, type: string, description: string) => {
    if (!user) return;
    await supabase.rpc("add_tokens", {
      _user_id: user.id, _amount: amount, _type: type, _description: description,
    });
    await fetchProfile();
  };

  return { profile, loading, isAdmin, fetchProfile, claimDailyBonus, spendTokens, addTokens };
}
