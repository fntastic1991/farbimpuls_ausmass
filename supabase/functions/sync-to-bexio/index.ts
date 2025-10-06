import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

// Bevorzugt aus Secret lesen; fällt sonst auf Platzhalter zurück (bitte Secret setzen)
const BEXIO_API_TOKEN = Deno.env.get('BEXIO_API_TOKEN') ?? 'REPLACE_ME_WITH_SECRET'
const BEXIO_BASE_URL = 'https://api.bexio.com/3.0'

// 🔧 Fallback-Steuer-IDs (werden nur verwendet falls API-Aufruf fehlschlägt)
const FALLBACK_TAX_ID = 383
const FALLBACK_TAX_ZERO_ID = 2

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
}

// Hilfsfunktion: String oder Zahl in Zahl umwandeln
function toNumber(value: any): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/\s/g, '').replace(',', '.')
    const num = Number(cleaned)
    return Number.isFinite(num) ? num : 0
  }
  return 0
}

// Einheit aus DB auf Bexio-kompatible unit_name mappen
function mapUnitName(dbUnit?: string): string {
  switch ((dbUnit || '').toLowerCase()) {
    case 'm2':
    case 'm²':
      return 'm2'
    case 'lfm':
      return 'm'
    case 'stk':
      return 'Stk'
    case 'pauschal':
      return 'Stk'
    default:
      return 'Stk'
  }
}

// Steuer-IDs aus Bexio laden (mit Fallback)
async function getValidTaxIds(): Promise<Map<number, number>> {
  const taxMap = new Map<number, number>()

  try {
    const response = await fetch(`${BEXIO_BASE_URL}/taxes`, {
      headers: {
        'Authorization': `Bearer ${BEXIO_API_TOKEN}`,
        'Accept': 'application/json',
      },
    })

    if (response.ok) {
      const taxes = await response.json()
      for (const tax of taxes) {
        const pct = parseFloat(tax.percentage ?? tax.value ?? 0)
        if (!isNaN(pct)) taxMap.set(Number(pct.toFixed(1)), tax.id)
      }
    }
  } catch (_) {}

  // Zusätzlich die v2-API versuchen – IDs können sich unterscheiden
  try {
    const responseV2 = await fetch(`${BEXIO_BASE_URL.replace('3.0','2.0')}/taxes`, {
      headers: {
        'Authorization': `Bearer ${BEXIO_API_TOKEN}`,
        'Accept': 'application/json',
      },
    })
    if (responseV2.ok) {
      const taxes2 = await responseV2.json()
      for (const tax of taxes2) {
        const pct = parseFloat(tax.percentage ?? tax.value ?? 0)
        if (!isNaN(pct) && !taxMap.has(Number(pct.toFixed(1)))) {
          taxMap.set(Number(pct.toFixed(1)), tax.id)
        }
      }
    }
  } catch (_) {}

  // Fallback falls nichts gefunden
  if (taxMap.size === 0) {
    taxMap.set(8.1, FALLBACK_TAX_ID)
    taxMap.set(0, FALLBACK_TAX_ZERO_ID)
  }

  return taxMap
}

// Steuer-ID bestimmen oder Fallback nehmen
function getTaxIdForRate(taxRate: number, validTaxMap: Map<number, number>): number {
  const rounded = Number(taxRate.toFixed(1))
  if (validTaxMap.has(rounded)) return validTaxMap.get(rounded)!
  const firstTaxId = Array.from(validTaxMap.values())[0]
  return firstTaxId ?? FALLBACK_TAX_ID
}

