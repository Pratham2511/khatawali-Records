import { supabase } from './supabaseClient';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

const normalizeSingleRowResult = ({ data, error }) => {
  if (error) {
    return { data: null, error };
  }

  if (Array.isArray(data)) {
    return {
      data: data[0] || null,
      error: null
    };
  }

  return { data: data || null, error: null };
};

export const addExpense = async (payload) => {
  const result = await supabase.from('expenses').insert(payload).select();
  return normalizeSingleRowResult(result);
};

export const updateExpense = async (id, payload) => {
  const result = await supabase.from('expenses').update(payload).eq('id', id).select();
  return normalizeSingleRowResult(result);
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
