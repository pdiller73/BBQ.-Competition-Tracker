import { supabase } from './supabase'

// ── Competitions ──────────────────────────────────────────────

export async function loadUserData(userId) {
  const [compRes, recipeRes, settingsRes] = await Promise.all([
    supabase
      .from('competitions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false }),
    supabase
      .from('recipes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single(),
  ])

  return {
    competitions: (compRes.data || []).map(r => ({ ...r.data, id: r.id, date: r.date, name: r.name })),
    recipes:      (recipeRes.data || []).map(r => ({ ...r.data, id: r.id })),
    competitionType: settingsRes.data?.competition_type || 'kcbs4',
  }
}

export async function saveCompetition(userId, comp) {
  const { id, date, name, ...rest } = comp
  const row = {
    user_id: userId,
    name:    name || 'Untitled',
    date:    date || new Date().toISOString().slice(0, 10),
    data:    { ...rest, name, date },
  }

  if (id && !id.startsWith('new_')) {
    // Update existing
    const { error } = await supabase
      .from('competitions')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)
    return { error }
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('competitions')
      .insert({ ...row })
      .select('id')
      .single()
    return { data, error }
  }
}

export async function deleteCompetition(userId, compId) {
  const { error } = await supabase
    .from('competitions')
    .delete()
    .eq('id', compId)
    .eq('user_id', userId)
  return { error }
}

// ── Recipes ───────────────────────────────────────────────────

export async function saveRecipe(userId, recipe) {
  const { id, ...rest } = recipe
  const row = { user_id: userId, data: rest }

  if (id) {
    const { error } = await supabase
      .from('recipes')
      .update(row)
      .eq('id', id)
      .eq('user_id', userId)
    return { error }
  } else {
    const { data, error } = await supabase
      .from('recipes')
      .insert(row)
      .select('id')
      .single()
    return { data, error }
  }
}

export async function deleteRecipe(userId, recipeId) {
  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', recipeId)
    .eq('user_id', userId)
  return { error }
}

// ── User Settings ─────────────────────────────────────────────

export async function saveSettings(userId, settings) {
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, competition_type: settings.competitionType })
  return { error }
}
