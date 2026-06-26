'use client'

import { Pokemon, Move, Field, calculate, Generations } from '@smogon/calc'
import { spToEV, calcFinalStat, getNatureMods } from '@/lib/sp-utils'
import type { NatureName, SPSpread } from '@/types/champions'

const gen = Generations.get(9)
const ZERO_SPREAD: SPSpread = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

function toSpecies(slug: string): string {
  return slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('-')
}

// ── Public types ──────────────────────────────────────────────────────────────

export type OptimizeGoal = 'survive' | 'ohko' | '2hko' | 'speed_tier'
export type AttackStat   = 'atk' | 'spa'

export interface OptimizeResult {
  success:          boolean
  spSpread:         SPSpread
  totalSP:          number
  remainingSP:      number
  verificationText: string
  failText?:        string
}

type MegaStats = { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }

export interface SurvivorConfig {
  defPokeapiName:    string
  defNature:         NatureName
  defAbility?:       string
  defItem?:          string
  defMegaBaseStats?: MegaStats
  defBaseHP?:        number
  atkPokeapiName:    string
  atkNature:         NatureName
  atkSpSpread:       SPSpread
  atkAbility?:       string
  atkItem?:          string
  atkMegaBaseStats?: MegaStats
  moveName:          string
  weather?:          string
  terrain?:          string
  isCrit?:           boolean
  isHelpingHand?:    boolean
  atkBoost?:         number
}

export interface KOConfig {
  atkPokeapiName:    string
  atkNature:         NatureName
  atkAbility?:       string
  atkItem?:          string
  atkMegaBaseStats?: MegaStats
  statToOptimize:    AttackStat
  moveName:          string
  defPokeapiName:    string
  defNature:         NatureName
  defSpSpread?:      SPSpread
  defAbility?:       string
  defItem?:          string
  defMegaBaseStats?: MegaStats
  koType:            'ohko' | '2hko'
  weather?:          string
  terrain?:          string
  myBoost?:          number
}

export interface SpeedConfig {
  baseSpe:       number
  nature:        NatureName
  rivalFinalSpe: number
  myTailwind?:   boolean
}

// ── Internal builders ─────────────────────────────────────────────────────────

function buildPoke(
  pokeapiName:    string,
  nature:         NatureName,
  spSpread:       SPSpread,
  ability?:       string,
  item?:          string,
  megaBaseStats?: MegaStats,
  boosts?:        Record<string, number>
): Pokemon {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Pokemon(gen, toSpecies(pokeapiName), {
    nature,
    evs: {
      hp:  spToEV(spSpread.hp),
      atk: spToEV(spSpread.atk),
      def: spToEV(spSpread.def),
      spa: spToEV(spSpread.spa),
      spd: spToEV(spSpread.spd),
      spe: spToEV(spSpread.spe),
    },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    ability,
    item,
    level: 50,
    boosts: boosts && Object.values(boosts).some(v => v !== 0) ? boosts : undefined,
    overrides: megaBaseStats ? { baseStats: megaBaseStats } : undefined,
  } as never)
}

function makeField(weather?: string, terrain?: string, isHelpingHand = false): Field {
  return new Field({
    gameType: 'Doubles',
    weather:  (weather || undefined) as never,
    terrain:  (terrain || undefined) as never,
    attackerSide: { isHelpingHand },
  } as never)
}

function failResult(failText: string): OptimizeResult {
  return { success: false, spSpread: { ...ZERO_SPREAD }, totalSP: 0, remainingSP: 66, verificationText: '', failText }
}

function dmgRolls(res: ReturnType<typeof calculate>): number[] {
  const d = res.damage
  if (!Array.isArray(d)) return [d as number]
  if (Array.isArray(d[0])) return (d as number[][]).flat()
  return d as number[]
}

// ── Optimize: Aguantar un golpe ───────────────────────────────────────────────
// O(33²) — damage doesn't depend on defender HP for standard moves,
// so we iterate (def, spd) and find minimum hp separately via calcFinalStat.

