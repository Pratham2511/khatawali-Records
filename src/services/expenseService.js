import { supabase } from './supabaseClient';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export const addExpense = async (payload) => {
  return supabase.from('expenses').insert(payload).select().single();
};

export const updateExpense = async (id, payload) => {
  return supabase.from('expenses').update(payload).eq('id', id).select().single();
};

export const deleteExpense = async (id) => {
  return supabase.from('expenses').delete().eq('id', id);
};

export const fetchExpenses = async ({ userId, year, month, billerName }) => {
  let query = supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false });

  if (year) {
    query = query.gte('date', startOfYear(new Date(`${year}-01-01`)).toISOString());
    query = query.lte('date', endOfYear(new Date(`${year}-01-01`)).toISOString());
  }

  if (month && year) {
    const monthIndex = Number(month) - 1;
    const monthDate = new Date(year, monthIndex, 1);
    query = query.gte('date', startOfMonth(monthDate).toISOString());
    query = query.lte('date', endOfMonth(monthDate).toISOString());
  }

  if (billerName) {
    query = query.ilike('biller_name', `%${billerName}%`);
  }

  return query;
};

export const fetchPersonExpenses = async ({ userId, personName }) => {
  let query = supabase
    .from('expenses')
    .select('*')
    .eq('user_id', userId)
    .eq('biller_name', personName)
    .order('created_at', { ascending: false });

  return query;
};

export const bulkInsertExpenses = async (rows) => {
  return supabase.from('expenses').insert(rows).select();
};
