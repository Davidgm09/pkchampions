import { describe, it, expect } from 'vitest'
import { spToEV, evToSP, calcFinalStat, getNatureMods } from '@/lib/sp-utils'

describe('spToEV', () => {
  it('0 SP → 0 EV', () => expect(spToEV(0)).toBe(0))
  it('32 SP → 248 EV', () => expect(spToEV(32)).toBe(248))
  it('66 SP → 512 EV', () => expect(spToEV(66)).toBe(512))
  it('round-trip: evToSP(spToEV(32)) === 32', () => expect(evToSP(spToEV(32))).toBe(32))
})

describe('calcFinalStat — HP (Garchomp base 108)', () => {
  // formula: floor((2*base + 31 + floor(ev/4)) * 50 / 100) + 60
  it('0 SP → 183', () => expect(calcFinalStat('hp', 108, 0,  1.0)).toBe(183))
  it('32 SP → 214', () => expect(calcFinalStat('hp', 108, 32, 1.0)).toBe(214))
})

describe('calcFinalStat — Spe (Garchomp base 102)', () => {
  // formula: floor((2*base + 31 + floor(ev/4)) * 50 / 100) + 5, then floor(raw * mod)
  it('0 SP, mod 1.0 → 122', () => expect(calcFinalStat('spe', 102, 0,  1.0)).toBe(122))
  it('0 SP, Jolly +10% → 134', () => expect(calcFinalStat('spe', 102, 0,  1.1)).toBe(134))
  it('32 SP, Jolly → 168',     () => expect(calcFinalStat('spe', 102, 32, 1.1)).toBe(168))
})

describe('getNatureMods', () => {
  it('Hardy — todo neutro', () => {
    const m = getNatureMods('Hardy')
    expect(m.atk).toBe(1); expect(m.def).toBe(1); expect(m.spe).toBe(1)
  })
  it('Timid — +Spe, −Atk', () => {
    const m = getNatureMods('Timid')
    expect(m.spe).toBe(1.1); expect(m.atk).toBe(0.9)
  })
  it('Adamant — +Atk, −SpA', () => {
    const m = getNatureMods('Adamant')
    expect(m.atk).toBe(1.1); expect(m.spa).toBe(0.9)
  })
  it('naturaleza desconocida → todo neutro', () => {
    const m = getNatureMods('BogusNature')
    expect(m.atk).toBe(1); expect(m.spe).toBe(1)
  })
})