export function optimizeSurvive(cfg: SurvivorConfig): OptimizeResult {
  const atkBoosts = cfg.atkBoost ? { atk: cfg.atkBoost, spa: cfg.atkBoost } : undefined

  let attacker: Pokemon, move: Move
  try {
    attacker = buildPoke(cfg.atkPokeapiName, cfg.atkNature, cfg.atkSpSpread, cfg.atkAbility, cfg.atkItem, cfg.atkMegaBaseStats, atkBoosts)
    move = new Move(gen, cfg.moveName, { isCrit: cfg.isCrit ?? false })
  } catch {
    return failResult(`No se reconoce el movimiento "${cfg.moveName}" — escríbelo en inglés (ej. Earthquake).`)
  }

  const field = makeField(cfg.weather, cfg.terrain, cfg.isHelpingHand)

  const sampleDef = buildPoke(cfg.defPokeapiName, cfg.defNature, ZERO_SPREAD, cfg.defAbility, cfg.defItem, cfg.defMegaBaseStats)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const baseHP: number = cfg.defBaseHP ?? (sampleDef as any).species?.baseStats?.hp ?? 100

  // Reject status moves early
  const checkRes = calculate(gen, attacker, sampleDef, move, field)
  if (!Array.isArray(checkRes.damage) || checkRes.damage.every(d => d === 0)) {
    return failResult(`"${cfg.moveName}" no causa daño directo — usa un movimiento de ataque.`)
  }

  let best: { hp: number; def: number; spd: number } | null = null
  let bestTotal = 67

  for (let def = 0; def <= 32; def++) {
    for (let spd = 0; spd <= 32; spd++) {
      if (def + spd >= bestTotal) continue

      const tempSpread: SPSpread = { hp: 0, atk: 0, def, spa: 0, spd, spe: 0 }
      const defPoke = buildPoke(cfg.defPokeapiName, cfg.defNature, tempSpread, cfg.defAbility, cfg.defItem, cfg.defMegaBaseStats)
      const res     = calculate(gen, attacker, defPoke, move, field)
      const rolls   = dmgRolls(res)
      const maxDmg  = Math.max(...rolls)

      for (let hp = 0; hp <= 32; hp++) {
        const hpStat = calcFinalStat('hp', baseHP, hp, 1.0)
        if (hpStat > maxDmg) {
          const total = hp + def + spd
          if (total <= 66 && (total < bestTotal || (total === bestTotal && hp > (best?.hp ?? -1)))) {
            best = { hp, def, spd }
            bestTotal = total
          }
          break
        }
      }
    }
  }

  if (!best) {
    return failResult('No es posible aguantar este golpe con 66 SP — considera cambiar la naturaleza o el ítem del defensor.')
  }

  const bestSpread: SPSpread = { hp: best.hp, atk: 0, def: best.def, spa: 0, spd: best.spd, spe: 0 }
  const finalDef   = buildPoke(cfg.defPokeapiName, cfg.defNature, bestSpread, cfg.defAbility, cfg.defItem, cfg.defMegaBaseStats)
  const finalRes   = calculate(gen, attacker, finalDef, move, field)
  const finalRolls = dmgRolls(finalRes)
  const minDmg     = Math.min(...finalRolls), maxDmg2 = Math.max(...finalRolls)
  const defHP      = finalDef.maxHP()

  return {
    success: true,
    spSpread: bestSpread,
    totalSP: bestTotal,
    remainingSP: 66 - bestTotal,
    verificationText: `Aguanta el golpe: ${minDmg}–${maxDmg2} HP (${((minDmg/defHP)*100).toFixed(1)}–${((maxDmg2/defHP)*100).toFixed(1)}%) vs ${defHP} HP`,
  }
}

// ── Optimize: Garantizar OHKO / 2HKO ─────────────────────────────────────────

