import { describe, it, expect } from 'vitest'
import { optimizeSpeedTier, optimizeKO, optimizeSurvive } from '@/lib/sp-optimizer'

const ZERO = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }

// ── optimizeSpeedTier ─────────────────────────────────────────────────────────
// Matemática pura (no usa @smogon/calc). Todos los valores verificados a mano:
//   calcFinalStat('spe', base, sp, mod) = floor(floor((2*base+31+floor(spToEV(sp)/4))*50/100+5)*mod)
//   spToEV(0)=0, spToEV(1)=8, spToEV(32)=248
//   Jolly Garchomp base 102: 0 SP → 134, 1 SP → 135
//   Hardy base 60: 0 SP → 80 Spe (×2 TW = 160)
//   Hardy base 50: max 32 SP → 101 Spe

describe('optimizeSpeedTier', () => {
  it('ya supera al rival sin invertir SP', () => {
    // Jolly Garchomp 0 SP = 134 > 130
    const r = optimizeSpeedTier({ baseSpe: 102, nature: 'Jolly', rivalFinalSpe: 130 })
    expect(r.success).toBe(true)
    expect(r.totalSP).toBe(0)
    expect(r.remainingSP).toBe(66)
  })

  it('necesita exactamente 1 SP cuando empata al rival (0 SP no es suficiente)', () => {
    // Jolly Garchomp 0 SP = 134 (no > 134), 1 SP = 135 (> 134)
    const r = optimizeSpeedTier({ baseSpe: 102, nature: 'Jolly', rivalFinalSpe: 134 })
    expect(r.success).toBe(true)
    expect(r.totalSP).toBe(1)
    expect(r.spSpread.spe).toBe(1)
    expect(r.remainingSP).toBe(65)
  })

  it('Tailwind dobla la velocidad y permite superar al rival', () => {
    // Hardy base 60: 0 SP = 80 Spe, ×2 tailwind = 160 > 130
    const withTW    = optimizeSpeedTier({ baseSpe: 60, nature: 'Hardy', rivalFinalSpe: 130, myTailwind: true  })
    const withoutTW = optimizeSpeedTier({ baseSpe: 60, nature: 'Hardy', rivalFinalSpe: 130, myTailwind: false })
    expect(withTW.success).toBe(true)
    expect(withTW.spSpread.spe).toBe(0)
    expect(withoutTW.success).toBe(false)
  })

  it('imposible incluso con 32 SP → fallo con mensaje', () => {
    // Hardy base 50: max 32 SP = 101 Spe, no supera 200
    const r = optimizeSpeedTier({ baseSpe: 50, nature: 'Hardy', rivalFinalSpe: 200 })
    expect(r.success).toBe(false)
    expect(r.failText).toBeTruthy()
  })

  it('rival inalcanzable extremo', () => {
    const r = optimizeSpeedTier({ baseSpe: 1, nature: 'Hardy', rivalFinalSpe: 1000 })
    expect(r.success).toBe(false)
  })

  it('spread solo tiene Spe — todas las demás stats a 0', () => {
    const r = optimizeSpeedTier({ baseSpe: 102, nature: 'Jolly', rivalFinalSpe: 134 })
    expect(r.spSpread.hp).toBe(0)
    expect(r.spSpread.atk).toBe(0)
    expect(r.spSpread.def).toBe(0)
    expect(r.spSpread.spa).toBe(0)
    expect(r.spSpread.spd).toBe(0)
  })

  it('remainingSP = 66 - totalSP siempre', () => {
    const r = optimizeSpeedTier({ baseSpe: 102, nature: 'Jolly', rivalFinalSpe: 134 })
    expect(r.remainingSP).toBe(66 - r.totalSP)
  })
})

