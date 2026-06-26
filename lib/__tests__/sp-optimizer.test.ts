import { describe, it, expect } from 'vitest'
import { optimizeSpeedTier, optimizeKO, optimizeSurvive } from '@/lib/sp-optimizer'

const EMPTY_SPREAD = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

// ── optimizeSpeedTier ────────────────────────────────────────────────────────

describe('optimizeSpeedTier', () => {
  it('ya supera al rival sin SP (Garchomp Jolly base 134 vs rival 130)', () => {
    // Garchomp base Spe 102, Jolly → 134 at 0 SP
    const r = optimizeSpeedTier({ baseSpe: 102, nature: 'Jolly', rivalFinalSpe: 130 })
    expect(r.success).toBe(true)
    expect(r.totalSP).toBe(0)
  })

  it('rival inalcanzable incluso con 32 SP → falla', () => {
    // Base Spe 1, Hardy → max ~52 at 32 SP, no supera 1000
    const r = optimizeSpeedTier({ baseSpe: 1, nature: 'Hardy', rivalFinalSpe: 1000 })
    expect(r.success).toBe(false)
  })

  it('Viento Cola permite superar al rival que sin él sería imposible', () => {
    // Base Spe 50, Hardy: max without TW ~101 Spe at 32 SP, rival is 130
    // With TW at 0 SP: 70*2 = 140 > 130
    const withTW  = optimizeSpeedTier({ baseSpe: 50, nature: 'Hardy', rivalFinalSpe: 130, myTailwind: true  })
    const withoutTW = optimizeSpeedTier({ baseSpe: 50, nature: 'Hardy', rivalFinalSpe: 130, myTailwind: false })
    expect(withTW.success).toBe(true)
    expect(withoutTW.success).toBe(false)
  })

  it('necesita exactamente 1 SP para superar al rival', () => {
    // Garchomp Jolly: 0 SP → 134, 1 SP → 135. Rival at 134.
    const r = optimizeSpeedTier({ baseSpe: 102, nature: 'Jolly', rivalFinalSpe: 134 })
    expect(r.success).toBe(true)
    expect(r.totalSP).toBe(1)
  })
})

// ── optimizeKO ───────────────────────────────────────────────────────────────

describe('optimizeKO', () => {
  it('movimiento de estado (Toxic) → rechazado como no dañino', () => {
    const r = optimizeKO({
      atkPokeapiName: 'garchomp', atkNature: 'Jolly',
      statToOptimize: 'atk', moveName: 'Toxic',
      defPokeapiName: 'charizard', defNature: 'Timid',
      koType: 'ohko',
    })
    expect(r.success).toBe(false)
    expect(r.failText).toMatch(/daño directo/)
  })

  it('Earthquake de Garchomp OHKO a Pikachu sin inversión', () => {
    // Ground STAB + SE vs Electric: guaranteed OHKO with 0 SP Atk
    const r = optimizeKO({
      atkPokeapiName: 'garchomp', atkNature: 'Jolly',
      statToOptimize: 'atk', moveName: 'Earthquake',
      defPokeapiName: 'pikachu', defNature: 'Hardy',
      koType: 'ohko',
    })
    expect(r.success).toBe(true)
    expect(r.totalSP).toBe(0)
    expect(r.remainingSP).toBe(66)
  })
})

// ── optimizeSurvive ──────────────────────────────────────────────────────────

describe('optimizeSurvive', () => {
  it('movimiento de estado (Growl) → rechazado como no dañino', () => {
    const r = optimizeSurvive({
      defPokeapiName: 'charizard', defNature: 'Timid', defBaseHP: 78,
      atkPokeapiName: 'garchomp',  atkNature: 'Jolly', atkSpSpread: { ...EMPTY_SPREAD },
      moveName: 'Growl',
    })
    expect(r.success).toBe(false)
    expect(r.failText).toMatch(/daño directo/)
  })

  it('nombre de movimiento inválido → rechazado', () => {
    const r = optimizeSurvive({
      defPokeapiName: 'charizard', defNature: 'Timid', defBaseHP: 78,
      atkPokeapiName: 'garchomp',  atkNature: 'Jolly', atkSpSpread: { ...EMPTY_SPREAD },
      moveName: 'MoveQueNoExiste',
    })
    expect(r.success).toBe(false)
  })
})