export function optimizeKO(cfg: KOConfig): OptimizeResult {
  let move: Move
  try {
    move = new Move(gen, cfg.moveName)
  } catch {
    return failResult(`No se reconoce el movimiento "${cfg.moveName}" — escríbelo en inglés (ej. Flamethrower).`)
  }

  const field    = makeField(cfg.weather, cfg.terrain)
  const myBoosts = cfg.myBoost ? { atk: cfg.myBoost, spa: cfg.myBoost } : undefined
  const defSpread = cfg.defSpSpread ?? { ...ZERO_SPREAD }
  const defender  = buildPoke(cfg.defPokeapiName, cfg.defNature, defSpread, cfg.defAbility, cfg.defItem, cfg.defMegaBaseStats)
  const defHP     = defender.maxHP()

  // Reject status moves early
  const sampleAtk = buildPoke(cfg.atkPokeapiName, cfg.atkNature, ZERO_SPREAD, cfg.atkAbility, cfg.atkItem, cfg.atkMegaBaseStats, myBoosts)
  const checkRes  = calculate(gen, sampleAtk, defender, move, field)
  if (!Array.isArray(checkRes.damage) || checkRes.damage.every(d => d === 0)) {
    return failResult(`"${cfg.moveName}" no causa daño directo — usa un movimiento de ataque.`)
  }

  for (let sp = 0; sp <= 32; sp++) {
    const spread: SPSpread = {
      hp: 0,
      atk: cfg.statToOptimize === 'atk' ? sp : 0,
      def: 0,
      spa: cfg.statToOptimize === 'spa' ? sp : 0,
      spd: 0, spe: 0,
    }
    const atk   = buildPoke(cfg.atkPokeapiName, cfg.atkNature, spread, cfg.atkAbility, cfg.atkItem, cfg.atkMegaBaseStats, myBoosts)
    const res   = calculate(gen, atk, defender, move, field)
    const rolls = dmgRolls(res)
    const minDmg = Math.min(...rolls), maxDmg = Math.max(...rolls)
    const pMin = ((minDmg / defHP) * 100).toFixed(1)
    const pMax = ((maxDmg / defHP) * 100).toFixed(1)

    const koText = res.kochance().text.toLowerCase()

    if (cfg.koType === 'ohko' && minDmg >= defHP) {
      return {
        success: true, spSpread: spread, totalSP: sp, remainingSP: 66 - sp,
        verificationText: `OHKO garantizado: ${minDmg}–${maxDmg} HP (${pMin}–${pMax}%) vs ${defHP} HP`,
      }
    }
    if (cfg.koType === '2hko' && koText.includes('guaranteed') && koText.includes('2hko')) {
      return {
        success: true, spSpread: spread, totalSP: sp, remainingSP: 66 - sp,
        verificationText: `2HKO garantizado: ${minDmg}–${maxDmg} HP (${pMin}–${pMax}%) vs ${defHP} HP`,
      }
    }
  }

  const label = cfg.koType === 'ohko' ? 'OHKO' : '2HKO'
  const stat  = cfg.statToOptimize === 'atk' ? 'Atk' : 'SpA'
  return failResult(`No es posible garantizar ${label} con 32 SP en ${stat} — prueba otro ítem o naturaleza ofensiva.`)
}

// ── Optimize: Alcanzar speed tier ────────────────────────────────────────────

export function optimizeSpeedTier(cfg: SpeedConfig): OptimizeResult {
  const mods = getNatureMods(cfg.nature)
  const tw   = cfg.myTailwind ? 2 : 1

  for (let sp = 0; sp <= 32; sp++) {
    const stat = calcFinalStat('spe', cfg.baseSpe, sp, mods.spe) * tw
    if (stat > cfg.rivalFinalSpe) {
      return {
        success: true,
        spSpread: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: sp },
        totalSP: sp,
        remainingSP: 66 - sp,
        verificationText: `Velocidad ${stat}${cfg.myTailwind ? ' (×2 Viento Cola)' : ''} supera al rival (${cfg.rivalFinalSpe}) — va primero`,
      }
    }
  }

  const maxStat = calcFinalStat('spe', cfg.baseSpe, 32, mods.spe) * tw
  return failResult(
    `Con 32 SP en Velocidad llegas a ${maxStat} Spe${cfg.myTailwind ? ' (con Viento Cola)' : ''} — no supera ${cfg.rivalFinalSpe} del rival.`
  )
}