// ── optimizeKO ────────────────────────────────────────────────────────────────

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

  it('movimiento inválido → fallo con mensaje', () => {
    const r = optimizeKO({
      atkPokeapiName: 'garchomp', atkNature: 'Jolly',
      statToOptimize: 'atk', moveName: 'MovimientoInexistente999',
      defPokeapiName: 'charizard', defNature: 'Timid',
      koType: 'ohko',
    })
    expect(r.success).toBe(false)
    expect(r.failText).toBeTruthy()
  })

  it('Earthquake de Garchomp OHKO a Pikachu sin inversión', () => {
    // EQ STAB Ground + SE vs Electric/Normal Pikachu → OHKO garantizado a 0 SP
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

  it('Ice Beam STAB 4× OHKO a Garchomp desde 0 SpA (Lapras Modest)', () => {
    // Min daño verificado: 228 > 183 HP de Garchomp 0 SP → OHKO sin inversión
    const r = optimizeKO({
      atkPokeapiName: 'lapras', atkNature: 'Modest',
      statToOptimize: 'spa', moveName: 'Ice Beam',
      defPokeapiName: 'garchomp', defNature: 'Jolly',
      koType: 'ohko',
    })
    expect(r.success).toBe(true)
    expect(r.spSpread.spa).toBe(0)
    expect(r.totalSP).toBe(0)
  })

  it('Tackle de Caterpie no puede OHKO a Snorlax con ningún SP', () => {
    // Caterpie max Atk Tackle → ~18 dmg vs Snorlax 235 HP → imposible
    const r = optimizeKO({
      atkPokeapiName: 'caterpie', atkNature: 'Hardy',
      statToOptimize: 'atk', moveName: 'Tackle',
      defPokeapiName: 'snorlax', defNature: 'Sassy',
      koType: 'ohko',
    })
    expect(r.success).toBe(false)
    expect(r.failText).toBeTruthy()
  })

  it('spread solo tiene la stat ofensiva como inversión (HP/Def/SpD = 0)', () => {
    const r = optimizeKO({
      atkPokeapiName: 'lapras', atkNature: 'Modest',
      statToOptimize: 'spa', moveName: 'Ice Beam',
      defPokeapiName: 'garchomp', defNature: 'Jolly',
      koType: 'ohko',
    })
    expect(r.spSpread.hp).toBe(0)
    expect(r.spSpread.def).toBe(0)
    expect(r.spSpread.spd).toBe(0)
    expect(r.spSpread.spe).toBe(0)
  })

  it('remainingSP = 66 - totalSP siempre', () => {
    const r = optimizeKO({
      atkPokeapiName: 'garchomp', atkNature: 'Jolly',
      statToOptimize: 'atk', moveName: 'Earthquake',
      defPokeapiName: 'pikachu', defNature: 'Hardy',
      koType: 'ohko',
    })
    expect(r.remainingSP).toBe(66 - r.totalSP)
  })
})

// ── optimizeSurvive ───────────────────────────────────────────────────────────

describe('optimizeSurvive', () => {
  it('movimiento de estado (Growl) → rechazado como no dañino', () => {
    const r = optimizeSurvive({
      defPokeapiName: 'charizard', defNature: 'Timid', defBaseHP: 78,
      atkPokeapiName: 'garchomp',  atkNature: 'Jolly', atkSpSpread: { ...ZERO },
      moveName: 'Growl',
    })
    expect(r.success).toBe(false)
    expect(r.failText).toMatch(/daño directo/)
  })

  it('movimiento inválido → rechazado', () => {
    const r = optimizeSurvive({
      defPokeapiName: 'charizard', defNature: 'Timid', defBaseHP: 78,
      atkPokeapiName: 'garchomp',  atkNature: 'Jolly', atkSpSpread: { ...ZERO },
      moveName: 'MoveQueNoExiste',
    })
    expect(r.success).toBe(false)
  })

  it('ya sobrevive a 0 SP cuando el golpe es débil', () => {
    // Charizard vs Garchomp Jolly 0 Atk Dragon Claw: max dmg 100 < HP 153
    const r = optimizeSurvive({
      defPokeapiName: 'charizard', defNature: 'Timid', defBaseHP: 78,
      atkPokeapiName: 'garchomp',  atkNature: 'Jolly', atkSpSpread: { ...ZERO },
      moveName: 'Dragon Claw',
    })
    expect(r.success).toBe(true)
    expect(r.totalSP).toBe(0)
    expect(r.remainingSP).toBe(66)
  })

  it('Garchomp necesita SP para sobrevivir Ice Beam STAB de Lapras Modest', () => {
    // Min daño 228 > 183 HP (0 SP) → necesita inversión en HP y/o SpD
    const r = optimizeSurvive({
      defPokeapiName: 'garchomp', defNature: 'Jolly', defBaseHP: 108,
      atkPokeapiName: 'lapras',   atkNature: 'Modest', atkSpSpread: { ...ZERO },
      moveName: 'Ice Beam',
    })
    expect(r.success).toBe(true)
    expect(r.totalSP).toBeGreaterThan(0)
    expect(r.totalSP).toBeLessThanOrEqual(66)
  })

  it('spread defensivo solo usa HP, Def y SpD (sin Atk/SpA/Spe)', () => {
    const r = optimizeSurvive({
      defPokeapiName: 'garchomp', defNature: 'Jolly', defBaseHP: 108,
      atkPokeapiName: 'lapras',   atkNature: 'Modest', atkSpSpread: { ...ZERO },
      moveName: 'Ice Beam',
    })
    expect(r.spSpread.atk).toBe(0)
    expect(r.spSpread.spa).toBe(0)
    expect(r.spSpread.spe).toBe(0)
    const sum = r.spSpread.hp + r.spSpread.def + r.spSpread.spd
    expect(r.totalSP).toBe(sum)
  })

  it('remainingSP = 66 - totalSP siempre', () => {
    const r = optimizeSurvive({
      defPokeapiName: 'garchomp', defNature: 'Jolly', defBaseHP: 108,
      atkPokeapiName: 'lapras',   atkNature: 'Modest', atkSpSpread: { ...ZERO },
      moveName: 'Ice Beam',
    })
    expect(r.remainingSP).toBe(66 - r.totalSP)
  })
})
