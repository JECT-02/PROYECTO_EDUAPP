import CATALOG from '../data/achievements.json'
import { listStudentMedals, isSupabaseConfigured } from './api'
import { supabase } from './supabase'

export const RARITY_COLOR = { common: '#A6A6BC', rare: '#3B82F6', epic: '#8B5CF6', legendary: '#F59E0B' }
export const RARITY_ICON = { mastery: '👑', behavior: '🔥', secret: '🌟' }

async function getEarnedIds(studentId) {
  const { data } = await listStudentMedals(studentId)
  return new Set((data || []).map(m => m.achievement || m.name))
}

function evaluateRule(rule, context) {
  if (!rule || !context) return false
  for (const [key, target] of Object.entries(rule)) {
    const value = context[key]
    if (typeof target === 'boolean') { if (!!value !== target) return false }
    else if (typeof target === 'number') { if ((value || 0) < target) return false }
  }
  return true
}

async function awardMedal(studentId, def) {
  if (!isSupabaseConfigured) return false
  const { error } = await supabase.from('medals').insert({
    student_id: studentId,
    medal_type: def.type,
    name: def.name,
    achievement: def.id,
    rarity: def.rarity,
    description: def.description,
    unlocked_at: new Date().toISOString(),
  })
  return !error
}

/**
 * Check and unlock achievements based on context.
 * context: { quiz_completed?, quiz_perfect?, quiz_fast?, boss_passed?, theory_completed?,
 *            courses_enrolled?, course_completed?, review_completed?, coliseo_won?,
 *            coliseo_perfect?, streak_days?, night_study?, ai_chat_used?, ai_interactions?,
 *            all_quiz_perfect? }
 */
export async function checkAchievements(studentId, context = {}) {
  if (!studentId || !isSupabaseConfigured) return []
  const earnedIds = await getEarnedIds(studentId)
  const unlocked = []
  for (const def of CATALOG) {
    if (earnedIds.has(def.id) || earnedIds.has(def.name)) continue
    if (evaluateRule(def.rule, context)) {
      const ok = await awardMedal(studentId, def)
      if (ok) unlocked.push(def)
    }
  }
  return unlocked
}

export function getAllAchievements() {
  return CATALOG
}
