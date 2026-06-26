import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const POKEAPI_NAMES = [
  // Kanto
  'venusaur','charizard','blastoise','beedrill','pidgeot',
  'arbok','pikachu','raichu','raichu-alola',
  'clefable','ninetales','ninetales-alola','vileplume',
  'arcanine','arcanine-hisui','alakazam','machamp','victreebel',
  'slowbro','slowbro-galar','gengar','kangaskhan','starmie',
  'pinsir','tauros','tauros-paldea-combat','tauros-paldea-blaze','tauros-paldea-aqua',
  'gyarados','ditto','vaporeon','jolteon','flareon',
  'aerodactyl','snorlax','dragonite',
  // Johto
  'meganium','typhlosion','typhlosion-hisui','feraligatr',
  'ariados','ampharos','azumarill','politoed',
  'espeon','umbreon','slowking','slowking-galar',
  'forretress','steelix','qwilfish','scizor',
  'heracross','skarmory','houndoom','tyranitar',
  // Hoenn
  'sceptile','blaziken','swampert','pelipper','gardevoir',
  'sableye','mawile','aggron','medicham','manectric',
  'sharpedo','camerupt','torkoal','altaria','milotic',
  'castform','banette','chimecho','absol','glalie','metagross',
  // Sinnoh
  'torterra','infernape','empoleon','staraptor','luxray',
  'roserade','rampardos','bastiodon','lopunny','spiritomb',
  'garchomp','lucario','hippowdon','toxicroak','abomasnow',
  'weavile','rhyperior','leafeon','glaceon','gliscor',
  'mamoswine','gallade','froslass','rotom',
  // Unova
  'serperior','emboar','samurott','samurott-hisui',
  'watchog','liepard','simisage','simisear','simipour',
  'musharna','excadrill','audino','conkeldurr','scolipede',
  'whimsicott','krookodile','scrafty','cofagrigus','garbodor',
  'zoroark','zoroark-hisui','reuniclus','vanilluxe','emolga',
  'eelektross','chandelure','beartic','stunfisk','stunfisk-galar',
  'golurk','hydreigon','volcarona',
  // Kalos
  'chesnaught','delphox','greninja','diggersby','talonflame',
  'vivillon','pyroar','floette-eternal','florges',
  'pangoro','furfrou','meowstic-male','meowstic-female',
  'aegislash-shield','aromatisse','slurpuff','malamar',
  'barbaracle','dragalge','clawitzer','heliolisk',
  'tyrantrum','aurorus','sylveon','hawlucha','dedenne',
  'goodra','goodra-hisui','klefki','trevenant',
  'gourgeist-average','avalugg','avalugg-hisui','noivern',
  // Alola
  'decidueye','decidueye-hisui','incineroar','primarina',
  'toucannon','crabominable','oranguru','passimian',
  'lycanroc-midday','lycanroc-midnight','lycanroc-dusk',
  'toxapex','mudsdale','araquanid','salazzle','tsareena',
  'mimikyu-disguised','drampa','kommo-o',
  // Galar / Hisui
  'corviknight','flapple','appletun','sandaconda',
  'polteageist','hatterene','grimmsnarl','mr-rime',
  'runerigus','alcremie','falinks','morpeko-full-belly',
  'dragapult','wyrdeer','kleavor',
  'basculegion-male','basculegion-female','sneasler','overqwil',
  // Paldea
  'meowscarada','skeledirge','quaquaval',
  'maushold-family-of-four','garganacl','armarouge','ceruledge',
  'bellibolt','scovillain','espathra','tinkaton',
  'palafin-zero','orthworm','glimmora','houndstone',
  'annihilape','farigiraf','kingambit','gholdengo',
  'sinistcha','archaludon','hydrapple',
]

async function main() {
  const result = {}
  let done = 0

  for (const name of POKEAPI_NAMES) {
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const get = (n) => data.stats.find(s => s.stat.name === n)?.base_stat ?? 100
      result[name] = {
        hp:  get('hp'),
        atk: get('attack'),
        def: get('defense'),
        spa: get('special-attack'),
        spd: get('special-defense'),
        spe: get('speed'),
      }
      done++
      process.stdout.write(`\r✓ ${done}/${POKEAPI_NAMES.length} — ${name}                    `)
    } catch (err) {
      console.error(`\n✗ Error: ${name} — ${err.message}`)
      result[name] = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 }
    }
  }

  const outPath = path.join(__dirname, '..', 'data', 'base-stats.json')
  await fs.writeFile(outPath, JSON.stringify(result, null, 2))
  console.log(`\n\nHecho — ${outPath}`)
}

main().catch(console.error)
