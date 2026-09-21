import { supabase } from './supabaseService';

export type UserRole = 'SystemManager' | 'Athlete';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}

export const supabaseLogin = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  if (data.user) {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (!profileError && profile) {
      return {
        id: profile.id,
        fullName: profile.full_name,
        email: profile.email,
        role: profile.role === 'admin' ? 'SystemManager' : 'Athlete',
        passwordHash: '',
        createdAt: profile.created_at,
      };
    }
  }
  throw new Error('User profile not found. Please run the setup script.');
};

export const supabaseSignUp = async (fullName: string, email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: fullName.trim() } },
  });
  if (error) throw error;
  if (data.user) {
    // Create user record in database
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: data.user.id,
        email: email.trim(),
        full_name: fullName.trim(),
        role: 'athlete',
        is_active: true
      });
    
    if (userError) throw new Error(`Failed to create user profile: ${userError.message}`);

    // Create athlete profile
    const { error: profileError } = await supabase
      .from('athlete_profiles')
      .insert({
        user_id: data.user.id,
        total_sessions: 0,
        total_minutes: 0,
        overall_accuracy: 0
      });

    if (profileError) console.warn(`Failed to create athlete profile: ${profileError.message}`);

    return {
      id: data.user.id,
      fullName: fullName.trim(),
      email: email.trim(),
      role: 'Athlete',
      passwordHash: '',
      createdAt: new Date().toISOString(),
    };
  }
  throw new Error('Sign up failed.');
};

export const supabaseGetUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map((u: any) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    role: u.role === 'admin' ? 'SystemManager' : 'Athlete',
    passwordHash: '',
    createdAt: u.created_at,
  }));
};

export const supabaseDeleteUser = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('users')
    .update({ is_active: false })
    .eq('id', userId);
  if (error) throw error;
};

export const supabaseGetStunts = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('stunts')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const supabaseCreateStunt = async (stunt: any): Promise<any> => {
  const { data, error } = await supabase
    .from('stunts')
    .insert([stunt])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const supabaseUpdateStunt = async (stuntId: string, updates: any): Promise<void> => {
  const { error } = await supabase
    .from('stunts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', stuntId);
  if (error) throw error;
};

export const supabaseDeleteStunt = async (stuntId: string): Promise<void> => {
  const { error } = await supabase
    .from('stunts')
    .update({ is_archived: true })
    .eq('id', stuntId);
  if (error) throw error;
};

export const supabaseGetSessions = async (): Promise<any[]> => {
  const { data, error } = await supabase
    .from('practice_sessions')
    .select('*, users:user_id(full_name, email), stunts:stunt_id(name, category)')
    .order('session_date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const supabaseGetAnalytics = async (): Promise<any> => {
  const { data, error } = await supabase
    .from('analytics_snapshots')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return data;
};