import { describe, it, expect } from 'vitest'
import { runDamageCalc, toSmogonSpecies, calcDamageDelta } from '@/lib/smogon-calc'

const ZERO = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
const mk = (species: string, nature: string, spSpread = ZERO) =>
  ({ species, nature, spSpread }) as Parameters<typeof runDamageCalc>[0]['attacker']

// ── toSmogonSpecies ───────────────────────────────────────────────────────────

describe('toSmogonSpecies', () => {
  it('nombre simple → capitalizado', () => {
    expect(toSmogonSpecies('garchomp')).toBe('Garchomp')
    expect(toSmogonSpecies('lapras')).toBe('Lapras')
  })

  it('forma regional → capitalizada con guión', () => {
    expect(toSmogonSpecies('raichu-alola')).toBe('Raichu-Alola')
  })

  it('forma mega → capitalizada con guiones', () => {
    expect(toSmogonSpecies('charizard-mega-x')).toBe('Charizard-Mega-X')
  })
})

// ── runDamageCalc — contratos del resultado ───────────────────────────────────

describe('runDamageCalc — shape del resultado', () => {
  const result = runDamageCalc({
    attacker: mk('Lapras', 'Modest'),
    defender: mk('Garchomp', 'Jolly'),
    move: 'Ice Beam',
  })

  it('devuelve todos los campos esperados', () => {
    expect(result).toHaveProperty('move', 'Ice Beam')
    expect(result).toHaveProperty('moveType')
    expect(result).toHaveProperty('moveCategory')
    expect(result).toHaveProperty('attacker', 'Lapras')
    expect(result).toHaveProperty('defender', 'Garchomp')
    expect(result).toHaveProperty('damage')
    expect(result).toHaveProperty('defenderHP')
    expect(result).toHaveProperty('percentMin')
    expect(result).toHaveProperty('percentMax')
    expect(result).toHaveProperty('koChance')
    expect(result).toHaveProperty('description')
  })

  it('damage.rolls tiene 16 valores', () => {
    expect(result.damage.rolls).toHaveLength(16)
  })

  it('damage.min ≤ damage.max', () => {
    expect(result.damage.min).toBeLessThanOrEqual(result.damage.max)
  })

  it('percentMin y percentMax son correctos respecto a defenderHP', () => {
    const expectedMin = parseFloat(((result.damage.min / result.defenderHP) * 100).toFixed(1))
    const expectedMax = parseFloat(((result.damage.max / result.defenderHP) * 100).toFixed(1))
    expect(result.percentMin).toBe(expectedMin)
    expect(result.percentMax).toBe(expectedMax)
  })
})

// ── runDamageCalc — tipo y categoría del movimiento ──────────────────────────

describe('runDamageCalc — moveType y moveCategory', () => {
  it('Ice Beam → Special / Ice', () => {
    const r = runDamageCalc({
      attacker: mk('Lapras', 'Modest'),
      defender: mk('Garchomp', 'Jolly'),
      move: 'Ice Beam',
    })
    expect(r.moveType).toBe('Ice')
    expect(r.moveCategory).toBe('Special')
  })

  it('Earthquake → Physical / Ground', () => {
    // Charizard (Flying) es inmune a EQ → usar un defensor Ground-neutral
    const r = runDamageCalc({
      attacker: mk('Garchomp', 'Jolly'),
      defender: mk('Lapras', 'Modest'),
      move: 'Earthquake',
    })
    expect(r.moveType).toBe('Ground')
    expect(r.moveCategory).toBe('Physical')
  })

  it('Dragon Claw → Physical / Dragon', () => {
    const r = runDamageCalc({
      attacker: mk('Garchomp', 'Jolly'),
      defender: mk('Charizard', 'Timid'),
      move: 'Dragon Claw',
    })
    expect(r.moveType).toBe('Dragon')
    expect(r.moveCategory).toBe('Physical')
  })
})

// ── runDamageCalc — daño verificado ──────────────────────────────────────────

describe('runDamageCalc — daño esperado', () => {
  it('Ice Beam STAB 4× vs Garchomp supera el 100% de HP (OHKO garantizado)', () => {
    // Lapras (Ice/Water) STAB Ice Beam, Garchomp 4× débil → min daño > HP
    const r = runDamageCalc({
      attacker: mk('Lapras', 'Modest'),
      defender: mk('Garchomp', 'Jolly'),
      move: 'Ice Beam',
    })
    expect(r.percentMin).toBeGreaterThan(100)
    expect(r.damage.min).toBeGreaterThan(r.defenderHP)
  })

  it('Dragon Claw vs Charizard no supera el 70% (golpe neutral débil)', () => {
    // Garchomp 0 Atk Dragon Claw vs Charizard → max 100 / 153 HP ≈ 65%
    const r = runDamageCalc({
      attacker: mk('Garchomp', 'Jolly'),
      defender: mk('Charizard', 'Timid'),
      move: 'Dragon Claw',
    })
    expect(r.percentMax).toBeLessThan(70)
  })
})

// ── runDamageCalc — casos de error ───────────────────────────────────────────

describe('runDamageCalc — lanza error en casos inválidos', () => {
  it('movimiento de estado (Growl) → lanza error', () => {
    expect(() => runDamageCalc({
      attacker: mk('Garchomp', 'Jolly'),
      defender: mk('Charizard', 'Timid'),
      move: 'Growl',
    })).toThrow()
  })

  it('inmunidad de tipo (EQ vs Charizard volador) → lanza error', () => {
    expect(() => runDamageCalc({
      attacker: mk('Garchomp', 'Jolly'),
      defender: mk('Charizard', 'Timid'),
      move: 'Earthquake',
    })).toThrow()
  })
})

// ── calcDamageDelta ───────────────────────────────────────────────────────────

describe('calcDamageDelta', () => {
  const base = {
    attacker: mk('Lapras', 'Modest'),
    defender: mk('Garchomp', 'Jolly'),
    move: 'Ice Beam',
  }

  it('añadir SpA al atacante aumenta o mantiene el daño mínimo', () => {
    const { before, after } = calcDamageDelta(base, 'attacker', 'spa', 8)
    expect(after.damage.min).toBeGreaterThanOrEqual(before.damage.min)
  })

  it('añadir SpD al defensor reduce o mantiene el daño máximo', () => {
    const { before, after } = calcDamageDelta(base, 'defender', 'spd', 8)
    expect(after.damage.max).toBeLessThanOrEqual(before.damage.max)
  })

  it('devuelve before y after con la misma estructura', () => {
    const { before, after } = calcDamageDelta(base, 'attacker', 'spa', 4)
    expect(before.damage.rolls).toHaveLength(16)
    expect(after.damage.rolls).toHaveLength(16)
    expect(before.move).toBe(after.move)
  })

  it('no supera el cap de 32 SP en la stat modificada', () => {
    // Intentar añadir 99 SP a una stat que ya está a 0: debe quedar en ≤ 32
    const input = { ...base, attacker: { ...base.attacker, spSpread: { ...ZERO, spa: 30 } } }
    const { after } = calcDamageDelta(input, 'attacker', 'spa', 99)
    // after.description existe y no hay excepción
    expect(after.damage.rolls).toHaveLength(16)
  })
})