// Hauptfunktion
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 200, headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    const { projectId } = await req.json()
    if (!projectId)
      return new Response(JSON.stringify({ error: 'Projekt-ID fehlt' }), {
        status: 400,
        headers: corsHeaders,
      })

    // Projekt laden
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project)
      return new Response(JSON.stringify({ error: 'Projekt nicht gefunden' }), {
        status: 404,
        headers: corsHeaders,
      })

    // Räume laden
    const { data: rooms } = await supabase
      .from('rooms')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })

    // Kategorien-Einstellungen laden, nach Scope wenn vorhanden
    const scope = (project as any).scope as ('innen'|'aussen'|undefined)
    let catQuery = supabase.from('category_settings').select('*').eq('is_active', true)
    const { data: categorySettings } = scope ? await catQuery.eq('scope', scope as any) : await catQuery

    const settingsMap = new Map(
      (categorySettings || []).map((s) => [s.category, s])
    )

    const positions: any[] = []

    // Räume und Positionen zusammenbauen
    for (const room of rooms || []) {
      const { data: measurements } = await supabase
        .from('measurements')
        .select('*')
        .eq('room_id', room.id)
        .order('category', { ascending: true })

      if (!measurements?.length) continue

      // Raumtitel als reine Textposition (fett + unterstrichen via HTML)
      positions.push({
        type: 'text',
        text: `<strong><u>${room.name}</u></strong>`,
      })

      const grouped = measurements.reduce((acc: any, m: any) => {
        if (!acc[m.category]) acc[m.category] = []
        acc[m.category].push(m)
        return acc
      }, {})

      for (const [category, items] of Object.entries(grouped)) {
        const setting = settingsMap.get(category)

        for (const item of items) {
          // Titel und Fließtext ohne "Ausmass:"-Zeile
          const title = (setting?.offer_title || category).trim()

          const paragraphs: string[] = []
          if (setting?.offer_description?.trim()) paragraphs.push(setting.offer_description.trim())
          if (item.description?.trim()) paragraphs.push(item.description.trim())
          if (item.notes?.trim()) paragraphs.push(`Hinweis: ${item.notes.trim()}`)

          // Farbton/Applikationsart jeweils als eigene Zeile herauslösen
          const normalized: string[] = []
          const pushWithSplit = (p: string) => {
            const tokens = ['Farbton:', 'Applikationsart:']
            let rest = p
            for (const token of tokens) {
              const idx = rest.indexOf(token)
              if (idx > 0) {
                const before = rest.slice(0, idx).trim()
                if (before) normalized.push(before)
                rest = rest.slice(idx)
              }
              // falls mehrere Tokens vorkommen, in der nächsten Runde weiter splitten
            }
            if (rest) {
              // weitere Tokens hintereinander trennen
              const parts = rest
                .replace(/\s+/g, ' ')
                .split(/(?=Farbton:|Applikationsart:)/)
                .map(s => s.trim())
                .filter(Boolean)
              normalized.push(...parts)
            }
          }
          paragraphs.forEach(p => pushWithSplit(p))

          const titleMarkup = `<strong>${title}</strong>`
          if (normalized.length === 0) {
            positions.push({
              type: 'custom',
              text: titleMarkup,
              amount: item.quantity || 1,
              unit_price: setting?.unit_price || 0,
              unit_name: mapUnitName(item.unit),
              tax_rate: setting?.tax_rate || 8.1,
            })
            continue
          }

          const tokenStarts = ['Farbton:', 'Applikationsart:']
          const isToken = (s: string) => tokenStarts.some(t => s.startsWith(t))
          const textLines = normalized.filter(l => !isToken(l))
          const tokenLines = normalized.filter(l => isToken(l))

          const blocks: string[] = []
          if (textLines.length) blocks.push(textLines.join('<br/><br/>'))
          if (tokenLines.length) blocks.push(tokenLines.join('<br/>'))
          const body = blocks.join('<br/><br/>')
          const fullText = `${titleMarkup}<br/><br/>${body}`

          positions.push({
            type: 'custom',
            text: fullText.trim(),
            amount: item.quantity || 1,
            unit_price: setting?.unit_price || 0,
            unit_name: mapUnitName(item.unit),
            tax_rate: setting?.tax_rate || 8.1,
          })
        }
      }
    }

    // Kontakt ermitteln oder anlegen
    let contactId = null
    const search = await fetch(
      `${BEXIO_BASE_URL}/contact?search_term=${encodeURIComponent(project.customer_name)}`,
      { headers: { Authorization: `Bearer ${BEXIO_API_TOKEN}`, Accept: 'application/json' } }
    )

    if (search.status === 401) {
      return new Response(JSON.stringify({ error: 'Bexio: Unauthorized (Token ungültig/abgelaufen)' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    if (search.ok) {
      const contacts = await search.json()
      if (contacts?.length) contactId = contacts[0].id
    }

    if (!contactId) {
      const resp = await fetch(`${BEXIO_BASE_URL}/contact`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${BEXIO_API_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name_1: project.customer_name,
          address: project.address,
          contact_type_id: 1,
        }),
      })
      if (resp.status === 401) {
        return new Response(JSON.stringify({ error: 'Bexio: Unauthorized (Token ungültig/abgelaufen)' }), {
          status: 401,
          headers: corsHeaders,
        })
      }
      if (resp.ok) {
        const c = await resp.json()
        contactId = c.id
      }
    }

    // Offerte anlegen
    const quoteResponse = await fetch(`${BEXIO_BASE_URL}/kb_offer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${BEXIO_API_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title: `Ausmass - ${project.customer_name}`,
        contact_id: contactId,
        user_id: 1,
        is_valid_from: new Date().toISOString().split('T')[0],
      }),
    })

    if (quoteResponse.status === 401) {
      return new Response(JSON.stringify({ error: 'Bexio: Unauthorized (Token ungültig/abgelaufen)' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    if (!quoteResponse.ok) {
      const text = await quoteResponse.text()
      return new Response(JSON.stringify({ error: text }), {
        status: 500,
        headers: corsHeaders,
      })
    }

    const quote = await quoteResponse.json()

    const validTaxMap = await getValidTaxIds()
    let successCount = 0
    let failCount = 0
    const errors: any[] = []

    // Positionen übertragen (mit Fallback von v3 -> v2)
    for (const [i, pos] of positions.entries()) {
      let basePayload: any = {}

      if (pos.type === 'text') {
        basePayload = {
          kb_document_id: Number(quote.id),
          text: String(pos.text || ''),
        }
      } else {
        const amount = toNumber(pos.amount)
        const price = toNumber(pos.unit_price)
        const taxId = getTaxIdForRate(pos.tax_rate ?? 8.1, validTaxMap)

        basePayload = {
          kb_document_id: Number(quote.id),
          text: String(pos.text || ''),
          amount: Number(amount || 1),
          unit_price: Number(price || 0),
          unit_name: pos.unit_name || 'Stk',
          tax_id: Number(taxId),
          discount_in_percent: 0,
        }
      }

      // Candidate Endpoints: v3 Root, v3 Nested, v2 Nested
      type Candidate = { endpoint: string; payload: any }
      const candidates: Candidate[] = []
      if (pos.type === 'text') {
        // v3 root: mit kb_document_id
        candidates.push({ endpoint: `${BEXIO_BASE_URL}/kb_position_text`, payload: basePayload })
        // v3 nested: ohne kb_document_id
        candidates.push({ endpoint: `${BEXIO_BASE_URL}/kb_offer/${quote.id}/kb_position_text`, payload: { text: basePayload.text } })
        // v2 nested: ohne kb_document_id
        candidates.push({ endpoint: `${BEXIO_BASE_URL.replace('3.0','2.0')}/kb_offer/${quote.id}/kb_position_text`, payload: { text: basePayload.text } })
      } else {
        // Fallback-Reihenfolge: v2 nested -> v3 nested -> v3 root
        // v2 nested: KEIN unit_name, KEIN tax_id erlaubt → Server setzt Default
        candidates.push({ endpoint: `${BEXIO_BASE_URL.replace('3.0','2.0')}/kb_offer/${quote.id}/kb_position_custom`, payload: { text: basePayload.text, amount: basePayload.amount, unit_price: basePayload.unit_price, discount_in_percent: basePayload.discount_in_percent } })
        // v3 nested: ebenfalls ohne kb_document_id, häufig ohne unit_name/tax_id
        candidates.push({ endpoint: `${BEXIO_BASE_URL}/kb_offer/${quote.id}/kb_position_custom`, payload: { text: basePayload.text, amount: basePayload.amount, unit_price: basePayload.unit_price, discount_in_percent: basePayload.discount_in_percent } })
        candidates.push({ endpoint: `${BEXIO_BASE_URL}/kb_position_custom`, payload: basePayload })
      }

      let posted = false
      let lastErrText = ''
      let lastStatus = 0
      let lastEndpoint = ''

      for (const cand of candidates) {
        lastEndpoint = cand.endpoint
        // Payload ohne undefinierte Felder senden
        const cleanPayload = Object.fromEntries(Object.entries(cand.payload).filter(([_, v]) => v !== undefined))
        let res = await fetch(cand.endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${BEXIO_API_TOKEN}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(cleanPayload),
        })

        if (res.ok) {
          posted = true
          break
        }
        lastStatus = res.status
        lastErrText = await res.text()

        // Spezieller Retry, wenn nur tax_id nicht akzeptiert wird
        if (res.status === 422 && /tax_id/i.test(lastErrText)) {
          const candidateTaxIds: number[] = [
            ...(Array.from(validTaxMap.values())),
            FALLBACK_TAX_ID,
            FALLBACK_TAX_ZERO_ID,
            1, 2, 3, 0,
          ].filter((v, i, a) => a.indexOf(v) === i)

          for (const altTaxId of candidateTaxIds) {
            const retryPayload = { ...cleanPayload, tax_id: Number(altTaxId) }
            const retryRes = await fetch(cand.endpoint, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${BEXIO_API_TOKEN}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify(retryPayload),
            })
            if (retryRes.ok) {
              posted = true
              res = retryRes
              break
            }
            lastStatus = retryRes.status
            lastErrText = await retryRes.text()
            if (retryRes.status !== 422) break
          }

          // Letzter Versuch: ohne tax_id senden (Server default)
          if (!posted) {
            const { tax_id, ...withoutTax } = cleanPayload as any
            const retryNoTax = await fetch(cand.endpoint, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${BEXIO_API_TOKEN}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify(withoutTax),
            })
            if (retryNoTax.ok) {
              posted = true
            } else {
              lastStatus = retryNoTax.status
              lastErrText = await retryNoTax.text()
            }
          }
        }
        // Retry bei unit_name Problemen – versuche alternative Schreibweisen
        if (!posted && res.status === 422 && /unit_name/i.test(lastErrText) && (cleanPayload as any).unit_name) {
          const originals = String((cleanPayload as any).unit_name).toLowerCase()
          const altNames: string[] = originals === 'm2' ? ['m2', 'm²', 'qm']
            : originals === 'm' ? ['m', 'lfm']
            : ['Stk', 'stk']

          for (const alt of altNames) {
            const retryPayload = { ...cleanPayload, unit_name: alt }
            const retryRes = await fetch(cand.endpoint, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${BEXIO_API_TOKEN}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify(retryPayload),
            })
            if (retryRes.ok) {
              posted = true
              break
            }
            lastStatus = retryRes.status
            lastErrText = await retryRes.text()
          }
        }
        if (res.status !== 404 && res.status !== 405) {
          // harte Fehler nicht weiter probieren
          break
        }
      }

      if (posted) {
        successCount++
      } else {
        failCount++
        if (lastStatus === 401) {
          return new Response(JSON.stringify({
            error: 'Bexio: Unauthorized (Token ungültig/abgelaufen)',
            details: { index: i + 1, endpoint: lastEndpoint }
          }), { status: 401, headers: corsHeaders })
        }
        // Im Fehlerobjekt Payload-Auszug mitschicken (ohne lange Texte)
        errors.push({
          index: i + 1,
          endpoint: lastEndpoint,
          payload: (pos.type === 'text') ? { text: (basePayload as any).text } : {
            text: (basePayload as any).text?.slice(0, 120),
            amount: (basePayload as any).amount,
            unit_price: (basePayload as any).unit_price,
            unit_name: (basePayload as any).unit_name,
            tax_id: (basePayload as any).tax_id,
            tax_rate: pos.tax_rate
          },
          error: lastErrText,
          status: lastStatus
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Offerte erfolgreich zu Bexio übertragen',
        quoteId: quote.id,
        quoteNumber: quote.document_nr,
        successCount,
        failCount,
        positionsCount: positions.length,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? String(err) }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})


